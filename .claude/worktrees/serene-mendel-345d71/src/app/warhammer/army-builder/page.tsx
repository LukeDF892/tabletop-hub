"use client";

import { useState, useMemo } from "react";
import Navigation from "@/components/Navigation";
import type { Unit, Faction, Detachment } from "@/lib/wh40k/types";
import { SPACE_MARINES_FACTION } from "@/lib/wh40k/space-marines";
import { DARK_ANGELS_FACTION } from "@/lib/wh40k/dark-angels";
import { TYRANIDS_FACTION } from "@/lib/wh40k/tyranids";
import { NECRONS_FACTION } from "@/lib/wh40k/necrons";
import {
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Shield,
  Crosshair,
  Swords,
  Zap,
  Info,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FACTIONS: (Faction & { icon: string; subfactionOf?: string })[] = [
  {
    ...SPACE_MARINES_FACTION,
    icon: "🛡️",
  },
  {
    ...DARK_ANGELS_FACTION,
    icon: "⚔️",
    subfactionOf: "Space Marines",
  },
  {
    ...TYRANIDS_FACTION,
    icon: "🦷",
  },
  {
    ...NECRONS_FACTION,
    icon: "💀",
  },
];

const GAME_SIZES = [
  { label: "Combat Patrol", points: 500, duration: "~45 min" },
  { label: "Incursion", points: 1000, duration: "~1.5 hr" },
  { label: "Strike Force", points: 2000, duration: "~3 hr" },
  { label: "Onslaught", points: 3000, duration: "~5 hr+" },
];

const CATEGORIES = ["HQ", "Battleline", "Elites", "Fast Attack", "Heavy Support", "Lord of War"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArmyEntry {
  unit: Unit;
  modelCount: number;
  quantity: number; // number of this unit slot added
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center min-w-[40px]">
      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

function UnitModal({
  unit,
  accentColor,
  onClose,
}: {
  unit: Unit;
  accentColor: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: `1px solid ${accentColor}40`,
          boxShadow: `0 0 40px ${accentColor}20`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg"
          style={{ color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              {unit.category}
            </span>
            {unit.isEpicHero && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#eab308" }}
              >
                Epic Hero
              </span>
            )}
          </div>
          <h2
            className="font-cinzel text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {unit.name}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {unit.models.min === unit.models.max
              ? `${unit.models.min} model`
              : `${unit.models.min}–${unit.models.max} models`}{" "}
            · {unit.points} pts
          </p>
        </div>

        {/* Stats */}
        <div
          className="flex gap-4 flex-wrap rounded-lg p-3 mb-4"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}
        >
          <StatBadge label="M" value={unit.stats.movement} />
          <StatBadge label="T" value={unit.stats.toughness} />
          <StatBadge label="Sv" value={unit.stats.save} />
          <StatBadge label="W" value={unit.stats.wounds} />
          <StatBadge label="Ld" value={unit.stats.leadership} />
          <StatBadge label="OC" value={unit.stats.oc} />
        </div>

        {/* Weapons */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
            Weapons
          </h3>
          <div className="space-y-1">
            {unit.weapons.map((w, i) => (
              <div
                key={i}
                className="text-xs grid gap-x-2 rounded px-2 py-1.5"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  gridTemplateColumns: "1fr auto auto auto auto auto auto",
                }}
              >
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{w.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{w.range ?? "—"}</span>
                <span style={{ color: "var(--text-muted)" }}>A{w.attacks}</span>
                <span style={{ color: "var(--text-muted)" }}>{w.skill}</span>
                <span style={{ color: "var(--text-muted)" }}>S{w.strength}</span>
                <span style={{ color: "var(--text-muted)" }}>AP{w.ap}</span>
                <span style={{ color: "var(--text-muted)" }}>D{w.damage}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Abilities */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
            Abilities
          </h3>
          <div className="space-y-2">
            {unit.abilities.map((a, i) => (
              <div key={i}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {a.name}:{" "}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {a.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wargear Options */}
        {unit.wargearOptions && unit.wargearOptions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
              Wargear Options
            </h3>
            <ul className="space-y-1">
              {unit.wargearOptions.map((o, i) => (
                <li key={i} className="text-xs flex gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: accentColor }}>•</span>
                  {o.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Keywords */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
            Keywords
          </h3>
          <div className="flex flex-wrap gap-1">
            {[...unit.keywords, ...unit.factionKeywords].map((k) => (
              <span
                key={k}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-muted)",
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArmyBuilderPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [gameSize, setGameSize] = useState<(typeof GAME_SIZES)[number] | null>(null);
  const [faction, setFaction] = useState<Faction | null>(null);
  const [detachment, setDetachment] = useState<Detachment | null>(null);
  const [army, setArmy] = useState<ArmyEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("HQ");
  const [unitModal, setUnitModal] = useState<Unit | null>(null);
  const [stratagemExpanded, setStratagemExpanded] = useState(false);

  const accentColor = useMemo(() => {
    if (!faction) return "#d97706";
    return FACTIONS.find((f) => f.id === faction.id)?.accentColor ?? "#d97706";
  }, [faction]);

  const totalPts = useMemo(
    () => army.reduce((sum, e) => sum + e.unit.points * e.quantity, 0),
    [army]
  );

  const pointsLimit = gameSize?.points ?? 2000;
  const ptsPercent = Math.min((totalPts / pointsLimit) * 100, 100);
  const ptsColor =
    totalPts > pointsLimit ? "#ef4444" : totalPts > pointsLimit * 0.9 ? "#f59e0b" : accentColor;

  function addUnit(unit: Unit) {
    setArmy((prev) => {
      const existing = prev.find((e) => e.unit.id === unit.id);
      if (existing) {
        return prev.map((e) =>
          e.unit.id === unit.id ? { ...e, quantity: e.quantity + 1 } : e
        );
      }
      return [...prev, { unit, modelCount: unit.models.min, quantity: 1 }];
    });
  }

  function removeUnit(unitId: string) {
    setArmy((prev) => {
      const existing = prev.find((e) => e.unit.id === unitId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map((e) =>
          e.unit.id === unitId ? { ...e, quantity: e.quantity - 1 } : e
        );
      }
      return prev.filter((e) => e.unit.id !== unitId);
    });
  }

  function changeModelCount(unitId: string, delta: number) {
    setArmy((prev) =>
      prev.map((e) => {
        if (e.unit.id !== unitId) return e;
        const next = Math.max(e.unit.models.min, Math.min(e.unit.models.max, e.modelCount + delta));
        return { ...e, modelCount: next };
      })
    );
  }

  const visibleUnits = useMemo(() => {
    if (!faction) return [];
    return faction.units.filter((u) => u.category === activeCategory);
  }, [faction, activeCategory]);

  // ─── Step 1: Game Size ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,119,6,0.07) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex flex-col flex-1">
          <Navigation />
          <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-14 pb-20">
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "#d97706" }}>
              Step 1 of 4
            </p>
            <h1 className="font-cinzel text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Choose Game Size
            </h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
              Select the points limit and format for your army.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {GAME_SIZES.map((gs) => (
                <button
                  key={gs.label}
                  onClick={() => {
                    setGameSize(gs);
                    setStep(2);
                  }}
                  className="group rounded-xl p-6 text-left transition-all duration-200"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid rgba(217,119,6,0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#d97706";
                    e.currentTarget.style.boxShadow = "0 0 20px rgba(217,119,6,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(217,119,6,0.25)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div className="text-4xl font-cinzel font-bold mb-1" style={{ color: "#d97706" }}>
                    {gs.points}
                    <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>
                      pts
                    </span>
                  </div>
                  <div className="font-cinzel text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    {gs.label}
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {gs.duration}
                  </div>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ─── Step 2: Faction ────────────────────────────────────────────────────────
  if (step === 2) {
    const COMING_SOON_COUNT = 8;
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,119,6,0.07) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex flex-col flex-1">
          <Navigation />
          <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-14 pb-20">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep(1)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                ← Back
              </button>
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#d97706" }}>
                Step 2 of 4 · {gameSize?.label} ({gameSize?.points}pts)
              </span>
            </div>
            <h1 className="font-cinzel text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Choose Faction
            </h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
              Select your army&apos;s allegiance.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {FACTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFaction(f);
                    setStep(3);
                  }}
                  className="group rounded-xl p-4 text-left transition-all"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: `1px solid ${f.accentColor}30`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = f.accentColor;
                    e.currentTarget.style.boxShadow = `0 0 20px ${f.accentColor}25`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${f.accentColor}30`;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <div className="font-cinzel font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                    {f.name}
                  </div>
                  {f.subfactionOf && (
                    <div className="text-[10px]" style={{ color: f.accentColor }}>
                      Subfaction of {f.subfactionOf}
                    </div>
                  )}
                  <div
                    className="mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                    style={{ backgroundColor: `${f.accentColor}18`, color: f.accentColor }}
                  >
                    {f.units.length} units
                  </div>
                </button>
              ))}
              {Array.from({ length: COMING_SOON_COUNT }).map((_, i) => (
                <div
                  key={`cs-${i}`}
                  className="rounded-xl p-4 opacity-40"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="text-2xl mb-3 grayscale">⚡</div>
                  <div className="text-sm font-cinzel font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                    Coming Soon
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    More factions arriving
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ─── Step 3: Detachment ─────────────────────────────────────────────────────
  if (step === 3 && faction) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${accentColor}10 0%, transparent 70%)` }}
        />
        <div className="relative z-10 flex flex-col flex-1">
          <Navigation />
          <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-14 pb-20">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep(2)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                ← Back
              </button>
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: accentColor }}>
                Step 3 of 4 · {faction.name}
              </span>
            </div>
            <h1 className="font-cinzel text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Choose Detachment
            </h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
              Each detachment grants a unique rule, stratagems, and enhancements.
            </p>
            <div className="space-y-5">
              {faction.detachments.map((d) => (
                <button
                  key={d.name}
                  onClick={() => {
                    setDetachment(d);
                    setStep(4);
                  }}
                  className="group w-full rounded-xl p-6 text-left transition-all"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: `1px solid ${accentColor}30`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accentColor;
                    e.currentTarget.style.boxShadow = `0 0 24px ${accentColor}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${accentColor}30`;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="font-cinzel text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                        {d.name}
                      </h2>
                      <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>{d.stratagems.length} stratagems</span>
                        <span>{d.enhancements.length} enhancements</span>
                      </div>
                    </div>
                    <ChevronRight size={20} style={{ color: accentColor }} className="mt-1 transition-transform group-hover:translate-x-1" />
                  </div>
                  <div
                    className="rounded-lg p-3 text-left"
                    style={{ backgroundColor: `${accentColor}0D` }}
                  >
                    <span className="text-xs font-semibold" style={{ color: accentColor }}>
                      {d.rule.name}:{" "}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {d.rule.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ─── Step 4: Build Army ─────────────────────────────────────────────────────
  if (step === 4 && faction && detachment && gameSize) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${accentColor}10 0%, transparent 70%)` }}
        />

        {unitModal && (
          <UnitModal
            unit={unitModal}
            accentColor={accentColor}
            onClose={() => setUnitModal(null)}
          />
        )}

        <div className="relative z-10 flex flex-col flex-1">
          <Navigation />

          <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 lg:overflow-hidden" style={{ height: "auto" }}>
            {/* LEFT — Unit Browser */}
            <div className="flex flex-col lg:overflow-hidden lg:max-h-[calc(100vh-64px)]">
              {/* Browser header */}
              <div
                className="px-6 pt-6 pb-3 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={() => setStep(3)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                    ← Back
                  </button>
                  <span className="text-xs font-medium uppercase tracking-widest" style={{ color: accentColor }}>
                    {faction.name} · {detachment.name}
                  </span>
                </div>
                <h1 className="font-cinzel text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Unit Browser
                </h1>

                {/* Category tabs */}
                <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
                  {CATEGORIES.filter((cat) =>
                    faction.units.some((u) => u.category === cat)
                  ).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                      style={
                        activeCategory === cat
                          ? {
                              backgroundColor: `${accentColor}25`,
                              border: `1px solid ${accentColor}60`,
                              color: accentColor,
                            }
                          : {
                              backgroundColor: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "var(--text-muted)",
                            }
                      }
                    >
                      {cat}
                      <span className="ml-1.5 opacity-60">
                        ({faction.units.filter((u) => u.category === cat).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unit cards list */}
              <div className="flex-1 lg:overflow-y-auto px-6 py-4 space-y-3">
                {visibleUnits.length === 0 ? (
                  <p className="text-sm text-center mt-10" style={{ color: "var(--text-muted)" }}>
                    No units in this category.
                  </p>
                ) : (
                  visibleUnits.map((unit) => {
                    const alreadyInArmy = army.find((e) => e.unit.id === unit.id);
                    const wouldExceed = totalPts + unit.points > pointsLimit;
                    return (
                      <div
                        key={unit.id}
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor: "var(--bg-card)",
                          border: `1px solid ${alreadyInArmy ? accentColor + "50" : "var(--border-card)"}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {unit.isEpicHero && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#eab308" }}
                                >
                                  Epic Hero
                                </span>
                              )}
                              {unit.canFly && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: "rgba(96,165,250,0.15)", color: "#60a5fa" }}
                                >
                                  Fly
                                </span>
                              )}
                              {unit.canDeepStrike && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "#a78bfa" }}
                                >
                                  Deep Strike
                                </span>
                              )}
                            </div>
                            <h3
                              className="font-semibold text-sm truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {unit.name}
                            </h3>
                            {/* Mini stat row */}
                            <div className="flex gap-3 mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                              <span>M{unit.stats.movement}</span>
                              <span>T{unit.stats.toughness}</span>
                              <span>Sv{unit.stats.save}</span>
                              <span>W{unit.stats.wounds}</span>
                            </div>
                            {/* Keywords preview */}
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {unit.keywords.slice(0, 3).map((k) => (
                                <span
                                  key={k}
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: "rgba(255,255,255,0.04)",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span
                              className="font-cinzel font-bold text-sm"
                              style={{ color: accentColor }}
                            >
                              {unit.points} pts
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setUnitModal(unit)}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{
                                  backgroundColor: "rgba(255,255,255,0.06)",
                                  color: "var(--text-muted)",
                                }}
                                title="View unit details"
                              >
                                <Info size={13} />
                              </button>
                              <button
                                onClick={() => addUnit(unit)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={
                                  wouldExceed
                                    ? {
                                        backgroundColor: "rgba(245,158,11,0.12)",
                                        border: "1px solid rgba(245,158,11,0.3)",
                                        color: "#f59e0b",
                                      }
                                    : {
                                        backgroundColor: `${accentColor}18`,
                                        border: `1px solid ${accentColor}40`,
                                        color: accentColor,
                                      }
                                }
                              >
                                {wouldExceed ? "Add (Over Budget)" : "+ Add"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT — Army List */}
            <div
              className="flex flex-col lg:overflow-hidden lg:max-h-[calc(100vh-64px)] border-t lg:border-t-0 lg:border-l"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {/* Army list header */}
              <div
                className="px-5 pt-6 pb-3 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h2
                      className="font-cinzel font-bold text-base"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {faction.name}
                    </h2>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {detachment.name}
                    </p>
                  </div>
                  <span
                    className="font-cinzel font-bold text-lg"
                    style={{ color: ptsColor }}
                  >
                    {totalPts}/{pointsLimit}
                    <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
                      pts
                    </span>
                  </span>
                </div>

                {/* Points bar */}
                <div
                  className="h-2 rounded-full overflow-hidden mt-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${ptsPercent}%`,
                      backgroundColor: ptsColor,
                    }}
                  />
                </div>
              </div>

              {/* Army entries */}
              <div className="flex-1 lg:overflow-y-auto px-5 py-4 space-y-2">
                {army.length === 0 ? (
                  <p
                    className="text-sm text-center mt-10 leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No units added yet.
                    <br />
                    Browse the unit list and click&nbsp;<strong>+ Add</strong>.
                  </p>
                ) : (
                  army.map((entry) => {
                    const entryPts = entry.unit.points * entry.quantity;
                    return (
                      <div
                        key={entry.unit.id}
                        className="rounded-lg px-3 py-2.5"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-medium truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {entry.quantity > 1 && (
                                <span style={{ color: accentColor }}>×{entry.quantity} </span>
                              )}
                              {entry.unit.name}
                            </p>
                            {/* Model count adjuster */}
                            {entry.unit.models.min !== entry.unit.models.max && (
                              <div className="flex items-center gap-1 mt-1">
                                <button
                                  onClick={() => changeModelCount(entry.unit.id, -1)}
                                  className="w-4 h-4 rounded flex items-center justify-center"
                                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
                                >
                                  <Minus size={9} />
                                </button>
                                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                  {entry.modelCount} models
                                </span>
                                <button
                                  onClick={() => changeModelCount(entry.unit.id, 1)}
                                  className="w-4 h-4 rounded flex items-center justify-center"
                                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
                                >
                                  <Plus size={9} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: accentColor }}>
                              {entryPts}pts
                            </span>
                            <div className="flex gap-0.5">
                              <button
                                onClick={() => addUnit(entry.unit)}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                                style={{
                                  backgroundColor: `${accentColor}18`,
                                  color: accentColor,
                                }}
                              >
                                <Plus size={11} />
                              </button>
                              <button
                                onClick={() => removeUnit(entry.unit.id)}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                                style={{
                                  backgroundColor: "rgba(220,38,38,0.1)",
                                  color: "#ef4444",
                                }}
                              >
                                <Minus size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Stratagems reference */}
              <div
                className="px-5 py-3 flex-shrink-0"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <button
                  onClick={() => setStratagemExpanded((x) => !x)}
                  className="flex items-center justify-between w-full text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>Detachment Stratagems ({detachment.stratagems.length})</span>
                  <ChevronDown
                    size={14}
                    className="transition-transform"
                    style={{ transform: stratagemExpanded ? "rotate(180deg)" : "none" }}
                  />
                </button>
                {stratagemExpanded && (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {detachment.stratagems.map((s) => (
                      <div key={s.name} className="text-xs">
                        <span className="font-medium" style={{ color: accentColor }}>
                          {s.name}
                        </span>
                        <span
                          className="ml-1.5 px-1 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: "rgba(234,179,8,0.15)",
                            color: "#eab308",
                          }}
                        >
                          {s.cost}CP
                        </span>
                        <p className="mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {s.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="px-5 pb-5 flex-shrink-0">
                <button
                  disabled={army.length === 0}
                  className="w-full py-3 rounded-xl font-cinzel font-semibold text-sm transition-all disabled:opacity-40"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    border: `1px solid ${accentColor}50`,
                    color: accentColor,
                  }}
                  onMouseEnter={(e) => {
                    if (army.length > 0) {
                      e.currentTarget.style.backgroundColor = `${accentColor}30`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${accentColor}20`;
                  }}
                  onClick={() => {
                    alert("Army saved! (Supabase persistence requires sign-in)");
                  }}
                >
                  Save Army · {totalPts}pts
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return null;
}
