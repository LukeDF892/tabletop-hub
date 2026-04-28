"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import { updateCharacter, deleteCharacter } from "@/app/dnd/characters/actions";
import { SKILLS, abilityMod, modStr, profBonus } from "@/lib/dnd/data";
import {
  Heart, Shield, Zap, Move, Star, Minus, Plus, ChevronDown,
  ChevronUp, Loader2, Trash2, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

const ABILITY_LABELS: Record<AbilityKey, [string, string]> = {
  str: ["STR", "Strength"],
  dex: ["DEX", "Dexterity"],
  con: ["CON", "Constitution"],
  int: ["INT", "Intelligence"],
  wis: ["WIS", "Wisdom"],
  cha: ["CHA", "Charisma"],
};

const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhausted", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed",
  "Petrified", "Poisoned", "Prone", "Restrained", "Stunned",
];

type TabKey = "spells" | "equipment" | "features" | "notes";

interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  subclass: string | null;
  level: number;
  background: string;
  alignment: string;
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
  max_hp: number; current_hp: number; temp_hp: number;
  armor_class: number; speed: number; initiative: number;
  proficiency_bonus: number;
  hit_dice: string; hit_dice_remaining: number;
  death_saves_successes: number; death_saves_failures: number;
  inspiration: boolean;
  skills: Record<string, { proficient: boolean; expertise: boolean }>;
  saving_throws: Record<string, boolean>;
  equipment: Array<{ name: string; quantity: number; weight?: number }>;
  spells: {
    cantripsKnown: string[];
    spellsKnown: Record<number, string[]>;
    slotsUsed: Record<number, number>;
  };
  features: Array<{ name: string; source: string; description: string }>;
  notes: string | null;
  portrait_url: string | null;
}

function mapRow(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    name: row.name as string,
    race: (row.race as string) ?? "",
    class: (row.class as string) ?? "",
    subclass: row.subclass as string | null,
    level: (row.level as number) ?? 1,
    background: (row.background as string) ?? "",
    alignment: (row.alignment as string) ?? "",
    str: (row.strength as number) ?? 10,
    dex: (row.dexterity as number) ?? 10,
    con: (row.constitution as number) ?? 10,
    int: (row.intelligence as number) ?? 10,
    wis: (row.wisdom as number) ?? 10,
    cha: (row.charisma as number) ?? 10,
    max_hp: (row.max_hp as number) ?? 8,
    current_hp: (row.current_hp as number) ?? 8,
    temp_hp: (row.temp_hp as number) ?? 0,
    armor_class: (row.armor_class as number) ?? 10,
    speed: (row.speed as number) ?? 30,
    initiative: (row.initiative as number) ?? 0,
    proficiency_bonus: (row.proficiency_bonus as number) ?? 2,
    hit_dice: (row.hit_dice as string) ?? "1d8",
    hit_dice_remaining: (row.hit_dice_remaining as number) ?? 1,
    death_saves_successes: (row.death_saves_successes as number) ?? 0,
    death_saves_failures: (row.death_saves_failures as number) ?? 0,
    inspiration: (row.inspiration as boolean) ?? false,
    skills: (row.skills as Character["skills"]) ?? {},
    saving_throws: (row.saving_throws as Record<string, boolean>) ?? {},
    equipment: (row.equipment as Character["equipment"]) ?? [],
    spells: (row.spells as Character["spells"]) ?? { cantripsKnown: [], spellsKnown: {}, slotsUsed: {} },
    features: (row.features as Character["features"]) ?? [],
    notes: row.notes as string | null,
    portrait_url: row.portrait_url as string | null,
  };
}

