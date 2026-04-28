"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import {
  RACES, ALIGNMENTS, BACKGROUNDS, BACKGROUND_SKILLS, CLASSES,
  SKILLS, STANDARD_ARRAY, POINT_BUY_COSTS, abilityMod, modStr,
  profBonus, SRD_SPELLS, SPELL_SLOTS,
} from "@/lib/dnd/data";
import { createCharacter } from "@/app/dnd/characters/actions";
import {
  ChevronRight, ChevronLeft, Check, Loader2,
  Plus, Minus, X,
} from "lucide-react";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
type AbilityKey = (typeof ABILITY_KEYS)[number];
const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA",
};
const ABILITY_FULL: Record<AbilityKey, string> = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
};

const STEPS = ["Basic Info", "Ability Scores", "Skills", "Equipment & Spells", "Details"];

type ScoreMethod = "pointbuy" | "standard" | "manual";

interface WizardState {
  // Step 1
  name: string;
  race: string;
  class: string;
  subclass: string;
  background: string;
  alignment: string;
  level: number;
  // Step 2
  scoreMethod: ScoreMethod;
  baseScores: Record<AbilityKey, number>;
  standardAssignment: Record<AbilityKey, number | "">;
  // Step 3
  selectedSkills: Set<string>;
  // Step 4
  cantrips: string[];
  learnedSpells: Record<number, string[]>;
  equipment: Array<{ name: string; quantity: number }>;
  // Step 5
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  portrait_url: string;
}

const DEFAULT_STATE: WizardState = {
  name: "", race: "", class: "", subclass: "", background: "", alignment: "",
  level: 1,
  scoreMethod: "pointbuy",
  baseScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  standardAssignment: { str: "", dex: "", con: "", int: "", wis: "", cha: "" },
  selectedSkills: new Set(),
  cantrips: [], learnedSpells: {},
  equipment: [{ name: "", quantity: 1 }],
  personalityTraits: "", ideals: "", bonds: "", flaws: "", backstory: "",
  portrait_url: "",
};

function getRacialBonuses(raceName: string): Partial<Record<AbilityKey, number>> {
  const race = RACES.find((r) => r.value === raceName);
  if (!race) return {};
  const b = race.bonuses as Record<string, number>;
  const result: Partial<Record<AbilityKey, number>> = {};
  for (const k of ABILITY_KEYS) {
    if (b[k]) result[k] = b[k];
  }
  return result;
}

function getFinalScores(state: WizardState): Record<AbilityKey, number> {
  const bonuses = getRacialBonuses(state.race);
  const base: Record<AbilityKey, number> = { ...state.baseScores };

  if (state.scoreMethod === "standard") {
    for (const k of ABILITY_KEYS) {
      const v = state.standardAssignment[k];
      base[k] = v === "" ? 8 : (v as number);
    }
  }

  const final = {} as Record<AbilityKey, number>;
  for (const k of ABILITY_KEYS) {
    final[k] = base[k] + (bonuses[k] ?? 0);
  }
  return final;
}

function computeHP(className: string, level: number, conScore: number): number {
  const cls = CLASSES.find((c) => c.value === className);
  const hd = cls?.hitDie ?? 8;
  const conMod = abilityMod(conScore);
  return hd + conMod + (level - 1) * (Math.floor(hd / 2) + 1 + conMod);
}

