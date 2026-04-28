"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CharacterFormData {
  name: string;
  race: string;
  class: string;
  subclass: string;
  background: string;
  alignment: string;
  level: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  max_hp: number;
  current_hp: number;
  temp_hp: number;
  armor_class: number;
  speed: number;
  initiative: number;
  hit_dice: string;
  hit_dice_remaining: number;
  skills: Record<string, { proficient: boolean; expertise: boolean }>;
  saving_throws: Record<string, boolean>;
  equipment: Array<{ name: string; quantity: number; weight?: number; description?: string }>;
  spells: {
    cantripsKnown: string[];
    spellsKnown: Record<number, string[]>;
    slotsUsed: Record<number, number>;
  };
  features: Array<{ name: string; source: string; description: string }>;
  notes: string;
  portrait_url: string;
  personality_traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
}

export async function createCharacter(
  data: CharacterFormData
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profBonus = Math.ceil(1 + data.level / 4);

  const { data: created, error } = await supabase
    .from("dnd_characters")
    .insert({
      user_id: user.id,
      name: data.name,
      race: data.race,
      class: data.class,
      subclass: data.subclass || null,
      background: data.background,
      alignment: data.alignment,
      level: data.level,
      strength: data.strength,
      dexterity: data.dexterity,
      constitution: data.constitution,
      intelligence: data.intelligence,
      wisdom: data.wisdom,
      charisma: data.charisma,
      max_hp: data.max_hp,
      current_hp: data.max_hp,
      temp_hp: 0,
      armor_class: data.armor_class,
      speed: data.speed,
      initiative: data.initiative,
      hit_dice: data.hit_dice,
      hit_dice_remaining: data.hit_dice_remaining,
      proficiency_bonus: profBonus,
      skills: data.skills,
      saving_throws: data.saving_throws,
      equipment: data.equipment,
      spells: data.spells,
      features: data.features,
      notes: data.notes,
      portrait_url: data.portrait_url || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dnd/characters");
  return { id: created.id };
}

export async function updateCharacter(
  id: string,
  updates: Partial<CharacterFormData>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("dnd_characters")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dnd/characters/${id}`);
  return {};
}

export async function deleteCharacter(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("dnd_characters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dnd/characters");
  redirect("/dnd/characters");
}

export async function importFromDndBeyond(url: string): Promise<{
  error?: string;
  character?: Partial<CharacterFormData>;
  preview?: {
    name: string;
    race: string;
    class: string;
    level: number;
    hp: number;
  };
}> {
  const match = url.match(/dndbeyond\.com\/characters\/(\d+)/);
  if (!match) return { error: "Invalid D&D Beyond URL" };

  const characterId = match[1];

  let json: Record<string, unknown>;
  try {
    const resp = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TabletopHub/1.0",
        },
        next: { revalidate: 0 },
      }
    );

    if (resp.status === 403 || resp.status === 401) {
      return {
        error:
          "This character is private. Ask the owner to make it public in D&D Beyond settings.",
      };
    }
    if (!resp.ok) {
      return { error: `D&D Beyond returned an error (${resp.status}).` };
    }

    const body = await resp.json();
    json = body.data as Record<string, unknown>;
  } catch {
    return { error: "Failed to reach D&D Beyond. Check the URL and try again." };
  }

  const name = (json.name as string) ?? "Unnamed";
  const race =
    ((json.race as Record<string, unknown>)?.fullName as string) ?? "";
  const classes = (json.classes as Array<Record<string, unknown>>) ?? [];
  const className =
    classes.length > 0
      ? ((classes[0].definition as Record<string, unknown>)?.name as string) ??
        ""
      : "";
  const subclassName =
    classes.length > 0
      ? ((classes[0].subclassDefinition as Record<string, unknown>)
          ?.name as string) ?? ""
      : "";
  const level =
    classes.reduce(
      (sum: number, c: Record<string, unknown>) =>
        sum + ((c.level as number) ?? 0),
      0
    ) || 1;

  const statsArr = (json.stats as Array<Record<string, unknown>>) ?? [];
  const getStatValue = (id: number) => {
    const s = statsArr.find((st) => st.id === id);
    return (s?.value as number) ?? 10;
  };
  const str = getStatValue(1);
  const dex = getStatValue(2);
  const con = getStatValue(3);
  const int = getStatValue(4);
  const wis = getStatValue(5);
  const cha = getStatValue(6);

  const overrideHp =
    (json.overrideHitPoints as number) ||
    (json.baseHitPoints as number) ||
    (json.removedHitPoints !== undefined
      ? 0
      : undefined);

  const conMod = Math.floor((con - 10) / 2);
  const hitDiceMap: Record<string, number> = {
    Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
    Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8,
    Warlock: 8, Artificer: 8, Sorcerer: 6, Wizard: 6,
  };
  const hitDie = hitDiceMap[className] ?? 8;
  const calculatedHp = hitDie + conMod + (level - 1) * (Math.floor(hitDie / 2) + 1 + conMod);
  const maxHp = overrideHp ?? calculatedHp;

  return {
    preview: { name, race, class: className, level, hp: maxHp },
    character: {
      name,
      race,
      class: className,
      subclass: subclassName,
      level,
      strength: str,
      dexterity: dex,
      constitution: con,
      intelligence: int,
      wisdom: wis,
      charisma: cha,
      max_hp: maxHp,
      current_hp: maxHp,
      speed: 30,
      armor_class: 10 + Math.floor((dex - 10) / 2),
      initiative: Math.floor((dex - 10) / 2),
      hit_dice: `${level}d${hitDie}`,
      hit_dice_remaining: level,
      dnd_beyond_url: url,
    } as Partial<CharacterFormData>,
  };
}

export async function saveImportedCharacter(
  data: Partial<CharacterFormData> & { dnd_beyond_url?: string }
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: created, error } = await supabase
    .from("dnd_characters")
    .insert({
      user_id: user.id,
      name: data.name ?? "Imported Character",
      race: data.race ?? "",
      class: data.class ?? "",
      subclass: data.subclass ?? null,
      level: data.level ?? 1,
      strength: data.strength ?? 10,
      dexterity: data.dexterity ?? 10,
      constitution: data.constitution ?? 10,
      intelligence: data.intelligence ?? 10,
      wisdom: data.wisdom ?? 10,
      charisma: data.charisma ?? 10,
      max_hp: data.max_hp ?? 8,
      current_hp: data.max_hp ?? 8,
      temp_hp: 0,
      armor_class: data.armor_class ?? 10,
      speed: data.speed ?? 30,
      initiative: data.initiative ?? 0,
      hit_dice: data.hit_dice ?? "1d8",
      hit_dice_remaining: data.hit_dice_remaining ?? 1,
      proficiency_bonus: Math.ceil(1 + (data.level ?? 1) / 4),
      skills: {},
      saving_throws: {},
      equipment: [],
      spells: { cantripsKnown: [], spellsKnown: {}, slotsUsed: {} },
      features: [],
      notes: "",
      dnd_beyond_url: data.dnd_beyond_url ?? null,
      imported_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dnd/characters");
  return { id: created.id };
}