export default function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [char, setChar] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("spells");
  const [spellsOpen, setSpellsOpen] = useState(true);
  const [conditionActive, setConditionActive] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("dnd_characters")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setChar(mapRow(data as Record<string, unknown>));
        setLoading(false);
      });
  }, [id]);

  const save = useCallback(
    (updates: Partial<Character>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const mapped: Record<string, unknown> = {};
        if (updates.current_hp !== undefined) mapped.current_hp = updates.current_hp;
        if (updates.temp_hp !== undefined) mapped.temp_hp = updates.temp_hp;
        if (updates.death_saves_successes !== undefined) mapped.death_saves_successes = updates.death_saves_successes;
        if (updates.death_saves_failures !== undefined) mapped.death_saves_failures = updates.death_saves_failures;
        if (updates.inspiration !== undefined) mapped.inspiration = updates.inspiration;
        if (updates.hit_dice_remaining !== undefined) mapped.hit_dice_remaining = updates.hit_dice_remaining;
        if (updates.skills !== undefined) mapped.skills = updates.skills;
        if (updates.spells !== undefined) mapped.spells = updates.spells;
        if (updates.equipment !== undefined) mapped.equipment = updates.equipment;
        if (updates.notes !== undefined) mapped.notes = updates.notes;
        if (Object.keys(mapped).length > 0) {
          await updateCharacter(id, mapped as never);
        }
      }, 500);
    },
    [id]
  );

  function patch(updates: Partial<Character>) {
    setChar((c) => (c ? { ...c, ...updates } : c));
    save(updates);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${char?.name}? This cannot be undone.`)) return;
    setDeleting(true);
    await deleteCharacter(id);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--purple-light)" }} />
        </div>
      </div>
    );
  }

  if (!char) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p style={{ color: "var(--crimson-light)" }}>Character not found.</p>
          <Link href="/dnd/characters" className="text-sm px-4 py-2 rounded-lg"
            style={{ backgroundColor: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--purple-light)" }}>
            Back to Characters
          </Link>
        </div>
      </div>
    );
  }

  const pb = char.proficiency_bonus || profBonus(char.level);

  function skillMod(skillName: string): number {
    const sk = SKILLS.find((s) => s.name === skillName);
    if (!sk) return 0;
    const abilScore = char[sk.ability as AbilityKey];
    const base = abilityMod(abilScore);
    const prof = char.skills[skillName];
    return base + (prof?.expertise ? pb * 2 : prof?.proficient ? pb : 0);
  }

  function saveMod(ability: AbilityKey): number {
    const base = abilityMod(char[ability]);
    return base + (char.saving_throws[ability] ? pb : 0);
  }

  const isDead = char.current_hp <= 0;
  const hpPct = Math.max(0, Math.min(1, char.current_hp / char.max_hp));

  const spellSlotsByLevel: Record<number, number> = {};
  const classSpellSlots: Record<string, number[][]> = {
    Wizard: [[],[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]],
  };
  "Cleric Druid Bard Sorcerer Paladin Ranger Warlock Artificer".split(" ").forEach(c => {
    classSpellSlots[c] = classSpellSlots.Wizard;
  });
  const slotTable = classSpellSlots[char.class]?.[char.level] ?? [];
  slotTable.forEach((count, i) => { if (count > 0) spellSlotsByLevel[i + 1] = count; });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,38,38,0.05) 0%, transparent 70%)" }} />
      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <Link href="/dnd/characters" className="mt-1 text-sm flex items-center gap-1 transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
              <ArrowLeft size={14} /> Back
            </Link>
            {char.portrait_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={char.portrait_url} alt={char.name}
                className="w-16 h-16 rounded-full object-cover shrink-0"
                style={{ border: "2px solid rgba(220,38,38,0.4)" }} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-cinzel font-bold text-2xl shrink-0"
                style={{ backgroundColor: "rgba(220,38,38,0.12)", border: "2px solid rgba(220,38,38,0.35)", color: "#ef4444" }}>
                {char.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-cinzel text-2xl md:text-3xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {char.name}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {char.race} · {char.class}{char.subclass ? ` (${char.subclass})` : ""} · Level {char.level}
                {char.background ? ` · ${char.background}` : ""}
                {char.alignment ? ` · ${char.alignment}` : ""}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Proficiency Bonus: <span style={{ color: "var(--purple-light)" }}>+{pb}</span>
                {" · "}
                <button onClick={() => patch({ inspiration: !char.inspiration })}
                  className="inline-flex items-center gap-1 transition-colors"
                  style={{ color: char.inspiration ? "#d97706" : "var(--text-muted)" }}>
                  <Star size={11} fill={char.inspiration ? "#d97706" : "none"} />
                  Inspiration
                </button>
              </p>
            </div>
            <button onClick={handleDelete} disabled={deleting}
              className="mt-1 p-2 rounded-lg transition-colors shrink-0"
              style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--crimson-light)" }}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ===== LEFT COLUMN ===== */}
            <div className="flex flex-col gap-4">
              {/* Ability Scores */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                <p className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Ability Scores</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["str","dex","con","int","wis","cha"] as AbilityKey[]).map((k) => {
                    const score = char[k];
                    const m = abilityMod(score);
                    return (
                      <div key={k} className="flex flex-col items-center rounded-lg py-3"
                        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
                          {ABILITY_LABELS[k][0]}
                        </span>
                        <span className="font-cinzel font-bold text-2xl leading-none" style={{ color: "var(--text-primary)" }}>{modStr(score)}</span>
                        <span className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Saving Throws */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                <p className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Saving Throws</p>
                <div className="flex flex-col gap-1.5">
                  {(["str","dex","con","int","wis","cha"] as AbilityKey[]).map((k) => {
                    const prof = char.saving_throws[k];
                    const total = saveMod(k);
                    return (
                      <div key={k} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: prof ? "#10b981" : "rgba(255,255,255,0.1)", border: `1px solid ${prof ? "#10b981" : "rgba(255,255,255,0.15)"}` }} />
                        <span className="text-sm flex-1" style={{ color: prof ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {ABILITY_LABELS[k][1]}
                        </span>
                        <span className="font-mono text-sm font-bold" style={{ color: prof ? "#10b981" : "var(--text-muted)" }}>
                          {total >= 0 ? `+${total}` : total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skills */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                <p className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Skills</p>
                <div className="flex flex-col gap-1">
                  {SKILLS.map((sk) => {
                    const prof = char.skills[sk.name];
                    const total = skillMod(sk.name);
                    const isProf = prof?.proficient;
                    const isExp = prof?.expertise;
                    return (
                      <div key={sk.name} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${isExp ? "ring-1 ring-offset-1" : ""}`}
                          style={{
                            backgroundColor: isProf ? (isExp ? "#d97706" : "#10b981") : "rgba(255,255,255,0.08)",
                            border: `1px solid ${isProf ? (isExp ? "#d97706" : "#10b981") : "rgba(255,255,255,0.12)"}`,
                            ringColor: "#d97706",
                          }} />
                        <span className="text-xs flex-1" style={{ color: isProf ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {sk.name}
                        </span>
                        <span className="text-xs uppercase tracking-wide w-7 text-right" style={{ color: "rgba(255,255,255,0.25)", fontSize: "9px" }}>
                          {sk.ability.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs font-bold w-7 text-right" style={{ color: isProf ? "#10b981" : "var(--text-muted)" }}>
                          {total >= 0 ? `+${total}` : total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Combat Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* HP */}
                <div className="col-span-2 sm:col-span-1 lg:col-span-2 rounded-xl p-4"
                  style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${isDead ? "rgba(220,38,38,0.5)" : "rgba(220,38,38,0.2)"}` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Heart size={13} style={{ color: isDead ? "#dc2626" : "#10b981" }} />
                    <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Hit Points</p>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => patch({ current_hp: Math.max(0, char.current_hp - 1) })}
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", color: "#dc2626" }}>
                      <Minus size={12} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="font-cinzel font-bold text-3xl" style={{ color: isDead ? "#dc2626" : "var(--text-primary)" }}>
                        {char.current_hp}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}> / {char.max_hp}</span>
                    </div>
                    <button onClick={() => patch({ current_hp: Math.min(char.max_hp, char.current_hp + 1) })}
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${hpPct * 100}%`, backgroundColor: hpPct > 0.5 ? "#10b981" : hpPct > 0.25 ? "#f59e0b" : "#dc2626" }} />
                  </div>
                  {/* Temp HP */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Temp:</span>
                    <button onClick={() => patch({ temp_hp: Math.max(0, char.temp_hp - 1) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-xs"
                      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                      <Minus size={10} />
                    </button>
                    <span className="font-mono text-sm font-bold" style={{ color: char.temp_hp > 0 ? "#0ea5e9" : "var(--text-muted)" }}>{char.temp_hp}</span>
                    <button onClick={() => patch({ temp_hp: char.temp_hp + 1 })}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                      <Plus size={10} />
                    </button>
                  </div>
                </div>

                {/* AC */}
                <StatBox icon={<Shield size={13} />} label="Armor Class" value={char.armor_class} />
                {/* Speed */}
                <StatBox icon={<Move size={13} />} label="Speed" value={`${char.speed}ft`} />
                {/* Initiative */}
                <StatBox icon={<Zap size={13} />} label="Initiative" value={modStr(abilityMod(char.dex) + (char.initiative - abilityMod(char.dex)))} />

                {/* Proficiency */}
                <div className="rounded-xl p-3 flex flex-col items-center justify-center gap-1"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)", fontSize: "9px" }}>Prof. Bonus</p>
                  <span className="font-cinzel font-bold text-2xl" style={{ color: "var(--purple-light)" }}>+{pb}</span>
                </div>
              </div>

              {/* Death Saves — shown when HP = 0 */}
              {isDead && (
                <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)" }}>
                  <p className="font-cinzel text-sm font-semibold mb-3" style={{ color: "var(--crimson-light)" }}>Death Saving Throws</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs mb-2" style={{ color: "#10b981" }}>Successes</p>
                      <div className="flex gap-2">
                        {[0,1,2].map((i) => (
                          <button key={i} onClick={() => {
                            const next = char.death_saves_successes === i + 1 ? i : i + 1;
                            patch({ death_saves_successes: next });
                          }} className="w-8 h-8 rounded-full transition-all"
                            style={{ backgroundColor: i < char.death_saves_successes ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)", border: `2px solid ${i < char.death_saves_successes ? "#10b981" : "rgba(255,255,255,0.1)"}` }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs mb-2" style={{ color: "#dc2626" }}>Failures</p>
                      <div className="flex gap-2">
                        {[0,1,2].map((i) => (
                          <button key={i} onClick={() => {
                            const next = char.death_saves_failures === i + 1 ? i : i + 1;
                            patch({ death_saves_failures: next });
                          }} className="w-8 h-8 rounded-full transition-all"
                            style={{ backgroundColor: i < char.death_saves_failures ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.06)", border: `2px solid ${i < char.death_saves_failures ? "#dc2626" : "rgba(255,255,255,0.1)"}` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hit Dice + Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                  <p className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Hit Dice</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => patch({ hit_dice_remaining: Math.max(0, char.hit_dice_remaining - 1) })}
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                      <Minus size={12} />
                    </button>
                    <div className="text-center">
                      <span className="font-mono font-bold text-xl" style={{ color: "var(--text-primary)" }}>{char.hit_dice_remaining}</span>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}> / {char.level}</span>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{char.hit_dice}</p>
                    </div>
                    <button onClick={() => patch({ hit_dice_remaining: Math.min(char.level, char.hit_dice_remaining + 1) })}
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                  <p className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONDITIONS.map((c) => {
                      const active = conditionActive.has(c);
                      return (
                        <button key={c} onClick={() => {
                          const ns = new Set(conditionActive);
                          active ? ns.delete(c) : ns.add(c);
                          setConditionActive(ns);
                        }} className="px-2 py-0.5 rounded-full text-xs transition-all"
                          style={{
                            backgroundColor: active ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${active ? "rgba(220,38,38,0.45)" : "rgba(255,255,255,0.08)"}`,
                            color: active ? "#ef4444" : "var(--text-muted)",
                          }}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Spell Slots */}
              {Object.keys(spellSlotsByLevel).length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                  <button className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => setSpellsOpen((o) => !o)}>
                    <p className="font-cinzel text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Spell Slots</p>
                    {spellsOpen ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
                  </button>
                  {spellsOpen && (
                    <div className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {Object.entries(spellSlotsByLevel).map(([lvlStr, max]) => {
                        const lvl = parseInt(lvlStr);
                        const used = char.spells?.slotsUsed?.[lvl] ?? 0;
                        return (
                          <div key={lvl} className="flex flex-col items-center gap-1.5 rounded-lg py-2 px-1"
                            style={{ backgroundColor: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
                            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)", fontSize: "9px" }}>
                              Level {lvl}
                            </span>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {Array.from({ length: max }, (_, i) => (
                                <button key={i} onClick={() => {
                                  const newUsed = i < used ? used - 1 : used + 1;
                                  const ns = { ...char.spells, slotsUsed: { ...char.spells?.slotsUsed, [lvl]: Math.max(0, Math.min(max, newUsed)) } };
                                  patch({ spells: ns });
                                }} className="w-5 h-5 rounded-full transition-all"
                                  style={{ backgroundColor: i < used ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.3)", border: `1px solid ${i < used ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.6)"}` }} />
                              ))}
                            </div>
                            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{max - used}/{max}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                {(["spells", "equipment", "features", "notes"] as TabKey[]).map((t) => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      backgroundColor: activeTab === t ? "rgba(124,58,237,0.2)" : "transparent",
                      border: `1px solid ${activeTab === t ? "rgba(124,58,237,0.4)" : "transparent"}`,
                      color: activeTab === t ? "var(--purple-light)" : "var(--text-muted)",
                    }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)", minHeight: "200px" }}>
                {activeTab === "spells" && (
                  <div className="flex flex-col gap-4">
                    {char.spells?.cantripsKnown?.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: "var(--text-muted)" }}>Cantrips</p>
                        <div className="flex flex-wrap gap-2">
                          {char.spells.cantripsKnown.map((spell) => (
                            <span key={spell} className="px-3 py-1 rounded-full text-xs"
                              style={{ backgroundColor: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "var(--purple-light)" }}>
                              {spell}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {Object.entries(char.spells?.spellsKnown ?? {}).map(([lvlStr, spellNames]) => {
                      const lvl = parseInt(lvlStr);
                      if (!spellNames?.length) return null;
                      return (
                        <div key={lvl}>
                          <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: "var(--text-muted)" }}>Level {lvl}</p>
                          <div className="flex flex-wrap gap-2">
                            {spellNames.map((spell) => (
                              <span key={spell} className="px-3 py-1 rounded-full text-xs"
                                style={{ backgroundColor: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", color: "#0ea5e9" }}>
                                {spell}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {!char.spells?.cantripsKnown?.length && !Object.values(char.spells?.spellsKnown ?? {}).some(a => a?.length) && (
                      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>No spells recorded.</p>
                    )}
                  </div>
                )}

                {activeTab === "equipment" && (
                  <div className="flex flex-col gap-2">
                    {char.equipment?.length === 0 ? (
                      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>No equipment recorded.</p>
                    ) : (
                      <>
                        {char.equipment.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
                              ×{item.quantity}
                            </span>
                            <button onClick={() => {
                              const eq = char.equipment.filter((_, i) => i !== idx);
                              patch({ equipment: eq });
                            }} className="text-xs transition-colors" style={{ color: "var(--text-muted)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--crimson-light)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                              <Minus size={12} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "features" && (
                  <div className="flex flex-col gap-3">
                    {char.features?.length === 0 ? (
                      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>No features recorded.</p>
                    ) : (
                      char.features.map((f, i) => (
                        <div key={i} className="rounded-lg p-3"
                          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.name}</p>
                            {f.source && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{f.source}</span>}
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "notes" && (
                  <textarea value={char.notes ?? ""}
                    onChange={(e) => patch({ notes: e.target.value })}
                    placeholder="Notes, backstory, journal entries..."
                    rows={10}
                    className="w-full rounded-lg text-sm outline-none resize-none bg-transparent"
                    style={{ color: "var(--text-primary)", border: "none" }} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl p-3 flex flex-col items-center gap-1 justify-center"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
      <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>{icon}</div>
      <span className="font-cinzel font-bold text-2xl" style={{ color: "var(--text-primary)" }}>{value}</span>
      <span className="text-xs uppercase tracking-wider text-center" style={{ color: "var(--text-muted)", fontSize: "9px" }}>{label}</span>
    </div>
  );
}