export default function NewCharacterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const update = useCallback(
    <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
      setState((s) => ({ ...s, [key]: value })),
    []
  );

  // ---- Derived values ----
  const classData = CLASSES.find((c) => c.value === state.class);
  const finalScores = getFinalScores(state);
  const pb = profBonus(state.level);
  const pointsSpent = ABILITY_KEYS.reduce(
    (sum, k) => sum + (POINT_BUY_COSTS[state.baseScores[k]] ?? 0),
    0
  );
  const pointsLeft = 27 - pointsSpent;

  const bgSkills: string[] = state.background
    ? (BACKGROUND_SKILLS[state.background] ?? [])
    : [];

  const allSelectedSkills = new Set([...state.selectedSkills, ...bgSkills]);

  const classSavingThrows = new Set(classData?.savingThrows ?? []);

  // ---- Step validation ----
  const canProceed = [
    () => !!state.name && !!state.race && !!state.class && !!state.background && !!state.alignment,
    () => {
      if (state.scoreMethod === "standard") {
        const vals = Object.values(state.standardAssignment);
        const filled = vals.filter((v) => v !== "");
        return filled.length === 6 && new Set(filled).size === 6;
      }
      return true;
    },
    () => {
      const needed = classData?.skillCount ?? 0;
      return state.selectedSkills.size >= needed;
    },
    () => true,
    () => !!state.name,
  ];

  async function handleFinish() {
    setSaving(true);
    setSaveError("");
    const conScore = finalScores.con;
    const maxHp = computeHP(state.class, state.level, conScore);
    const dexMod = abilityMod(finalScores.dex);

    const skillsObj: Record<string, { proficient: boolean; expertise: boolean }> = {};
    for (const sk of SKILLS) {
      skillsObj[sk.name] = {
        proficient: allSelectedSkills.has(sk.name),
        expertise: false,
      };
    }

    const savingThrowsObj: Record<string, boolean> = {};
    for (const k of ABILITY_KEYS) {
      savingThrowsObj[k] = classSavingThrows.has(k);
    }

    const equipmentFinal = state.equipment
      .filter((e) => e.name.trim())
      .map((e) => ({ name: e.name.trim(), quantity: e.quantity }));

    const spellsData = {
      cantripsKnown: state.cantrips,
      spellsKnown: state.learnedSpells,
      slotsUsed: {},
    };

    const { error, id } = await createCharacter({
      name: state.name,
      race: state.race,
      class: state.class,
      subclass: state.subclass,
      background: state.background,
      alignment: state.alignment,
      level: state.level,
      strength: finalScores.str,
      dexterity: finalScores.dex,
      constitution: finalScores.con,
      intelligence: finalScores.int,
      wisdom: finalScores.wis,
      charisma: finalScores.cha,
      max_hp: maxHp,
      current_hp: maxHp,
      temp_hp: 0,
      armor_class: 10 + dexMod,
      speed: 30,
      initiative: dexMod,
      hit_dice: `${state.level}d${classData?.hitDie ?? 8}`,
      hit_dice_remaining: state.level,
      skills: skillsObj,
      saving_throws: savingThrowsObj,
      equipment: equipmentFinal,
      spells: spellsData,
      features: [],
      notes: state.backstory,
      portrait_url: state.portrait_url,
      personality_traits: state.personalityTraits,
      ideals: state.ideals,
      bonds: state.bonds,
      flaws: state.flaws,
      backstory: state.backstory,
    });

    setSaving(false);
    if (error) { setSaveError(error); return; }
    router.push(`/dnd/characters/${id}`);
  }

  // ---- Render ----
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,38,38,0.06) 0%, transparent 70%)" }} />
      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />
        <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
          {/* Progress steps */}
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all"
                  style={{
                    backgroundColor: i < step ? "rgba(16,185,129,0.2)" : i === step ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${i < step ? "rgba(16,185,129,0.5)" : i === step ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: i < step ? "#10b981" : i === step ? "#ef4444" : "var(--text-muted)",
                  }}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px" style={{ backgroundColor: i < step ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)" }} />
                )}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="font-cinzel text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {STEPS[step]}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          {/* ---- STEP 0: BASIC INFO ---- */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <Field label="Character Name" required>
                <Input value={state.name} onChange={(v) => update("name", v)} placeholder="Thorin Oakenshield" />
              </Field>

              <Field label="Race" required>
                <Select value={state.race} onChange={(v) => update("race", v)} placeholder="Choose a race">
                  {RACES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
                {state.race && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {RACES.find((r) => r.value === state.race)?.note ?? (() => {
                      const b = getRacialBonuses(state.race);
                      const parts = Object.entries(b).map(([k, v]) => `+${v} ${ABILITY_NAMES[k as AbilityKey]}`);
                      return parts.length ? `Racial bonuses: ${parts.join(", ")}` : "";
                    })()}
                  </p>
                )}
              </Field>

              <Field label="Class" required>
                <Select value={state.class} onChange={(v) => { update("class", v); update("subclass", ""); }} placeholder="Choose a class">
                  {CLASSES.map((c) => (
                    <option key={c.value} value={c.value}>{c.value} (d{c.hitDie})</option>
                  ))}
                </Select>
              </Field>

              {state.class && classData && classData.subclasses.length > 0 && (
                <Field label="Subclass" note="(optional at level 1)">
                  <Select value={state.subclass} onChange={(v) => update("subclass", v)} placeholder="Choose a subclass (optional)">
                    {classData.subclasses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              )}

              <Field label="Background" required>
                <Select value={state.background} onChange={(v) => update("background", v)} placeholder="Choose a background">
                  {BACKGROUNDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Select>
                {state.background && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Grants proficiency: {bgSkills.join(", ")}
                  </p>
                )}
              </Field>

              <Field label="Alignment" required>
                <Select value={state.alignment} onChange={(v) => update("alignment", v)} placeholder="Choose alignment">
                  {ALIGNMENTS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Level">
                <div className="flex items-center gap-3">
                  <button onClick={() => update("level", Math.max(1, state.level - 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                    <Minus size={14} />
                  </button>
                  <span className="font-mono font-bold text-xl w-8 text-center" style={{ color: "var(--text-primary)" }}>{state.level}</span>
                  <button onClick={() => update("level", Math.min(20, state.level + 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                    <Plus size={14} />
                  </button>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Proficiency Bonus: <span style={{ color: "var(--purple-light)" }}>+{profBonus(state.level)}</span>
                  </span>
                </div>
              </Field>
            </div>
          )}

          {/* ---- STEP 1: ABILITY SCORES ---- */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              {/* Method selector */}
              <div className="flex gap-2">
                {(["pointbuy", "standard", "manual"] as ScoreMethod[]).map((m) => (
                  <button key={m} onClick={() => update("scoreMethod", m)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize"
                    style={{
                      backgroundColor: state.scoreMethod === m ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${state.scoreMethod === m ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}`,
                      color: state.scoreMethod === m ? "var(--purple-light)" : "var(--text-muted)",
                    }}>
                    {m === "pointbuy" ? "Point Buy" : m === "standard" ? "Standard Array" : "Manual"}
                  </button>
                ))}
              </div>

              {state.scoreMethod === "pointbuy" && (
                <>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>Points remaining:</span>
                    <span className="font-mono font-bold text-lg" style={{ color: pointsLeft < 0 ? "var(--crimson-light)" : pointsLeft === 0 ? "#10b981" : "var(--gold)" }}>
                      {pointsLeft}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {ABILITY_KEYS.map((k) => {
                      const base = state.baseScores[k];
                      const racial = getRacialBonuses(state.race)[k] ?? 0;
                      const final = base + racial;
                      const canIncrease = base < 15 && POINT_BUY_COSTS[base + 1] !== undefined && pointsLeft >= (POINT_BUY_COSTS[base + 1] - POINT_BUY_COSTS[base]);
                      const canDecrease = base > 8;
                      return (
                        <div key={k} className="flex items-center gap-3 rounded-lg px-4 py-3"
                          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                          <div className="w-24">
                            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>{ABILITY_NAMES[k]}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ABILITY_FULL[k]}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <button disabled={!canDecrease} onClick={() => {
                              const nb = { ...state.baseScores, [k]: base - 1 };
                              update("baseScores", nb);
                            }} className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                              <Minus size={11} />
                            </button>
                            <span className="font-mono font-bold text-xl w-8 text-center" style={{ color: "var(--text-primary)" }}>{base}</span>
                            <button disabled={!canIncrease} onClick={() => {
                              const nb = { ...state.baseScores, [k]: base + 1 };
                              update("baseScores", nb);
                            }} className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                              <Plus size={11} />
                            </button>
                          </div>
                          {racial > 0 && (
                            <span className="text-xs font-medium w-10 text-center" style={{ color: "#10b981" }}>+{racial}</span>
                          )}
                          <div className="w-16 text-right">
                            <span className="font-mono font-bold text-xl" style={{ color: "var(--text-primary)" }}>{final}</span>
                            <span className="block text-xs font-mono" style={{ color: "var(--text-muted)" }}>{modStr(final)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Cost: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9 · Range: 8–15 (before racial bonuses)
                  </p>
                </>
              )}

              {state.scoreMethod === "standard" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Assign each value to one ability: <span className="font-mono font-bold" style={{ color: "var(--gold)" }}>15, 14, 13, 12, 10, 8</span>
                  </p>
                  {ABILITY_KEYS.map((k) => {
                    const racial = getRacialBonuses(state.race)[k] ?? 0;
                    const current = state.standardAssignment[k];
                    const final = (current === "" ? 8 : (current as number)) + racial;
                    const usedValues = Object.entries(state.standardAssignment)
                      .filter(([key, v]) => key !== k && v !== "")
                      .map(([, v]) => v);
                    return (
                      <div key={k} className="flex items-center gap-3 rounded-lg px-4 py-3"
                        style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${current !== "" ? "rgba(124,58,237,0.3)" : "var(--border-card)"}` }}>
                        <div className="w-24">
                          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>{ABILITY_NAMES[k]}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ABILITY_FULL[k]}</p>
                        </div>
                        <select value={current === "" ? "" : String(current)}
                          onChange={(e) => {
                            const newAssign = { ...state.standardAssignment, [k]: e.target.value === "" ? "" : parseInt(e.target.value) };
                            update("standardAssignment", newAssign);
                          }}
                          className="ml-auto rounded-md px-3 py-1.5 text-sm outline-none"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}>
                          <option value="">—</option>
                          {STANDARD_ARRAY.map((v) => (
                            <option key={v} value={v} disabled={usedValues.includes(v)}>{v}</option>
                          ))}
                        </select>
                        {racial > 0 && (
                          <span className="text-xs font-medium w-10 text-center" style={{ color: "#10b981" }}>+{racial}</span>
                        )}
                        <div className="w-16 text-right">
                          <span className="font-mono font-bold text-xl" style={{ color: current !== "" ? "var(--text-primary)" : "var(--text-muted)" }}>{final}</span>
                          <span className="block text-xs font-mono" style={{ color: "var(--text-muted)" }}>{modStr(final)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {state.scoreMethod === "manual" && (
                <div className="grid grid-cols-1 gap-3">
                  {ABILITY_KEYS.map((k) => {
                    const racial = getRacialBonuses(state.race)[k] ?? 0;
                    const base = state.baseScores[k];
                    const final = base + racial;
                    return (
                      <div key={k} className="flex items-center gap-3 rounded-lg px-4 py-3"
                        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
                        <div className="w-24">
                          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>{ABILITY_NAMES[k]}</p>
                        </div>
                        <input type="number" min={1} max={30} value={base}
                          onChange={(e) => {
                            const val = Math.min(30, Math.max(1, parseInt(e.target.value) || 1));
                            update("baseScores", { ...state.baseScores, [k]: val });
                          }}
                          className="ml-auto w-16 rounded-md px-3 py-1.5 text-sm font-mono text-center outline-none"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }} />
                        {racial > 0 && (
                          <span className="text-xs font-medium w-10 text-center" style={{ color: "#10b981" }}>+{racial}</span>
                        )}
                        <div className="w-16 text-right">
                          <span className="font-mono font-bold text-xl" style={{ color: "var(--text-primary)" }}>{final}</span>
                          <span className="block text-xs font-mono" style={{ color: "var(--text-muted)" }}>{modStr(final)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ---- STEP 2: SKILLS ---- */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="rounded-lg p-4 flex flex-col gap-1"
                style={{ backgroundColor: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--purple-light)" }}>
                  {state.class}: Choose {classData?.skillCount ?? 0} skill{(classData?.skillCount ?? 0) !== 1 ? "s" : ""} from class list
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Proficiency bonus: +{pb} · Background grants: {bgSkills.join(", ") || "—"}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Selected: {state.selectedSkills.size} / {classData?.skillCount ?? 0}
                </p>
              </div>

              {/* Saving Throws */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Saving Throw Proficiencies</p>
                <div className="flex gap-2 flex-wrap">
                  {ABILITY_KEYS.map((k) => (
                    <span key={k} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: classSavingThrows.has(k) ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${classSavingThrows.has(k) ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: classSavingThrows.has(k) ? "#ef4444" : "var(--text-muted)",
                      }}>
                      {ABILITY_NAMES[k]}
                      {classSavingThrows.has(k) && " ✓"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills list */}
              <div className="grid grid-cols-1 gap-2">
                {SKILLS.map((sk) => {
                  const isBackground = bgSkills.includes(sk.name);
                  const isSelected = state.selectedSkills.has(sk.name);
                  const isClassSkill = classData?.skillChoices.includes(sk.name) ?? false;
                  const atLimit = state.selectedSkills.size >= (classData?.skillCount ?? 0);
                  const canToggle = isClassSkill && !isBackground;

                  const abilScore = finalScores[sk.ability as AbilityKey];
                  const base = abilityMod(abilScore);
                  const total = base + (isSelected || isBackground ? pb : 0);

                  return (
                    <button key={sk.name}
                      disabled={!canToggle || (atLimit && !isSelected)}
                      onClick={() => {
                        if (!canToggle) return;
                        const ns = new Set(state.selectedSkills);
                        if (isSelected) ns.delete(sk.name); else if (!atLimit) ns.add(sk.name);
                        update("selectedSkills", ns);
                      }}
                      className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-left transition-all disabled:opacity-40"
                      style={{
                        backgroundColor: isBackground ? "rgba(217,119,6,0.08)" : isSelected ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isBackground ? "rgba(217,119,6,0.25)" : isSelected ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.07)"}`,
                        cursor: canToggle && !(atLimit && !isSelected) ? "pointer" : "default",
                      }}>
                      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isBackground ? "rgba(217,119,6,0.2)" : isSelected ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.06)",
                          border: `1px solid ${isBackground ? "rgba(217,119,6,0.4)" : isSelected ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.1)"}`,
                        }}>
                        {(isBackground || isSelected) && <Check size={11} style={{ color: isBackground ? "#d97706" : "#ef4444" }} />}
                      </div>
                      <span className="flex-1" style={{ color: isBackground || isSelected ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {sk.name}
                        {isBackground && <span className="text-xs ml-1.5" style={{ color: "#d97706" }}>(Background)</span>}
                        {isClassSkill && !isBackground && <span className="text-xs ml-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Class</span>}
                      </span>
                      <span className="text-xs uppercase tracking-wide w-8 text-center" style={{ color: "var(--text-muted)" }}>
                        {ABILITY_NAMES[sk.ability as AbilityKey]}
                      </span>
                      <span className="font-mono font-bold w-8 text-right" style={{ color: (isSelected || isBackground) ? "#10b981" : "var(--text-muted)" }}>
                        {total >= 0 ? `+${total}` : total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- STEP 3: EQUIPMENT & SPELLS ---- */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              {/* Equipment */}
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Starting Equipment</p>
                <div className="flex flex-col gap-2">
                  {state.equipment.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input value={item.name} onChange={(e) => {
                        const eq = [...state.equipment];
                        eq[idx] = { ...eq[idx], name: e.target.value };
                        update("equipment", eq);
                      }} placeholder="Item name" className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }} />
                      <input type="number" min={1} value={item.quantity} onChange={(e) => {
                        const eq = [...state.equipment];
                        eq[idx] = { ...eq[idx], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                        update("equipment", eq);
                      }} className="w-16 rounded-lg px-3 py-2 text-sm font-mono text-center outline-none"
                        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }} />
                      <button onClick={() => update("equipment", state.equipment.filter((_, i) => i !== idx))}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--crimson-light)" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => update("equipment", [...state.equipment, { name: "", quantity: 1 }])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", color: "var(--text-muted)" }}>
                    <Plus size={13} /> Add item
                  </button>
                </div>
              </div>

              {/* Spells — only for spellcasting classes */}
              {classData?.spellcasting && (() => {
                const spellList = SRD_SPELLS[state.class] ?? {};
                const cantripCount = (classData.cantripsKnown?.[state.level] ?? 0);
                const spellSlots = SPELL_SLOTS[state.class]?.[state.level] ?? [];
                const maxSpellLevel = spellSlots.length;

                return (
                  <div className="flex flex-col gap-4">
                    {cantripCount > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                          Cantrips ({state.cantrips.length}/{cantripCount})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(spellList[0] ?? []).map((spell) => {
                            const sel = state.cantrips.includes(spell);
                            const atMax = state.cantrips.length >= cantripCount;
                            return (
                              <button key={spell} disabled={atMax && !sel}
                                onClick={() => {
                                  if (sel) update("cantrips", state.cantrips.filter((s) => s !== spell));
                                  else if (!atMax) update("cantrips", [...state.cantrips, spell]);
                                }}
                                className="px-3 py-1 rounded-full text-xs font-medium transition-all disabled:opacity-40"
                                style={{
                                  backgroundColor: sel ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                                  border: `1px solid ${sel ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`,
                                  color: sel ? "var(--purple-light)" : "var(--text-muted)",
                                }}>
                                {spell}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {Array.from({ length: maxSpellLevel }, (_, i) => i + 1).map((lvl) => {
                      if (!spellList[lvl]?.length) return null;
                      const slots = spellSlots[lvl - 1] ?? 0;
                      if (slots === 0) return null;
                      const selected = state.learnedSpells[lvl] ?? [];
                      const spellsKnownLimit = classData.spellsKnown?.[state.level] ?? 99;
                      const totalKnown = Object.values(state.learnedSpells).flat().length;
                      return (
                        <div key={lvl}>
                          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                            Level {lvl} Spells{" "}
                            <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                              ({slots} slot{slots !== 1 ? "s" : ""})
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(spellList[lvl] ?? []).map((spell) => {
                              const sel = selected.includes(spell);
                              const atMax = totalKnown >= spellsKnownLimit && !sel;
                              return (
                                <button key={spell} disabled={atMax}
                                  onClick={() => {
                                    const cur = state.learnedSpells[lvl] ?? [];
                                    const ns = sel ? cur.filter((s) => s !== spell) : [...cur, spell];
                                    update("learnedSpells", { ...state.learnedSpells, [lvl]: ns });
                                  }}
                                  className="px-3 py-1 rounded-full text-xs font-medium transition-all disabled:opacity-40"
                                  style={{
                                    backgroundColor: sel ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${sel ? "rgba(14,165,233,0.4)" : "rgba(255,255,255,0.1)"}`,
                                    color: sel ? "#0ea5e9" : "var(--text-muted)",
                                  }}>
                                  {spell}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ---- STEP 4: DETAILS ---- */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              {/* Computed stats preview */}
              <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(220,38,38,0.2)" }}>
                {[
                  { label: "Max HP", value: computeHP(state.class, state.level, finalScores.con) },
                  { label: "AC", value: 10 + abilityMod(finalScores.dex) },
                  { label: "Initiative", value: modStr(finalScores.dex) },
                  { label: "Passive Perc.", value: 10 + abilityMod(finalScores.wis) + (allSelectedSkills.has("Perception") ? pb : 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="font-cinzel font-bold text-2xl" style={{ color: "var(--text-primary)" }}>{value}</p>
                  </div>
                ))}
              </div>

              <Field label="Personality Traits">
                <TextArea value={state.personalityTraits} onChange={(v) => update("personalityTraits", v)}
                  placeholder="Describe your character's personality..." rows={3} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Ideals">
                  <TextArea value={state.ideals} onChange={(v) => update("ideals", v)} placeholder="What do you believe in?" rows={3} />
                </Field>
                <Field label="Bonds">
                  <TextArea value={state.bonds} onChange={(v) => update("bonds", v)} placeholder="Who or what do you care about?" rows={3} />
                </Field>
                <Field label="Flaws">
                  <TextArea value={state.flaws} onChange={(v) => update("flaws", v)} placeholder="What are your weaknesses?" rows={3} />
                </Field>
              </div>
              <Field label="Backstory">
                <TextArea value={state.backstory} onChange={(v) => update("backstory", v)}
                  placeholder="Tell your character's story..." rows={6} />
              </Field>
              <Field label="Portrait URL" note="(optional)">
                <Input value={state.portrait_url} onChange={(v) => update("portrait_url", v)}
                  placeholder="https://example.com/portrait.jpg" />
              </Field>

              {saveError && (
                <p className="text-sm rounded-lg px-4 py-3"
                  style={{ backgroundColor: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "var(--crimson-light)" }}>
                  {saveError}
                </p>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button onClick={() => setStep((s) => s - 1)} disabled={step === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
              <ChevronLeft size={16} /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed[step]()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{
                  backgroundColor: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.45)",
                  color: "#ef4444", boxShadow: "0 0 18px rgba(220,38,38,0.12)",
                }}>
                {STEPS[step + 1]} <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving || !canProceed[step]()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{
                  backgroundColor: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.45)",
                  color: "#10b981", boxShadow: "0 0 18px rgba(16,185,129,0.12)",
                }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? "Creating..." : "Create Character"}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Small helper components
function Field({ label, required, note, children }: {
  label: string; required?: boolean; note?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {label}
        {required && <span style={{ color: "var(--crimson)" }}> *</span>}
        {note && <span className="text-xs font-normal ml-1.5" style={{ color: "var(--text-muted)" }}>{note}</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(220,38,38,0.5)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
  );
}

function Select({ value, onChange, placeholder, children }: {
  value: string; onChange: (v: string) => void; placeholder?: string; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: value ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer" }}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {children}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows ?? 3}
      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all resize-none"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(220,38,38,0.45)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
  );
}

