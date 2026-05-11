"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import Warhammer40kBoard, { type AnimationEvent } from "@/components/game/Warhammer40kBoard";
import { createClient } from "@/lib/supabase/client";
import { SPACE_MARINES_FACTION } from "@/lib/wh40k/space-marines";
import { DARK_ANGELS_FACTION } from "@/lib/wh40k/dark-angels";
import { TYRANIDS_FACTION } from "@/lib/wh40k/tyranids";
import { NECRONS_FACTION } from "@/lib/wh40k/necrons";
import type { UnitMarker, RolloffResult, RangeIndicator } from "@/lib/wh40k/gameTypes";
import type { Unit } from "@/lib/wh40k/types";
import { MAP_PRESETS, DEFAULT_PRESET, getPresetById } from "@/lib/wh40k/mapPresets";
import type { MapPreset } from "@/lib/wh40k/mapPresets";
import { BASE_RADIUS_INCHES } from "@/lib/wh40k/unitSilhouettes";
import { hexPackPositions } from "@/lib/wh40k/hexPack";
import type { BaseSize } from "@/lib/wh40k/gameTypes";
import { FACTION_RULES, getFactionRules } from "@/lib/wh40k/factionRules";
import type { FactionRule } from "@/lib/wh40k/factionRules";
import { TACTICAL_MISSIONS, shuffleDeck } from "@/lib/wh40k/secondaryObjectives";
import type { TacticalMission } from "@/lib/wh40k/secondaryObjectives";
import type { WeaponProfile } from "@/lib/wh40k/types";
import { DiceRollerPopup, useDiceRoller } from "@/components/game/DiceRollerPopup";
import {
  computeAIMovements,
  computeAIShooting,
  computeAICharges,
  computeAIFights,
  resolveAIAttack,
  chargeRoll2D6,
  findChargePlacement,
  buildDefaultAIArmySpec,
} from "@/lib/wh40k/ai-opponent";
import {
  Dice6,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Activity,
  Sword,
  Shield,
  Target,
  Zap,
  Heart,
  Star,
  ArrowRight,
  Archive,
  Loader2,
  RotateCcw,
  RotateCw,
  BookOpen,
  Scroll,
  Copy,
  Check,
  Wifi,
  Clock,
  Users,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_H_CONST = 44; // board height in inches

// ─── Stratagem definitions ─────────────────────────────────────────────────────

interface StratagemDef {
  name: string;
  cost: number;
  phase: string;
  description: string;
  effect: string;
  requiresUnit: boolean;
  requiresTarget: boolean;
  reactive: boolean;
  isPsychic?: boolean;
  unitFilter?: (m: UnitMarker, ap: "P1" | "P2") => boolean;
  factionFilter?: string[];
}

const STRATAGEMS: StratagemDef[] = [
  {
    name: "Counter-Offensive",
    cost: 2,
    phase: "Fight",
    description: "Use after one of your units has fought. Select another eligible unit — it can fight again immediately.",
    effect: "counter_offensive",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Rapid Ingress",
    cost: 1,
    phase: "Movement",
    description: "Select a unit in Strategic Reserves. It arrives immediately — place it more than 9\" from all enemy models.",
    effect: "rapid_ingress",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    unitFilter: (m, ap) => m.player === ap && !!m.isInReserve && !m.isDestroyed,
  },
  {
    name: "Armour of Contempt",
    cost: 1,
    phase: "Any",
    description: "REACTIVE: When an ADEPTUS ASTARTES unit loses wounds, roll a D6 for each wound lost — on a 6, that wound is ignored.",
    effect: "armour_of_contempt",
    requiresUnit: false,
    requiresTarget: false,
    reactive: true,
    factionFilter: ["Space Marines", "Dark Angels"],
  },
  {
    name: "Insane Bravery",
    cost: 2,
    phase: "Any",
    description: "REACTIVE: Select one of your units that is about to take a Battle-shock test — it automatically passes.",
    effect: "insane_bravery",
    requiresUnit: true,
    requiresTarget: false,
    reactive: true,
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve && !!m.belowHalfStrength,
  },
  {
    name: "Grenade",
    cost: 1,
    phase: "Shooting",
    description: "Select one of your INFANTRY units that has not shot this turn. It throws a grenade at a visible enemy unit within 8\". Roll: D3 shots, S4, AP0, D1.",
    effect: "grenade",
    requiresUnit: true,
    requiresTarget: true,
    reactive: false,
    unitFilter: (m, ap) =>
      m.player === ap &&
      !m.isDestroyed &&
      !m.isInReserve &&
      !m.isAttached &&
      (m.keywords ?? []).some((k) => k.toUpperCase().includes("INFANTRY")),
  },
  // ── Space Marines ────────────────────────────────────────────────────────
  {
    name: "Honour the Chapter",
    cost: 1,
    phase: "Fight",
    description: "Use in Fight phase when a SPACE MARINES unit fights. That unit's melee weapons gain +1 Attack this phase.",
    effect: "honour_the_chapter",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Space Marines"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Transhuman Physiology",
    cost: 1,
    phase: "Any",
    description: "REACTIVE: Use when a SPACE MARINES INFANTRY or TERMINATOR unit is selected as a target. Until end of phase, wound rolls of 1–3 against that unit automatically fail.",
    effect: "transhuman_physiology",
    requiresUnit: true,
    requiresTarget: false,
    reactive: true,
    factionFilter: ["Space Marines"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Only in Death Does Duty End",
    cost: 2,
    phase: "Fight",
    description: "REACTIVE: Use when a SPACE MARINES CHARACTER model is destroyed. Before removing the model, it immediately fights as if it were your Fight phase.",
    effect: "only_in_death",
    requiresUnit: true,
    requiresTarget: false,
    reactive: true,
    factionFilter: ["Space Marines"],
    unitFilter: (m, ap) =>
      m.player === ap &&
      !m.isInReserve &&
      (m.keywords ?? []).some((k) => k.toUpperCase().includes("CHARACTER")),
  },
  // ── Dark Angels ──────────────────────────────────────────────────────────
  {
    name: "Deathwing Assault",
    cost: 1,
    phase: "Movement",
    description: "Use at the end of the opponent's Movement phase. One DARK ANGELS TERMINATOR unit from Strategic Reserve can arrive anywhere more than 9\" from all enemy models.",
    effect: "deathwing_assault",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Dark Angels"],
    unitFilter: (m, ap) => m.player === ap && !!m.isInReserve && !m.isDestroyed,
  },
  {
    name: "Speed of the Ravenwing",
    cost: 1,
    phase: "Movement",
    description: "Use in the Movement phase for a DARK ANGELS CAVALRY or MOUNTED unit. That unit can move an additional 6\" this phase.",
    effect: "speed_of_the_ravenwing",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Dark Angels"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Grim Interrogation",
    cost: 1,
    phase: "Fight",
    description: "Use at end of Fight phase when a DARK ANGELS CHARACTER fights and destroys an enemy CHARACTER. Gain 1 Victory Point.",
    effect: "grim_interrogation",
    requiresUnit: false,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Dark Angels"],
  },
  {
    name: "✨ Mind Worm",
    cost: 1,
    phase: "Command",
    description: "Use at the start of your Command phase. Target enemy unit within 18\" of Ezekiel suffers D3 mortal wounds.",
    effect: "mind_worm",
    requiresUnit: false,
    requiresTarget: true,
    reactive: false,
    isPsychic: true,
    factionFilter: ["Dark Angels"],
  },
  {
    name: "✨ Aversion",
    cost: 1,
    phase: "Shooting",
    description: "REACTIVE: Use at the start of the opponent's Shooting phase. Target friendly DARK ANGELS unit within 18\" of Ezekiel. Until end of phase, attackers suffer -1 to hit rolls against it.",
    effect: "aversion",
    requiresUnit: true,
    requiresTarget: false,
    reactive: true,
    isPsychic: true,
    factionFilter: ["Dark Angels"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "✨ Might of Heroes",
    cost: 1,
    phase: "Fight",
    description: "Use in the Fight phase. Target friendly DARK ANGELS CHARACTER within 6\" of Ezekiel gains +1 Strength and +1 Attacks until end of phase.",
    effect: "might_of_heroes",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    isPsychic: true,
    factionFilter: ["Dark Angels"],
    unitFilter: (m, ap) =>
      m.player === ap && !m.isDestroyed && !m.isInReserve &&
      (m.keywords ?? []).some((k) => k.toUpperCase().includes("CHARACTER")),
  },
  // ── Tyranids ─────────────────────────────────────────────────────────────
  {
    name: "Metabolic Overdrive",
    cost: 1,
    phase: "Movement",
    description: "Use in the Movement phase for a TYRANIDS unit. That unit can Advance and still shoot this turn.",
    effect: "metabolic_overdrive",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Tyranids"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Voracious Appetite",
    cost: 1,
    phase: "Fight",
    description: "Use in the Fight phase for a TYRANIDS unit. Re-roll all failed wound rolls for that unit this phase.",
    effect: "voracious_appetite",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Tyranids"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Synaptic Communion",
    cost: 2,
    phase: "Command",
    description: "Use at the start of your Command phase. Remove the Battle-shocked condition from one friendly TYRANIDS unit within 12\" of a SYNAPSE unit.",
    effect: "synaptic_communion",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Tyranids"],
    unitFilter: (m, ap) =>
      m.player === ap && !m.isDestroyed && !m.isInReserve && !!m.battleShocked,
  },
  {
    name: "Pheromone Trail",
    cost: 1,
    phase: "Movement",
    description: "Use at the end of your Movement phase. One TYRANIDS unit in Strategic Reserve can be placed anywhere more than 9\" from all enemy models.",
    effect: "pheromone_trail",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Tyranids"],
    unitFilter: (m, ap) => m.player === ap && !!m.isInReserve && !m.isDestroyed,
  },
  {
    name: "✨ Psychic Scream",
    cost: 1,
    phase: "Command",
    description: "Use at the start of your Command phase. Target visible enemy unit within 18\" of a SYNAPSE unit. It suffers D3 mortal wounds and must take a Battle-shock test.",
    effect: "psychic_scream",
    requiresUnit: false,
    requiresTarget: true,
    reactive: false,
    isPsychic: true,
    factionFilter: ["Tyranids"],
  },
  {
    name: "✨ Catalyst",
    cost: 1,
    phase: "Any",
    description: "Use in any phase. Target friendly TYRANIDS unit within 12\" of a SYNAPSE unit. Until end of turn, it has Feel No Pain 5+.",
    effect: "catalyst",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    isPsychic: true,
    factionFilter: ["Tyranids"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "✨ The Horror",
    cost: 1,
    phase: "Shooting",
    description: "Use at the start of the Shooting phase. Target enemy unit within 18\" of a SYNAPSE unit. Until end of phase, it suffers -1 to its hit rolls.",
    effect: "the_horror",
    requiresUnit: false,
    requiresTarget: true,
    reactive: false,
    isPsychic: true,
    factionFilter: ["Tyranids"],
  },
  // ── Necrons ──────────────────────────────────────────────────────────────
  {
    name: "Their Number is Legion",
    cost: 1,
    phase: "Any",
    description: "REACTIVE: Use at end of opponent's Shooting or Fight phase when a NECRONS INFANTRY unit had models destroyed. Roll D6 for each; on 4+, return that model with 1 wound.",
    effect: "their_number_is_legion",
    requiresUnit: true,
    requiresTarget: false,
    reactive: true,
    factionFilter: ["Necrons"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Disruption Fields",
    cost: 1,
    phase: "Fight",
    description: "Use in the Fight phase for a NECRONS unit. Until end of phase, add +1 to wound rolls for that unit's melee weapons.",
    effect: "disruption_fields",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Necrons"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
  {
    name: "Quantum Shielding",
    cost: 1,
    phase: "Any",
    description: "REACTIVE: Use when a NECRONS VEHICLE is hit by an attack with Damage 3+. Reduce the damage of that attack by D3 (minimum 1).",
    effect: "quantum_shielding",
    requiresUnit: true,
    requiresTarget: false,
    reactive: true,
    factionFilter: ["Necrons"],
    unitFilter: (m, ap) =>
      m.player === ap &&
      !m.isDestroyed &&
      !m.isInReserve &&
      (m.keywords ?? []).some((k) => k.toUpperCase().includes("VEHICLE")),
  },
  {
    name: "My Will Be Done",
    cost: 1,
    phase: "Movement",
    description: "Use at the start of your Movement phase for a NECRONS unit within 9\" of a NECRONS NOBLE. Until end of turn, that unit has +1 to hit rolls.",
    effect: "my_will_be_done",
    requiresUnit: true,
    requiresTarget: false,
    reactive: false,
    factionFilter: ["Necrons"],
    unitFilter: (m, ap) => m.player === ap && !m.isDestroyed && !m.isInReserve,
  },
];

const ALL_FACTIONS = [
  SPACE_MARINES_FACTION,
  DARK_ANGELS_FACTION,
  TYRANIDS_FACTION,
  NECRONS_FACTION,
];

const ROLLOFF_LABELS = ["Attacker / Defender", "First Deployment", "First Turn"];

type RoomPhase = "loading" | "rolloff" | "deployment" | "game" | "finished";

// 10th ed turn order: each player runs all 5 phases, then scoring at end of battle round.
// TODO: Battle-shock (replaces morale in 10th ed): units below half-strength test on Leadership; on fail can't use special abilities.
type GamePhase = "command" | "movement" | "shooting" | "charge" | "fight" | "scoring";

// The 5 phases each player runs through before switching turns
const PLAYER_PHASES: GamePhase[] = ["command", "movement", "shooting", "charge", "fight"];
// Alias for phase chip display (excludes scoring which is a between-turns state)
const GAME_PHASES = PLAYER_PHASES;

const PHASE_ICONS: Record<GamePhase, React.ComponentType<{ size?: number }>> = {
  command: Star,
  movement: ArrowRight,
  shooting: Target,
  charge: Zap,
  fight: Sword,
  scoring: Activity,
};

const PHASE_LABELS: Record<GamePhase, string> = {
  command: "Command",
  movement: "Movement",
  shooting: "Shooting",
  charge: "Charge",
  fight: "Fight",
  scoring: "Scoring",
};

// ─── Dice helpers ─────────────────────────────────────────────────────────────

function d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice(n: number): number[] {
  return Array.from({ length: n }, () => d6());
}

function parseDiceExpr(expr: string): number {
  const s = expr.trim().toUpperCase();
  if (/^\d+$/.test(s)) return parseInt(s);
  if (s === "D6") return d6();
  if (s === "D3") return Math.floor(Math.random() * 3) + 1;
  const m = s.match(/^(\d+)D(\d+)$/);
  if (m) {
    let t = 0;
    for (let i = 0; i < parseInt(m[1]); i++) t += Math.floor(Math.random() * parseInt(m[2])) + 1;
    return t;
  }
  return 1;
}

function getWoundTarget(S: number, T: number): number {
  if (S >= 2 * T) return 2;
  if (S > T) return 3;
  if (S === T) return 4;
  if (S <= Math.floor(T / 2)) return 6;
  return 5;
}

function parseSave(save: string): number {
  const m = save.match(/(\d+)\+/);
  return m ? parseInt(m[1]) : 7;
}

function parseInvSave(save: string): number | null {
  const m = save.match(/(\d+)\+\+/);
  return m ? parseInt(m[1]) : null;
}

function parseAP(ap: string): number {
  return parseInt(ap) || 0;
}

function parseStat(val: string): number {
  const m = val.replace(/"/g, "").match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function parseSkill(skill: string): number {
  const m = skill.match(/(\d+)\+/);
  return m ? parseInt(m[1]) : 4;
}

// ─── Base size from unit keywords ─────────────────────────────────────────────

function baseSizeFromKeywords(keywords: string[]): BaseSize {
  const kw = keywords.map((k) => k.toUpperCase());
  if (kw.some((k) => k.includes("TITAN") || k.includes("SUPERHEAVY"))) return "titan";
  if (kw.some((k) => k.includes("MONSTER") || k.includes("VEHICLE"))) return "monster";
  if (kw.some((k) => k.includes("DREADNOUGHT") || k.includes("WALKER"))) return "dreadnought";
  if (kw.some((k) => k.includes("TERMINATOR"))) return "terminator";
  if (kw.some((k) => k.includes("CAVALRY") || k.includes("MOUNTED") || k.includes("BIKE"))) return "cavalry";
  return "infantry";
}

// Check if a line segment (ax,ay)→(bx,by) passes through a rectangle
function lineIntersectsRect(
  ax: number, ay: number, bx: number, by: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  // Separating axis test
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);
  if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) return false;
  // Parametric clip
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0, tMax = 1;
  function clip(p: number, q: number) {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > tMax) return false; if (r > tMin) tMin = r; }
    else { if (r < tMin) return false; if (r < tMax) tMax = r; }
    return true;
  }
  if (!clip(-dx, ax - rx)) return false;
  if (!clip(dx, rx + rw - ax)) return false;
  if (!clip(-dy, ay - ry)) return false;
  if (!clip(dy, ry + rh - ay)) return false;
  return tMin < tMax;
}

// Returns the effective center of a unit for range/distance calculations.
// Uses first model position (absolute board inches) when available.
function markerPos(unit: UnitMarker): { x: number; y: number } {
  if (unit.modelPositions && unit.modelPositions.length > 0) {
    return unit.modelPositions[0];
  }
  return { x: unit.x + 0.5, y: unit.y + 0.5 };
}

// ─── Transport helpers ─────────────────────────────────────────────────────────

function isTransportUnit(m: UnitMarker): boolean {
  return (m.keywords ?? []).some((k) => k.toUpperCase() === "TRANSPORT");
}

function getTransportCapacity(m: UnitMarker): number {
  if (m.transportCapacity !== undefined) return m.transportCapacity;
  const name = m.unitName.toLowerCase();
  if (name.includes("impulsor") || name.includes("repulsor")) return 6;
  return 10; // Rhino, Razorback, Drop Pod
}

function isDropPod(m: UnitMarker): boolean {
  return m.unitName.toLowerCase().includes("drop pod");
}

// ─── Activity log ─────────────────────────────────────────────────────────────

interface LogEntry {
  time: string;
  text: string;
  player?: "P1" | "P2" | "system";
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── Build markers from army data ─────────────────────────────────────────────

interface ArmyRow {
  id: string;
  name: string;
  faction: string;
  subfaction: string | null;
  units: {
    entries: {
      unitId: string;
      modelCount: number;
      quantity: number;
      attachedLeaderId?: string;
      selectedWeapons?: Record<string, WeaponProfile>;
    }[];
  };
}

function findUnit(factionName: string, unitId: string): Unit | undefined {
  const faction = ALL_FACTIONS.find((f) => f.name === factionName);
  return faction?.units.find((u) => u.id === unitId);
}

function buildMarkers(army: ArmyRow, player: "P1" | "P2"): UnitMarker[] {
  const entries = army.units?.entries ?? [];
  const markers: UnitMarker[] = [];
  // Units that appear as attachedLeaderId in another entry should not also appear
  // as a standalone entry — they deploy automatically with their parent unit.
  const attachedLeaderIds = new Set(
    entries.map((e) => e.attachedLeaderId).filter(Boolean)
  );

  entries.forEach((entry) => {
    if (attachedLeaderIds.has(entry.unitId)) return; // skip — already an attached leader
    const unit = findUnit(army.faction, entry.unitId);
    if (!unit) return;

    for (let i = 0; i < Math.max(1, entry.quantity); i++) {
      const uid = `${player}-${entry.unitId}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const baseSize = baseSizeFromKeywords(unit.keywords ?? []);

      // Resolve attached character (leader)
      let attachedCharacterId: string | undefined;
      let attachedCharacterName: string | undefined;
      let charMarker: UnitMarker | undefined;

      if (entry.attachedLeaderId) {
        const charUnit = findUnit(army.faction, entry.attachedLeaderId);
        if (charUnit) {
          const charId = `${player}-${entry.attachedLeaderId}-attached-${uid}`;
          attachedCharacterId = charId;
          attachedCharacterName = charUnit.name;
          charMarker = {
            id: charId,
            unitId: entry.attachedLeaderId,
            unitName: charUnit.name,
            player,
            x: 0,
            y: 0,
            currentWounds: charUnit.stats.wounds,
            maxWounds: charUnit.stats.wounds,
            modelCount: 1,
            woundsPerModel: charUnit.stats.wounds,
            startingModelCount: 1,
            stats: charUnit.stats,
            weapons: charUnit.weapons,
            hasAdvanced: false,
            hasCharged: false,
            hasFought: false,
            hasShotThisTurn: false,
            isInReserve: true,
            isDestroyed: false,
            baseSize: baseSizeFromKeywords(charUnit.keywords ?? []),
            faction: army.faction,
            isAttached: true,
            attachedToMarkerId: uid,
          };
        }
      }

      // Apply weapon loadout selections from army builder
      let effectiveWeapons = [...unit.weapons];
      if (unit.weaponOptions && entry.selectedWeapons && Object.keys(entry.selectedWeapons).length > 0) {
        for (const optGroup of unit.weaponOptions) {
          const selected = entry.selectedWeapons[optGroup.replaces];
          const allOptionNames = optGroup.options.map((o) => o.name);
          // Remove alternative weapons that appear in the weapons array
          effectiveWeapons = effectiveWeapons.filter((w) => !allOptionNames.includes(w.name));
          if (selected) {
            // Remove the default weapon, add the selected one
            effectiveWeapons = effectiveWeapons.filter((w) => w.name !== optGroup.replaces);
            effectiveWeapons.push(selected);
          }
        }
      }

      const modelCount = Math.max(1, entry.modelCount || unit.models.min);
      markers.push({
        id: uid,
        unitId: entry.unitId,
        unitName: unit.name,
        player,
        x: 0,
        y: 0,
        currentWounds: unit.stats.wounds,
        maxWounds: unit.stats.wounds,
        modelCount,
        woundsPerModel: unit.stats.wounds,
        startingModelCount: modelCount,
        stats: unit.stats,
        weapons: effectiveWeapons,
        hasAdvanced: false,
        hasCharged: false,
        hasFought: false,
        hasShotThisTurn: false,
        isInReserve: true,
        isDestroyed: false,
        baseSize,
        faction: army.faction,
        attachedCharacterId,
        attachedCharacterName,
        keywords: unit.keywords ?? [],
        teleportHomer: unit.teleportHomer ?? false,
      });

      if (charMarker) markers.push(charMarker);
    }
  });

  return markers;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiceRoller() {
  const [count, setCount] = useState(1);
  const [sides, setSides] = useState(6);
  const [results, setResults] = useState<number[]>([]);
  const [rollId, setRollId] = useState(0); // increments on every roll to force re-render/animation

  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Dice6 size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Dice Roller
        </span>
      </div>
      <div className="flex gap-2 items-center mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCount((n) => Math.max(1, n - 1))}
            className="w-5 h-5 rounded flex items-center justify-center text-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
          >
            <Minus size={8} />
          </button>
          <span className="text-xs w-5 text-center font-bold" style={{ color: "var(--text-primary)" }}>{count}</span>
          <button
            onClick={() => setCount((n) => Math.min(20, n + 1))}
            className="w-5 h-5 rounded flex items-center justify-center text-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
          >
            <Plus size={8} />
          </button>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>d</span>
        <div className="flex gap-0.5 flex-wrap">
          {[4, 6, 8, 10, 12, 20].map((d) => (
            <button
              key={d}
              onClick={() => setSides(d)}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={
                sides === d
                  ? { backgroundColor: "rgba(217,119,6,0.2)", color: "#d97706", border: "1px solid rgba(217,119,6,0.4)" }
                  : { backgroundColor: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.06)" }
              }
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => {
          setRollId((n) => n + 1);
          setResults(Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1));
        }}
        className="w-full py-1.5 rounded-lg text-xs font-semibold mb-2"
        style={{ backgroundColor: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)", color: "#d97706" }}
      >
        Roll {count}d{sides}
      </button>
      {/* Animation keyframes for dice flash */}
      <style>{`@keyframes diceFlash{0%{transform:scale(0.7);opacity:0.3}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:1}}`}</style>
      {results.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {results.map((r, i) => (
            <span
              key={`${rollId}-${i}`}
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: r === sides ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.06)",
                color: r === sides ? "#eab308" : "var(--text-primary)",
                border: `1px solid ${r === sides ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.08)"}`,
                animation: "diceFlash 0.35s ease-out",
              }}
            >
              {r}
            </span>
          ))}
          {count > 1 && (
            <span className="text-[10px] self-center ml-1" style={{ color: "var(--text-muted)" }}>
              ={results.reduce((a, b) => a + b, 0)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rolloff Phase ────────────────────────────────────────────────────────────

interface RolloffPhaseProps {
  gameName: string;
  onComplete: (results: RolloffResult) => void;
}

function RolloffPhase({ gameName, onComplete }: RolloffPhaseProps) {
  const [step, setStep] = useState(0); // 0=attacker, 1=firstDeployer, 2=firstTurn
  const [p1Roll, setP1Roll] = useState<number | null>(null);
  const [p2Roll, setP2Roll] = useState<number | null>(null);
  const [stepResults, setStepResults] = useState<(RolloffResult[keyof RolloffResult])[]>([null, null, null]);
  const [rolling, setRolling] = useState(false);

  const keys: (keyof RolloffResult)[] = ["attacker", "firstDeployer", "firstTurn"];

  function rollForStep() {
    setRolling(true);
    setP1Roll(null);
    setP2Roll(null);
    setTimeout(() => {
      const r1 = d6();
      const r2 = d6();
      setP1Roll(r1);
      setP2Roll(r2);
      setRolling(false);
    }, 600);
  }

  function confirmStep() {
    if (p1Roll === null || p2Roll === null) return;
    if (p1Roll === p2Roll) {
      // Tie — re-roll
      setP1Roll(null);
      setP2Roll(null);
      return;
    }
    const winner = p1Roll > p2Roll ? "P1" : "P2";
    const next = [...stepResults];
    next[step] = winner;
    setStepResults(next);
    if (step < 2) {
      setStep(step + 1);
      setP1Roll(null);
      setP2Roll(null);
    } else {
      const results: RolloffResult = {
        attacker: next[0] as "P1" | "P2",
        firstDeployer: next[1] as "P1" | "P2",
        firstTurn: next[2] as "P1" | "P2",
      };
      onComplete(results);
    }
  }

  const isTie = p1Roll !== null && p2Roll !== null && p1Roll === p2Roll;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#d97706" }}>
        Pre-Battle Roll-Offs
      </p>
      <h2 className="font-cinzel text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {gameName}
      </h2>

      {/* Step progress */}
      <div className="flex gap-2 mb-8">
        {ROLLOFF_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={
                i < step
                  ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }
                  : i === step
                  ? { backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.4)" }
                  : { backgroundColor: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {i < step && "✓ "}
              {label}
              {i < step && stepResults[i] && (
                <span className="font-bold ml-1">{stepResults[i]}</span>
              )}
            </div>
            {i < 2 && <span style={{ color: "var(--text-muted)" }}>→</span>}
          </div>
        ))}
      </div>

      {/* Current roll-off */}
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(217,119,6,0.3)" }}
      >
        <h3 className="font-cinzel text-lg font-bold text-center mb-6" style={{ color: "#d97706" }}>
          Roll for: {ROLLOFF_LABELS[step]}
        </h3>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {[
            { label: "Player 1", color: "#ef4444", roll: p1Roll },
            { label: "Player 2", color: "#3b82f6", roll: p2Roll },
          ].map(({ label, color, roll }) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color }}>
                {label}
              </span>
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center font-cinzel text-4xl font-bold"
                style={{
                  backgroundColor: `${color}15`,
                  border: `2px solid ${roll !== null ? `${color}60` : "rgba(255,255,255,0.1)"}`,
                  color: roll !== null ? color : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s",
                }}
              >
                {rolling ? "?" : roll !== null ? roll : "—"}
              </div>
            </div>
          ))}
        </div>

        {isTie && (
          <div
            className="text-center text-sm py-2 px-4 rounded-lg mb-4"
            style={{ backgroundColor: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}
          >
            Tie! Roll again.
          </div>
        )}

        {p1Roll === null ? (
          <button
            onClick={rollForStep}
            disabled={rolling}
            className="w-full py-4 rounded-xl font-cinzel font-bold text-base transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: "rgba(217,119,6,0.18)",
              border: "1px solid rgba(217,119,6,0.5)",
              color: "#d97706",
            }}
          >
            {rolling ? <Loader2 size={18} className="animate-spin" /> : <Dice6 size={18} />}
            {rolling ? "Rolling…" : "Roll Dice"}
          </button>
        ) : !isTie ? (
          <button
            onClick={confirmStep}
            className="w-full py-3 rounded-xl font-cinzel font-semibold text-sm transition-all"
            style={{
              backgroundColor: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.4)",
              color: "#22c55e",
            }}
          >
            {p1Roll > (p2Roll ?? 0) ? "P1" : "P2"} wins — {step < 2 ? "Next Roll →" : "Begin Deployment →"}
          </button>
        ) : (
          <button
            onClick={rollForStep}
            className="w-full py-3 rounded-xl font-cinzel font-semibold text-sm transition-all"
            style={{
              backgroundColor: "rgba(234,179,8,0.15)",
              border: "1px solid rgba(234,179,8,0.4)",
              color: "#eab308",
            }}
          >
            Re-roll →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Deployment side panel ────────────────────────────────────────────────────

interface DeploymentPanelProps {
  undeployedMarkers: UnitMarker[];
  currentDeployer: "P1" | "P2";
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReserve: (id: string) => void;
  onEndDeployment: () => void;
  allDone: boolean;
  pendingHomerUnit?: UnitMarker | null;
}

function DeploymentPanel({
  undeployedMarkers,
  currentDeployer,
  selectedId,
  onSelect,
  onReserve,
  onEndDeployment,
  allDone,
  pendingHomerUnit,
}: DeploymentPanelProps) {
  // Hide attached character markers — they deploy automatically with the parent unit
  const currentUnits = undeployedMarkers.filter(
    (m) => m.player === currentDeployer && !m.isAttached
  );

  return (
    <div
      className="w-56 flex-shrink-0 flex flex-col overflow-hidden"
      style={{ borderRight: "1px solid var(--border-subtle)" }}
    >
      <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
          Deployment
        </p>
        {pendingHomerUnit ? (
          <>
            <p className="text-sm font-semibold" style={{ color: "#eab308" }}>📡 Place Homer</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              Click in your deployment zone to place a Teleport Homer for <strong style={{ color: "var(--text-primary)" }}>{pendingHomerUnit.unitName}</strong>.
            </p>
          </>
        ) : (
          <>
            <p
              className="text-sm font-semibold"
              style={{ color: currentDeployer === "P1" ? "#ef4444" : "#3b82f6" }}
            >
              {currentDeployer} deploys
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Click unit → click deployment zone
            </p>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ opacity: pendingHomerUnit ? 0.35 : 1, pointerEvents: pendingHomerUnit ? "none" : "auto" }}>
        {currentUnits.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
            All units deployed
          </p>
        )}
        {currentUnits.map((m) => (
          <div
            key={m.id}
            className="rounded-lg overflow-hidden"
            style={{
              border: selectedId === m.id
                ? `1px solid ${currentDeployer === "P1" ? "#ef4444" : "#3b82f6"}`
                : "1px solid var(--border-card)",
              backgroundColor: selectedId === m.id
                ? currentDeployer === "P1" ? "rgba(220,38,38,0.12)" : "rgba(37,99,235,0.12)"
                : "var(--bg-card)",
            }}
          >
            <button
              className="w-full text-left px-2.5 py-2 text-xs font-medium"
              style={{ color: "var(--text-primary)" }}
              onClick={() => onSelect(m.id)}
            >
              <span className="flex items-center gap-1">
                {m.attachedCharacterName && (
                  <span title="Has attached character" style={{ color: "#eab308", fontSize: 9 }}>⚔</span>
                )}
                {m.attachedCharacterName
                  ? `${m.unitName} + ${m.attachedCharacterName}`
                  : m.unitName}
              </span>
              <span className="block text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                T{m.stats.toughness} · W{m.maxWounds} · Sv{m.stats.save}
              </span>
            </button>
            <button
              className="w-full text-left px-2.5 py-1 text-[10px] border-t flex items-center gap-1"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
              onClick={() => onReserve(m.id)}
            >
              <Archive size={9} />
              Reserve
            </button>
          </div>
        ))}
      </div>

      {allDone && (
        <div className="p-3 flex-shrink-0">
          <button
            onClick={onEndDeployment}
            className="w-full py-2 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            Begin Battle →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Combat helper ────────────────────────────────────────────────────────────

type CombatStep =
  | "idle"
  | "selectAttacker"
  | "selectWeapon"
  | "selectTarget"
  | "hitRolls"
  | "woundRolls"
  | "saveRolls"
  | "done";

interface CombatState {
  step: CombatStep;
  attackerId: string | null;
  weaponIdx: number | null;
  targetId: string | null;
  hitRolls: number[];
  hits: number;
  autoWounds: number;    // Lethal Hits: 6s to hit that skip wound roll
  woundRolls: number[];
  wounds: number;
  mortalWounds: number;  // Devastating Wounds: 6s to wound that bypass saves
  saveRolls: number[];
  unsavedWounds: number;
  totalDamage: number;
  isFightback?: boolean; // true = this is the defender's fight-back sequence
}

const INIT_COMBAT: CombatState = {
  step: "idle",
  attackerId: null,
  weaponIdx: null,
  targetId: null,
  hitRolls: [],
  hits: 0,
  autoWounds: 0,
  woundRolls: [],
  wounds: 0,
  mortalWounds: 0,
  saveRolls: [],
  unsavedWounds: 0,
  totalDamage: 0,
};

// ─── Main Game Room ───────────────────────────────────────────────────────────

export default function WarhammerGameRoom() {
  const { id } = useParams<{ id: string }>();

  // ── Multiplayer identity ──
  // "loading" means we haven't yet determined which player this browser is.
  const [localRole, setLocalRole] = useState<"P1" | "P2" | "spectator" | "loading">("loading");
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [p1UserId, setP1UserId] = useState<string | null>(null);
  const [p2UserId, setP2UserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  // Ref to the realtime channel so we can .send() from action handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  // Prevents the receiver side from triggering another save when applying remote state
  const isApplyingRemote = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Shared state ──
  const [roomPhase, setRoomPhase] = useState<RoomPhase>("loading");
  const [gameName, setGameName] = useState("Loading…");
  const [gameMode, setGameMode] = useState<"solo" | "2player" | "vs-ai">("2player");
  const [soloSide, setSoloSide] = useState<"P1" | "P2">("P1");
  const [isAIGame, setIsAIGame] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [p1ArmyName, setP1ArmyName] = useState("Player 1");
  const [p2ArmyName, setP2ArmyName] = useState("Player 2");

  // ── Unit markers (shared across deployment + game) ──
  const [markers, setMarkers] = useState<UnitMarker[]>([]);

  // ── Rolloff ──
  const [rolloffResults, setRolloffResults] = useState<RolloffResult>({
    attacker: null,
    firstDeployer: null,
    firstTurn: null,
  });

  // ── Deployment ──
  const [deployDeployer, setDeployDeployer] = useState<"P1" | "P2">("P1");
  const [deploySelectedId, setDeploySelectedId] = useState<string | null>(null);

  // ── Game phase ──
  const [round, setRound] = useState(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>("command");
  const [activePlayer, setActivePlayer] = useState<"P1" | "P2">("P1");
  const [p1Cp, setP1Cp] = useState(0);
  const [p2Cp, setP2Cp] = useState(0);
  const [p1Vp, setP1Vp] = useState(0);
  const [p2Vp, setP2Vp] = useState(0);

  // ── Selection & combat ──
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [combat, setCombat] = useState<CombatState>(INIT_COMBAT);
  const [moveUnit, setMoveUnit] = useState<string | null>(null);
  const [moveAdvance, setMoveAdvance] = useState(false);

  // ── Activity log ──
  const [actLog, setActLog] = useState<LogEntry[]>([
    { time: nowTime(), text: "Game room initialised. Waiting for armies…", player: "system" },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  // ── Map preset ──
  const [mapPreset, setMapPreset] = useState<MapPreset>(DEFAULT_PRESET);

  // ── Dice roller popup ──
  const { request: diceRequest, showRoll, reroll: rerollDice, dismiss: dismissDice } = useDiceRoller();

  // ── Stratagem panels ──
  const [p1StratOpen, setP1StratOpen] = useState(false);
  const [p2StratOpen, setP2StratOpen] = useState(false);

  // ── Interactive stratagem state ──
  const [activeStratagem, setActiveStratagem] = useState<{
    name: string;
    phase: string;
    description: string;
    step: "select_unit" | "select_target" | "active" | null;
    unitId: string | null;
    targetId: string | null;
    effect: string;
    player: "P1" | "P2";
  } | null>(null);

  // ── Necron Awakened Dynasty protocol ──
  const [necronProtocol, setNecronProtocol] = useState<string | null>(null);
  const [showNecronProtocolPicker, setShowNecronProtocolPicker] = useState(false);

  // ── Command ability used tracking ──
  const [commandAbilityUsed, setCommandAbilityUsed] = useState(false);

  // ── Battle-shock interactive ──
  const [battleShockQueue, setBattleShockQueue] = useState<string[]>([]);
  const [battleShockTested, setBattleShockTested] = useState<Set<string>>(new Set());
  const [battleShockResults, setBattleShockResults] = useState<Record<string, boolean>>({});

  // ── Undo history ──
  interface GameSnapshot {
    markers: UnitMarker[];
    p1Cp: number;
    p2Cp: number;
    p1Vp: number;
    p2Vp: number;
    movedThisTurn: string[];
    shotThisTurn: string[];
    chargedThisTurn: string[];
    foughtThisTurn: string[];
  }
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [undoToast, setUndoToast] = useState(false);

  // ── Faction rules ──
  const [p1FactionRules, setP1FactionRules] = useState<FactionRule[]>([]);
  const [p2FactionRules, setP2FactionRules] = useState<FactionRule[]>([]);
  const [p1FactionRulesOpen, setP1FactionRulesOpen] = useState(false);
  const [p2FactionRulesOpen, setP2FactionRulesOpen] = useState(false);
  // Oath of Moment target (Space Marines)
  const [oathTarget, setOathTarget] = useState<string | null>(null); // marker ID
  const [showOathPicker, setShowOathPicker] = useState(false);
  const [oathSelectionMode, setOathSelectionMode] = useState(false);
  // Synaptic Imperative choice (Tyranids)
  const [synapticImperative, setSynapticImperative] = useState<string | null>(null);
  const [showSynapticPicker, setShowSynapticPicker] = useState(false);
  // Psychic debuffs (cleared at end of phase)
  const [horrorTargetId, setHorrorTargetId] = useState<string | null>(null);   // The Horror: -1 to that unit's hit rolls
  const [aversionTargetId, setAversionTargetId] = useState<string | null>(null); // Aversion: -1 to hit rolls targeting this unit

  // ── Secondary objectives (Tactical Missions) ──
  const [p1Deck, setP1Deck] = useState<TacticalMission[]>([]);
  const [p2Deck, setP2Deck] = useState<TacticalMission[]>([]);
  const [p1Hand, setP1Hand] = useState<TacticalMission[]>([]);
  const [p2Hand, setP2Hand] = useState<TacticalMission[]>([]);
  const [p1Scored, setP1Scored] = useState<TacticalMission[]>([]);
  const [p2Scored, setP2Scored] = useState<TacticalMission[]>([]);
  const [p1SecondaryVp, setP1SecondaryVp] = useState(0);
  const [p2SecondaryVp, setP2SecondaryVp] = useState(0);
  const [tacticalMissionsOpen, setTacticalMissionsOpen] = useState(false);
  // Track which card IDs in hand have been revealed
  const [p1Revealed, setP1Revealed] = useState<Set<string>>(new Set());
  const [p2Revealed, setP2Revealed] = useState<Set<string>>(new Set());
  // Track units destroyed this turn/phase and units advanced this turn
  const [destroyedThisTurn, setDestroyedThisTurn] = useState<string[]>([]);
  const [destroyedThisPhase, setDestroyedThisPhase] = useState<string[]>([]);
  const [advancedThisTurn, setAdvancedThisTurn] = useState<string[]>([]);
  // Objective control at turn start (for Storm Hostile Objective)
  const [objControlAtTurnStart, setObjControlAtTurnStart] = useState<("P1" | "P2" | null)[]>([]);

  // ── Battle-shock ──
  const [battleShockPhase, setBattleShockPhase] = useState(false);

  // ── Multi-weapon shooting tracking (cleared on Done Shooting or phase advance) ──
  const [weaponsFiredThisShot, setWeaponsFiredThisShot] = useState<Set<number>>(new Set());

  // ── Fight phase tracking ──
  const [foughtThisPhase, setFoughtThisPhase] = useState<Set<string>>(new Set());
  const [fightBackMode, setFightBackMode] = useState(false);
  const [fightPhaseStep, setFightPhaseStep] = useState<'active' | 'fightback'>('active');

  // ── Combat animations ──
  const [activeAnimation, setActiveAnimation] = useState<AnimationEvent | null>(null);
  const pendingAnimationRef = useRef<(() => void) | null>(null);

  function handleAnimationComplete() {
    setActiveAnimation(null);
    if (pendingAnimationRef.current) {
      pendingAnimationRef.current();
      pendingAnimationRef.current = null;
    }
  }

  // ── Per-phase action tracking (one action per unit per phase) ──
  const [movedThisTurn, setMovedThisTurn] = useState<string[]>([]);
  const [shotThisTurn, setShotThisTurn] = useState<string[]>([]);
  const [chargedThisTurn, setChargedThisTurn] = useState<string[]>([]);
  const [foughtThisTurn, setFoughtThisTurn] = useState<string[]>([]);

  // ── Overwatch prompt (set BEFORE charge roll — defender decides first) ──
  const [overwatchPrompt, setOverwatchPrompt] = useState<{
    attackerId: string;
    targetId: string;
  } | null>(null);

  // ── Charge move (after successful 2D6 roll, player manually positions charger) ──
  const [chargeMove, setChargeMove] = useState<{
    unitId: string;
    targetId: string;
    maxDist: number;
  } | null>(null);

  // ── Advance roll (locked once rolled so it doesn't re-roll on every click) ──
  const [advanceRollResult, setAdvanceRollResult] = useState<number | null>(null);

  // ── Stacked unit picker (when multiple units share a cell) ──
  const [stackedPicker, setStackedPicker] = useState<{ unitIds: string[] } | null>(null);

  // ── Redo history (same shape as GameSnapshot) ──
  const [future, setFuture] = useState<GameSnapshot[]>([]);

  // ── Measurement line toggle ──
  const [showMeasurementLine, setShowMeasurementLine] = useState(false);

  // ── Reserves deployment ──
  const [reservesMode, setReservesMode] = useState<'idle' | 'place_normal' | 'place_deepstrike' | 'place_homer'>('idle');
  const [reservesUnitId, setReservesUnitId] = useState<string | null>(null);
  const [reservesError, setReservesError] = useState<string | null>(null);
  // forMarkerId links each homer to the unit it was placed for, so it can be removed on deploy
  const [teleportHomers, setTeleportHomers] = useState<{ id: string; x: number; y: number; placedBy: string; forMarkerId: string }[]>([]);
  // Set during deployment phase when a homer-eligible unit goes to reserves — must place homer before continuing
  const [pendingHomerForMarkerId, setPendingHomerForMarkerId] = useState<string | null>(null);

  // ── Turn order tracking ──
  const [firstPlayerThisRound, setFirstPlayerThisRound] = useState<"P1" | "P2">("P1");

  // ── Transport mechanics ──
  const [transportContents, setTransportContents] = useState<Record<string, string[]>>({});

  // ── Always-current state snapshot for the sync timer ──
  // We assign directly (not in useEffect) so it's updated synchronously before any setTimeout fires.
  const stateRef = useRef({
    markers, round, gamePhase, activePlayer,
    p1Cp, p2Cp, p1Vp, p2Vp, roomPhase, deployDeployer, rolloffResults,
    movedThisTurn, shotThisTurn, chargedThisTurn, foughtThisTurn,
    fightPhaseStep, oathTarget, synapticImperative, firstPlayerThisRound,
    transportContents, destroyedThisTurn, destroyedThisPhase,
    p1Deck, p2Deck, p1Hand, p2Hand, p1Scored, p2Scored,
    p1SecondaryVp, p2SecondaryVp,
    foughtThisPhase, battleShockPhase, battleShockQueue,
    battleShockTested, battleShockResults, teleportHomers,
  });
  stateRef.current = {
    markers, round, gamePhase, activePlayer,
    p1Cp, p2Cp, p1Vp, p2Vp, roomPhase, deployDeployer, rolloffResults,
    movedThisTurn, shotThisTurn, chargedThisTurn, foughtThisTurn,
    fightPhaseStep, oathTarget, synapticImperative, firstPlayerThisRound,
    transportContents, destroyedThisTurn, destroyedThisPhase,
    p1Deck, p2Deck, p1Hand, p2Hand, p1Scored, p2Scored,
    p1SecondaryVp, p2SecondaryVp,
    foughtThisPhase, battleShockPhase, battleShockQueue,
    battleShockTested, battleShockResults, teleportHomers,
  };

  function addLog(text: string, player?: "P1" | "P2" | "system") {
    setActLog((prev) => [...prev, { time: nowTime(), text, player }]);
    setTimeout(() => logRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 50);
  }

  function pushHistory() {
    setFuture([]);
    setHistory((prev) => {
      const snap = { markers, p1Cp, p2Cp, p1Vp, p2Vp, movedThisTurn, shotThisTurn, chargedThisTurn, foughtThisTurn };
      return [...prev, snap].slice(-20);
    });
    // Schedule a state sync so the other player receives this action
    scheduleSync();
  }

  function scheduleSync() {
    if (!id || isApplyingRemote.current) return;
    setIsSyncing(true);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const s = stateRef.current;
      // Broadcast to the other player via the realtime channel (fast path, 2player only)
      if (gameMode === "2player" && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "state_sync",
          payload: {
            markers: s.markers, round: s.round, gamePhase: s.gamePhase,
            activePlayer: s.activePlayer, p1Cp: s.p1Cp, p2Cp: s.p2Cp,
            p1Vp: s.p1Vp, p2Vp: s.p2Vp, roomPhase: s.roomPhase,
            deployDeployer: s.deployDeployer, rolloffResults: s.rolloffResults,
            movedThisTurn: s.movedThisTurn, shotThisTurn: s.shotThisTurn,
            chargedThisTurn: s.chargedThisTurn, foughtThisTurn: s.foughtThisTurn,
            fightPhaseStep: s.fightPhaseStep, oathTarget: s.oathTarget,
            synapticImperative: s.synapticImperative,
            firstPlayerThisRound: s.firstPlayerThisRound,
            transportContents: s.transportContents,
            destroyedThisTurn: s.destroyedThisTurn, destroyedThisPhase: s.destroyedThisPhase,
            p1Deck: s.p1Deck, p2Deck: s.p2Deck,
            p1Hand: s.p1Hand, p2Hand: s.p2Hand,
            p1Scored: s.p1Scored, p2Scored: s.p2Scored,
            p1SecondaryVp: s.p1SecondaryVp, p2SecondaryVp: s.p2SecondaryVp,
            foughtThisPhase: s.foughtThisPhase,
            battleShockPhase: s.battleShockPhase, battleShockQueue: s.battleShockQueue,
            battleShockTested: s.battleShockTested, battleShockResults: s.battleShockResults,
            teleportHomers: s.teleportHomers,
          },
        });
      }
      // Also persist to DB via the API route (works for both P1 and P2)
      if (gameCode) {
        try {
          await fetch(`/api/warhammer/games/${id}/state`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invite_code: gameCode,
              current_phase: s.roomPhase === "game" ? s.gamePhase : s.roomPhase,
              game_state: {
                markers: s.markers, round: s.round, gamePhase: s.gamePhase,
                activePlayer: s.activePlayer, p1Cp: s.p1Cp, p2Cp: s.p2Cp,
                p1Vp: s.p1Vp, p2Vp: s.p2Vp, roomPhase: s.roomPhase,
                deployDeployer: s.deployDeployer, rolloffResults: s.rolloffResults,
                movedThisTurn: s.movedThisTurn, shotThisTurn: s.shotThisTurn,
                chargedThisTurn: s.chargedThisTurn, foughtThisTurn: s.foughtThisTurn,
                fightPhaseStep: s.fightPhaseStep, oathTarget: s.oathTarget,
                synapticImperative: s.synapticImperative,
                firstPlayerThisRound: s.firstPlayerThisRound,
                transportContents: s.transportContents,
                destroyedThisTurn: s.destroyedThisTurn, destroyedThisPhase: s.destroyedThisPhase,
                p1Deck: s.p1Deck, p2Deck: s.p2Deck,
                p1Hand: s.p1Hand, p2Hand: s.p2Hand,
                p1Scored: s.p1Scored, p2Scored: s.p2Scored,
                p1SecondaryVp: s.p1SecondaryVp, p2SecondaryVp: s.p2SecondaryVp,
                foughtThisPhase: s.foughtThisPhase,
                battleShockPhase: s.battleShockPhase, battleShockQueue: s.battleShockQueue,
                battleShockTested: s.battleShockTested, battleShockResults: s.battleShockResults,
                teleportHomers: s.teleportHomers,
              },
            }),
          });
        } catch { /* non-critical — broadcast is the primary sync path */ }
      }
      setIsSyncing(false);
    }, 400);
  }

  function undoAction() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setFuture((f) => [...f, { markers, p1Cp, p2Cp, p1Vp, p2Vp, movedThisTurn, shotThisTurn, chargedThisTurn, foughtThisTurn }]);
    setHistory((prev) => prev.slice(0, -1));
    setMarkers(last.markers);
    setP1Cp(last.p1Cp);
    setP2Cp(last.p2Cp);
    setP1Vp(last.p1Vp);
    setP2Vp(last.p2Vp);
    setMovedThisTurn(last.movedThisTurn);
    setShotThisTurn(last.shotThisTurn);
    setChargedThisTurn(last.chargedThisTurn);
    setFoughtThisTurn(last.foughtThisTurn);
    setCombat(INIT_COMBAT);
    setMoveUnit(null);
    setChargeMove(null);
    setUndoToast(true);
    setTimeout(() => setUndoToast(false), 2000);
    addLog("↩ Action undone.", "system");
  }

  function redoAction() {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setHistory((h) => [...h, { markers, p1Cp, p2Cp, p1Vp, p2Vp, movedThisTurn, shotThisTurn, chargedThisTurn, foughtThisTurn }].slice(-20));
    setFuture((f) => f.slice(0, -1));
    setMarkers(next.markers);
    setP1Cp(next.p1Cp);
    setP2Cp(next.p2Cp);
    setP1Vp(next.p1Vp);
    setP2Vp(next.p2Vp);
    setMovedThisTurn(next.movedThisTurn);
    setShotThisTurn(next.shotThisTurn);
    setChargedThisTurn(next.chargedThisTurn);
    setFoughtThisTurn(next.foughtThisTurn);
    addLog("↪ Action redone.", "system");
  }

  function endFightBack() {
    setFightBackMode(false);
    setCombat(INIT_COMBAT);
    setSelectedMarkerId(null);
  }

  function doneShooting() {
    if (!combat.attackerId) return;
    const attackerId = combat.attackerId;
    const unit = markers.find((m) => m.id === attackerId);
    setMarkers((prev) => prev.map((m) => m.id === attackerId ? { ...m, hasShotThisTurn: true } : m));
    setShotThisTurn((prev) => [...prev, attackerId]);
    setWeaponsFiredThisShot(new Set());
    setCombat(INIT_COMBAT);
    setSelectedMarkerId(null);
    if (unit) addLog(`${unit.unitName} done shooting.`, unit.player);
  }

  // ── Load game from Supabase ──
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();

    async function loadGame() {
      const { data: game, error } = await supabase
        .from("warhammer_games")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !game) {
        setGameName("Game not found");
        setRoomPhase("loading");
        return;
      }

      setGameName(game.name ?? "Battle");
      const rawMode = game.game_mode as string;
      const rawGameState = game.game_state as Record<string, unknown> | null;
      const mode: "solo" | "2player" | "vs-ai" =
        rawMode === "solo" && rawGameState?.isVsAI === true ? "vs-ai" :
        rawMode === "solo" ? "solo" : "2player";
      setGameMode(mode);
      const isVsAI = mode === "vs-ai";
      if (isVsAI) setIsAIGame(true);

      // ── Determine local player role ──
      const code = (game.invite_code as string | null) ?? null;
      setGameCode(code);
      const storedP1 = (game.p1_user_id as string | null) ?? null;
      const storedP2 = (game.p2_user_id as string | null) ?? null;
      setP1UserId(storedP1);
      setP2UserId(storedP2);

      if (mode === "solo") {
        setLocalRole("P1"); // solo: player controls both sides
      } else {
        const sessionId = (() => {
          if (typeof window === "undefined") return null;
          let sid = localStorage.getItem("wh40k_session_id");
          if (!sid) { sid = crypto.randomUUID(); localStorage.setItem("wh40k_session_id", sid); }
          return sid;
        })();
        if (sessionId === storedP1) setLocalRole("P1");
        else if (storedP2 && sessionId === storedP2) setLocalRole("P2");
        else if (!storedP2) {
          // No P2 yet — claim the P2 seat
          setLocalRole("P2");
          const p2Id = sessionId!;
          setP2UserId(p2Id);
          // Register as P2 via API (invite_code as auth)
          if (code) {
            fetch(`/api/warhammer/games/${id}/state`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ invite_code: code, p2_user_id: p2Id }),
            }).catch(() => {});
          }
        } else {
          setLocalRole("spectator");
        }
      }

      const savedState = game.game_state as Record<string, unknown> | null;
      if (savedState) {
        if (typeof savedState.round === "number") setRound(savedState.round);
        // Only restore CP when mid-game (round>1 or past command phase) — avoids stale values on a fresh game
        const isPreGame = savedState.round === 1 && (savedState.gamePhase === "command" || !savedState.gamePhase);
        if (!isPreGame) {
          if (typeof savedState.p1Cp === "number") setP1Cp(savedState.p1Cp);
          if (typeof savedState.p2Cp === "number") setP2Cp(savedState.p2Cp);
        }
        if (typeof savedState.p1Vp === "number") setP1Vp(savedState.p1Vp);
        if (typeof savedState.p2Vp === "number") setP2Vp(savedState.p2Vp);
        if (savedState.rolloffResults) {
          setRolloffResults(savedState.rolloffResults as RolloffResult);
        }
        if (savedState.activePlayer) setActivePlayer(savedState.activePlayer as "P1" | "P2");
        if (savedState.gamePhase) {
          // "morale" removed in 10th ed refactor — treat as "fight" for old saves
          const saved = savedState.gamePhase as string;
          setGamePhase((saved === "morale" ? "fight" : saved) as GamePhase);
        }
        if (Array.isArray(savedState.markers) && savedState.markers.length > 0) {
          setMarkers(savedState.markers as UnitMarker[]);
        }
        if (savedState.deployment) {
          const dep = savedState.deployment as { currentDeployer?: "P1" | "P2" };
          if (dep.currentDeployer) setDeployDeployer(dep.currentDeployer);
        }
        if (typeof savedState.deployDeployer === "string") setDeployDeployer(savedState.deployDeployer as "P1" | "P2");
        if (typeof savedState.mapPresetId === "string") {
          setMapPreset(getPresetById(savedState.mapPresetId));
        }
        if (Array.isArray(savedState.movedThisTurn)) setMovedThisTurn(savedState.movedThisTurn as string[]);
        if (Array.isArray(savedState.shotThisTurn)) setShotThisTurn(savedState.shotThisTurn as string[]);
        if (Array.isArray(savedState.chargedThisTurn)) setChargedThisTurn(savedState.chargedThisTurn as string[]);
        if (Array.isArray(savedState.foughtThisTurn)) setFoughtThisTurn(savedState.foughtThisTurn as string[]);
        if (savedState.oathTarget !== undefined) setOathTarget(savedState.oathTarget as string | null);
        if (savedState.synapticImperative !== undefined) setSynapticImperative(savedState.synapticImperative as string | null);
        if (savedState.firstPlayerThisRound) setFirstPlayerThisRound(savedState.firstPlayerThisRound as "P1" | "P2");
        if (savedState.transportContents) setTransportContents(savedState.transportContents as Record<string, string[]>);
        if (Array.isArray(savedState.teleportHomers)) setTeleportHomers(savedState.teleportHomers as typeof teleportHomers);
        if (typeof savedState.fightPhaseStep === "string") setFightPhaseStep(savedState.fightPhaseStep as "active" | "fightback");
        if (typeof savedState.p1SecondaryVp === "number") setP1SecondaryVp(savedState.p1SecondaryVp);
        if (typeof savedState.p2SecondaryVp === "number") setP2SecondaryVp(savedState.p2SecondaryVp);
        if (Array.isArray(savedState.p1Hand)) setP1Hand(savedState.p1Hand as TacticalMission[]);
        if (Array.isArray(savedState.p2Hand)) setP2Hand(savedState.p2Hand as TacticalMission[]);
        if (Array.isArray(savedState.p1Scored)) setP1Scored(savedState.p1Scored as TacticalMission[]);
        if (Array.isArray(savedState.p2Scored)) setP2Scored(savedState.p2Scored as TacticalMission[]);
        if (Array.isArray(savedState.p1Deck)) setP1Deck(savedState.p1Deck as TacticalMission[]);
        if (Array.isArray(savedState.p2Deck)) setP2Deck(savedState.p2Deck as TacticalMission[]);
      }
      // Also check top-level map_preset column
      if (game.map_preset && typeof game.map_preset === "string") {
        setMapPreset(getPresetById(game.map_preset));
      }

      // Load army names
      const armyIds = [game.player1_army_id, game.player2_army_id].filter(Boolean);
      const armyMarkers: UnitMarker[] = [];

      if (armyIds.length > 0) {
        const { data: armies } = await supabase
          .from("warhammer_armies")
          .select("*")
          .in("id", armyIds);

        const a1 = (armies ?? []).find((a: ArmyRow) => a.id === game.player1_army_id);
        const a2 = (armies ?? []).find((a: ArmyRow) => a.id === game.player2_army_id);

        if (a1) {
          setP1ArmyName(`P1 · ${a1.faction}`);
          const p1Markers = buildMarkers(a1 as ArmyRow, "P1");
          armyMarkers.push(...p1Markers);
          setP1FactionRules(getFactionRules(a1.faction));
          addLog(`P1 army loaded: ${a1.name} (${p1Markers.length} units)`, "system");
        }
        if (a2) {
          setP2ArmyName(`P2 · ${a2.faction}`);
          const p2Markers = buildMarkers(a2 as ArmyRow, "P2");
          armyMarkers.push(...p2Markers);
          setP2FactionRules(getFactionRules(a2.faction));
          addLog(`P2 army loaded: ${a2.name} (${p2Markers.length} units)`, "system");
        } else if (isVsAI) {
          // Build the AI's default army from the chosen faction
          const aiFaction = (savedState?.aiArmyFaction as string | undefined) ?? "Space Marines";
          const spec = buildDefaultAIArmySpec(aiFaction);
          const aiRow: ArmyRow = {
            id: "ai-army",
            name: `AI — ${aiFaction}`,
            faction: aiFaction,
            subfaction: null,
            units: { entries: spec.entries },
          };
          const p2Markers = buildMarkers(aiRow, "P2");
          armyMarkers.push(...p2Markers);
          setP2ArmyName(`AI · ${aiFaction}`);
          setP2FactionRules(getFactionRules(aiFaction));
          addLog(`AI army built: ${aiFaction} (${p2Markers.length} units)`, "system");
        }
        // Initialize tactical mission decks
        setP1Deck(shuffleDeck());
        setP2Deck(shuffleDeck());
      }

      // Only overwrite markers from DB if no saved markers exist
      const hasSavedMarkers =
        savedState && Array.isArray(savedState.markers) && (savedState.markers as unknown[]).length > 0;
      if (!hasSavedMarkers && armyMarkers.length > 0) {
        setMarkers(armyMarkers);
      }

      // Determine room phase
      const currentPhase = (game.current_phase as string) ?? "rolloff";
      if (currentPhase === "rolloff") {
        setRoomPhase("rolloff");
      } else if (currentPhase === "deployment") {
        setRoomPhase("deployment");
      } else if (currentPhase === "finished") {
        setRoomPhase("finished");
      } else {
        setRoomPhase("game");
        setGamePhase((currentPhase as GamePhase) ?? "command");
      }
    }

    loadGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Supabase realtime for 2-player ──
  useEffect(() => {
    if (gameMode !== "2player" || !id) return;
    const supabase = createClient();
    const channel = supabase.channel(`game:${id}`, {
      config: { broadcast: { self: false } }, // don't receive own broadcasts
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "state_sync" }, (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = payload.payload as Record<string, any>;
        isApplyingRemote.current = true;
        if (s.markers) setMarkers(s.markers as UnitMarker[]);
        if (typeof s.round === "number") setRound(s.round);
        if (s.gamePhase) setGamePhase(s.gamePhase as GamePhase);
        if (s.activePlayer) setActivePlayer(s.activePlayer as "P1" | "P2");
        if (s.p1Cp !== undefined) setP1Cp(s.p1Cp as number);
        if (s.p2Cp !== undefined) setP2Cp(s.p2Cp as number);
        if (s.p1Vp !== undefined) setP1Vp(s.p1Vp as number);
        if (s.p2Vp !== undefined) setP2Vp(s.p2Vp as number);
        if (s.roomPhase) setRoomPhase(s.roomPhase as RoomPhase);
        if (s.deployDeployer) setDeployDeployer(s.deployDeployer as "P1" | "P2");
        if (s.rolloffResults) setRolloffResults(s.rolloffResults as RolloffResult);
        if (Array.isArray(s.movedThisTurn)) setMovedThisTurn(s.movedThisTurn as string[]);
        if (Array.isArray(s.shotThisTurn)) setShotThisTurn(s.shotThisTurn as string[]);
        if (Array.isArray(s.chargedThisTurn)) setChargedThisTurn(s.chargedThisTurn as string[]);
        if (Array.isArray(s.foughtThisTurn)) setFoughtThisTurn(s.foughtThisTurn as string[]);
        if (s.fightPhaseStep) setFightPhaseStep(s.fightPhaseStep as "active" | "fightback");
        if (s.oathTarget !== undefined) setOathTarget(s.oathTarget as string | null);
        if (s.synapticImperative !== undefined) setSynapticImperative(s.synapticImperative as string | null);
        if (s.firstPlayerThisRound) setFirstPlayerThisRound(s.firstPlayerThisRound as "P1" | "P2");
        if (s.transportContents) setTransportContents(s.transportContents as Record<string, string[]>);
        if (Array.isArray(s.teleportHomers)) setTeleportHomers(s.teleportHomers as typeof teleportHomers);
        if (typeof s.p1SecondaryVp === "number") setP1SecondaryVp(s.p1SecondaryVp);
        if (typeof s.p2SecondaryVp === "number") setP2SecondaryVp(s.p2SecondaryVp);
        if (Array.isArray(s.p1Hand)) setP1Hand(s.p1Hand as TacticalMission[]);
        if (Array.isArray(s.p2Hand)) setP2Hand(s.p2Hand as TacticalMission[]);
        if (Array.isArray(s.p1Scored)) setP1Scored(s.p1Scored as TacticalMission[]);
        if (Array.isArray(s.p2Scored)) setP2Scored(s.p2Scored as TacticalMission[]);
        if (typeof s.battleShockPhase === "boolean") setBattleShockPhase(s.battleShockPhase);
        if (Array.isArray(s.battleShockQueue)) setBattleShockQueue(s.battleShockQueue as string[]);
        if (s.battleShockResults) setBattleShockResults(s.battleShockResults as Record<string, boolean>);
        if (Array.isArray(s.destroyedThisTurn)) setDestroyedThisTurn(s.destroyedThisTurn as string[]);
        if (Array.isArray(s.destroyedThisPhase)) setDestroyedThisPhase(s.destroyedThisPhase as string[]);
        // Clear the flag after this synchronous batch of state updates
        setTimeout(() => { isApplyingRemote.current = false; }, 0);
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [gameMode, id]);

  // ── Persist state to Supabase ──
  const persistState = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!id) return;
      const supabase = createClient();
      await supabase
        .from("warhammer_games")
        .update(updates)
        .eq("id", id);
    },
    [id]
  );

  // ── Rolloff complete ──
  function handleRolloffComplete(results: RolloffResult) {
    setRolloffResults(results);
    const deployer = results.firstDeployer ?? "P1";
    setDeployDeployer(deployer);
    setActivePlayer(results.firstTurn ?? "P1");
    setRoomPhase("deployment");
    persistState({
      current_phase: "deployment",
      attacker: results.attacker,
      first_deployer: results.firstDeployer,
      game_state: {
        rolloffResults: results,
        round: 1,
        phase: "deployment",
        markers,
        p1Cp,
        p2Cp,
        p1Vp,
        p2Vp,
        activePlayer: results.firstTurn ?? "P1",
        deployment: { currentDeployer: deployer, p1UnitsPlaced: [], p2UnitsPlaced: [] },
      },
    });
    addLog(
      `Roll-offs complete: Attacker=${results.attacker}, First Deploy=${results.firstDeployer}, First Turn=${results.firstTurn}`,
      "system"
    );
    scheduleSync();
  }

  // ── Deployment ──
  const undeployedMarkers = markers.filter((m) => m.isInReserve && !m.isDestroyed && !m.isStrategicReserve);
  const undeployedP1 = undeployedMarkers.filter((m) => m.player === "P1");
  const undeployedP2 = undeployedMarkers.filter((m) => m.player === "P2");
  const deployAllDone = undeployedP1.length === 0 && undeployedP2.length === 0;

  function handleDeployCell(cellX: number, cellY: number) {
    if (roomPhase !== "deployment" || !deploySelectedId) return;
    const marker = markers.find((m) => m.id === deploySelectedId);
    if (!marker) return;

    const { p1Zone, p2Zone } = mapPreset;
    const inP1Zone =
      cellX >= p1Zone.x && cellX < p1Zone.x + p1Zone.w &&
      cellY >= p1Zone.y && cellY < p1Zone.y + p1Zone.h;
    const inP2Zone =
      cellX >= p2Zone.x && cellX < p2Zone.x + p2Zone.w &&
      cellY >= p2Zone.y && cellY < p2Zone.y + p2Zone.h;

    if (marker.player === "P1" && !inP1Zone) {
      addLog("P1 must deploy within their designated deployment zone.", "system");
      return;
    }
    if (marker.player === "P2" && !inP2Zone) {
      addLog("P2 must deploy within their designated deployment zone.", "system");
      return;
    }

    const occupied = markers.some(
      (m) => m.x === cellX && m.y === cellY && !m.isInReserve && !m.isDestroyed
    );
    if (occupied) {
      addLog("That cell is occupied.", "system");
      return;
    }

    // Place unit — and attached character one cell above (or below for P2)
    const charOffset = marker.player === "P1" ? -1 : 1;
    const charY = Math.max(0, Math.min(43, cellY + charOffset));
    const deployInCover = mapPreset.terrain.some((t) => cellX >= t.x && cellX < t.x + t.w && cellY >= t.y && cellY < t.y + t.h);
    const charInCoverDeploy = mapPreset.terrain.some((t) => cellX >= t.x && cellX < t.x + t.w && charY >= t.y && charY < t.y + t.h);

    // Compute clamped hex-pack positions for multi-model units
    let deployModelPositions: { x: number; y: number }[] | undefined;
    if ((marker.modelCount ?? 1) > 1) {
      const zone = marker.player === "P1" ? p1Zone : p2Zone;
      const rings = Math.ceil((marker.modelCount - 1) / 6);
      const radius = rings * 1.5;
      const cx = Math.max(zone.x + radius, Math.min(zone.x + zone.w - radius, cellX + 0.5));
      const cy = Math.max(zone.y + radius, Math.min(zone.y + zone.h - radius, cellY + 0.5));
      deployModelPositions = hexPackPositions(cx, cy, marker.modelCount).map((pos) => ({
        x: Math.max(zone.x, Math.min(zone.x + zone.w, pos.x)),
        y: Math.max(zone.y, Math.min(zone.y + zone.h, pos.y)),
      }));
    }

    let updatedMarkers = markers.map((m) => {
      if (m.id === deploySelectedId) return { ...m, x: cellX, y: cellY, isInReserve: false, inCover: deployInCover, modelPositions: deployModelPositions };
      if (marker.attachedCharacterId && m.id === marker.attachedCharacterId) {
        return { ...m, x: cellX, y: charY, isInReserve: false, inCover: charInCoverDeploy };
      }
      return m;
    });
    setMarkers(updatedMarkers);

    const deployed = marker.attachedCharacterName
      ? `${marker.unitName} + ${marker.attachedCharacterName}`
      : marker.unitName;
    addLog(`${marker.player} deployed ${deployed} at (${cellX}, ${cellY}).`, marker.player);
    setDeploySelectedId(null);

    // Alternate deployer
    const stillUndeployedP1 = updatedMarkers.filter((m) => m.player === "P1" && m.isInReserve && !m.isStrategicReserve).length;
    const stillUndeployedP2 = updatedMarkers.filter((m) => m.player === "P2" && m.isInReserve && !m.isStrategicReserve).length;

    if (stillUndeployedP1 === 0 && stillUndeployedP2 === 0) { scheduleSync(); return; }

    if (deployDeployer === "P1" && stillUndeployedP2 > 0) setDeployDeployer("P2");
    else if (deployDeployer === "P2" && stillUndeployedP1 > 0) setDeployDeployer("P1");
    else if (deployDeployer === "P1" && stillUndeployedP1 > 0) setDeployDeployer("P1");
    else setDeployDeployer("P2");
    scheduleSync();
  }

  function handleReserve(markerId: string) {
    const marker = markers.find((m) => m.id === markerId);
    if (!marker) return;
    const kw = (marker.keywords ?? []).map((k) => k.toUpperCase());
    const needsHomer = marker.teleportHomer || kw.includes("DEATHWING");
    addLog(
      `${marker.player} places ${marker.unitName} in Strategic Reserve.${needsHomer ? " Place Teleport Homer in your deployment zone." : ""}`,
      marker.player
    );
    setDeploySelectedId(null);

    const updatedMarkers = markers.map((m) =>
      m.id === markerId ? { ...m, isInReserve: true, isStrategicReserve: true } : m
    );
    setMarkers(updatedMarkers);

    if (needsHomer) {
      setPendingHomerForMarkerId(markerId);
      // Don't alternate deployer yet — wait until homer is placed
      return;
    }

    const stillP1 = updatedMarkers.filter((m) => m.player === "P1" && m.isInReserve && !m.isStrategicReserve).length;
    const stillP2 = updatedMarkers.filter((m) => m.player === "P2" && m.isInReserve && !m.isStrategicReserve).length;

    if (stillP1 === 0 && stillP2 === 0) return;
    if (deployDeployer === "P1") setDeployDeployer(stillP2 > 0 ? "P2" : "P1");
    else setDeployDeployer(stillP1 > 0 ? "P1" : "P2");
  }

  function startGame() {
    const firstPlayer = rolloffResults.firstTurn ?? "P1";
    const secondPlayer: "P1" | "P2" = firstPlayer === "P1" ? "P2" : "P1";
    setActivePlayer(firstPlayer);
    setFirstPlayerThisRound(firstPlayer);
    setRoomPhase("game");
    setGamePhase("command");
    persistState({ current_phase: "command", game_state: { markers, round: 1, gamePhase: "command", activePlayer: firstPlayer, firstPlayerThisRound: firstPlayer, p1Cp: 0, p2Cp: 0, p1Vp, p2Vp } });
    addLog(`Deployment complete. ${firstPlayer} goes first. Round 1 — Command Phase.`, "system");
    giveCommandPhaseCP(firstPlayer, markers);
    giveCommandPhaseCP(secondPlayer, markers);
    // Draw starting tactical mission for first player
    drawMission(firstPlayer);
    scheduleSync();
  }

  // ── Game phase logic ──

  // ── Tactical Mission draw ──
  function drawMission(player: "P1" | "P2") {
    if (player === "P1") {
      if (p1Hand.length >= 3) return;
      setP1Deck((deck) => {
        if (deck.length === 0) return deck;
        const [card, ...rest] = deck;
        setP1Hand((h) => [...h, card]);
        addLog(`P1 draws a Tactical Mission card (hand: ${p1Hand.length + 1}).`, "P1");
        return rest;
      });
    } else {
      if (p2Hand.length >= 3) return;
      setP2Deck((deck) => {
        if (deck.length === 0) return deck;
        const [card, ...rest] = deck;
        setP2Hand((h) => [...h, card]);
        addLog(`P2 draws a Tactical Mission card (hand: ${p2Hand.length + 1}).`, "P2");
        return rest;
      });
    }
  }

  // ── Score a tactical mission card ──
  function scoreMission(player: "P1" | "P2", card: TacticalMission) {
    const captureRadius = 3;
    const active = markers.filter((m) => !m.isDestroyed && !m.isInReserve && !m.isAttached && !m.isEmbarked);
    const objectiveControl = mapPreset.objectives.map((obj) => {
      const p1Near = active.filter(
        (m) =>
          m.player === "P1" &&
          !m.battleShocked &&
          Math.sqrt((m.x + 0.5 - obj.x) ** 2 + (m.y + 0.5 - obj.y) ** 2) <= captureRadius
      );
      const p2Near = active.filter(
        (m) =>
          m.player === "P2" &&
          !m.battleShocked &&
          Math.sqrt((m.x + 0.5 - obj.x) ** 2 + (m.y + 0.5 - obj.y) ** 2) <= captureRadius
      );
      if (p1Near.length > 0 && p2Near.length === 0) return "P1" as const;
      if (p2Near.length > 0 && p1Near.length === 0) return "P2" as const;
      if (p1Near.length > p2Near.length) return "P1" as const;
      if (p2Near.length > p1Near.length) return "P2" as const;
      return null;
    });

    const canScore = card.check({
      markers,
      player,
      opponent: player === "P1" ? "P2" : "P1",
      objectiveControl,
      mapWidth: 60,
      mapHeight: 44,
      unitsDestroyedThisTurn: destroyedThisTurn,
      unitsDestroyedThisPhase: destroyedThisPhase,
      objectiveControlAtTurnStart: objControlAtTurnStart,
      unitsAdvancedThisTurn: advancedThisTurn,
    });

    if (!canScore) {
      addLog(`Cannot score "${card.name}" — conditions not met.`, "system");
      return;
    }

    pushHistory();
    if (player === "P1") {
      setP1Hand((h) => h.filter((c) => c.id !== card.id));
      setP1Scored((s) => [...s, card]);
      setP1SecondaryVp((n) => n + card.vp);
      setP1Vp((n) => n + card.vp);
    } else {
      setP2Hand((h) => h.filter((c) => c.id !== card.id));
      setP2Scored((s) => [...s, card]);
      setP2SecondaryVp((n) => n + card.vp);
      setP2Vp((n) => n + card.vp);
    }
    addLog(`${player} scores "${card.name}" — +${card.vp} VP!`, player);
  }

  // ── Battle-shock resolution ──
  function resolveBattleShock(player: "P1" | "P2", currentMarkers: UnitMarker[]): UnitMarker[] {
    const friendlyActive = currentMarkers.filter(
      (m) => m.player === player && !m.isDestroyed && !m.isInReserve && !m.isAttached
    );

    let updatedMarkers = [...currentMarkers];

    for (const m of friendlyActive) {
      const belowHalf = m.currentWounds < m.maxWounds / 2;
      if (!belowHalf) {
        // Clear shock from previous turn if no longer below half
        updatedMarkers = updatedMarkers.map((mk) =>
          mk.id === m.id ? { ...mk, belowHalfStrength: false, battleShocked: false } : mk
        );
        continue;
      }

      // Check if within engagement range (1") of an enemy
      const engaged = currentMarkers.some(
        (em) =>
          em.player !== player &&
          !em.isDestroyed &&
          !em.isInReserve &&
          Math.sqrt((em.x - m.x) ** 2 + (em.y - m.y) ** 2) <= 1
      );
      if (engaged) {
        updatedMarkers = updatedMarkers.map((mk) =>
          mk.id === m.id ? { ...mk, belowHalfStrength: true } : mk
        );
        continue;
      }

      // Check Grim Resolve (Dark Angels): never battle-shock within 6" of another DA unit
      const isDA = m.faction?.toLowerCase().includes("dark angels");
      if (isDA) {
        const nearbyDA = currentMarkers.some(
          (ally) =>
            ally.id !== m.id &&
            ally.player === player &&
            !ally.isDestroyed &&
            !ally.isInReserve &&
            ally.faction?.toLowerCase().includes("dark angels") &&
            Math.sqrt((ally.x - m.x) ** 2 + (ally.y - m.y) ** 2) <= 6
        );
        if (nearbyDA) {
          addLog(`Grim Resolve: ${m.unitName} ignores Battle-shock (near Dark Angels ally).`, player);
          updatedMarkers = updatedMarkers.map((mk) =>
            mk.id === m.id ? { ...mk, belowHalfStrength: true, battleShocked: false } : mk
          );
          continue;
        }
      }

      // Check Shadow in the Warp (Tyranids): -1 Ld if within 12" of SYNAPSE
      const opponentFaction = player === "P1" ? "P2" : "P1";
      const synapseNearby = currentMarkers.some(
        (em) =>
          em.player === opponentFaction &&
          !em.isDestroyed &&
          !em.isInReserve &&
          em.faction?.toLowerCase().includes("tyranid") &&
          (em.unitId?.toLowerCase().includes("synapse") ||
            findUnit(em.faction, em.unitId)?.keywords?.some((k) => k.toLowerCase() === "synapse") ||
            ["tyr-swarmlord", "tyr-hive-tyrant", "tyr-neurotyrant", "tyr-broodlord", "tyr-tyranid-prime", "tyr-tyranid-warriors"].includes(em.unitId)) &&
          Math.sqrt((em.x - m.x) ** 2 + (em.y - m.y) ** 2) <= 12
      );

      const ldStr = m.stats.leadership;
      let ldNum = parseInt(ldStr) || 7;
      if (synapseNearby) {
        ldNum = Math.max(1, ldNum + 1); // -1 Ld penalty = raise the target by 1
        addLog(`Shadow in the Warp: ${m.unitName} takes -1 Ld penalty (within 12" of Synapse).`, "system");
      }

      const r1 = d6();
      const r2 = d6();
      const total = r1 + r2;
      // Shocked if 2D6 < Leadership value (rolling below LD = fail)
      const shocked = total < ldNum;

      addLog(
        `Battle-shock: ${m.unitName} below half-strength (${m.currentWounds}/${m.maxWounds}W) — 2D6 (${r1}+${r2}=${total}) vs Ld${ldNum}+ → ${shocked ? "SHOCKED!" : "holds."}`,
        player
      );

      updatedMarkers = updatedMarkers.map((mk) =>
        mk.id === m.id ? { ...mk, belowHalfStrength: true, battleShocked: shocked } : mk
      );
    }

    return updatedMarkers;
  }

  // 10th ed CP: +1 CP per Command Phase; +1 extra if Azrael leads a unit on the battlefield.
  function giveCommandPhaseCP(player: "P1" | "P2", currentMarkers: UnitMarker[]) {
    const hasAzrael = currentMarkers.some(
      (m) => m.player === player && !m.isInReserve && !m.isDestroyed && m.unitName === "Azrael"
    );
    const gain = hasAzrael ? 2 : 1;
    if (player === "P1") setP1Cp((n) => n + gain);
    else setP2Cp((n) => n + gain);
    const msg = hasAzrael
      ? `${player} gains 2 CP in Command Phase (Azrael +1 bonus).`
      : `${player} gains 1 CP in Command Phase.`;
    addLog(msg, player);
  }

  // 10th ed primary objectives: 5VP per objective controlled at end of scoring player's turn.
  // Capture radius = 3". If both players contest, more units wins; tie = no control.
  function scoreObjectivesForPlayer(player: "P1" | "P2", currentMarkers: UnitMarker[]) {
    const captureRadius = 3;
    const active = currentMarkers.filter((m) => !m.isDestroyed && !m.isInReserve && !m.isAttached);
    const controlledNums: number[] = [];
    let vp = 0;

    mapPreset.objectives.forEach((obj, idx) => {
      const p1Near = active.filter(
        (m) => m.player === "P1" &&
               !m.battleShocked &&
               Math.sqrt((m.x + 0.5 - obj.x) ** 2 + (m.y + 0.5 - obj.y) ** 2) <= captureRadius
      );
      const p2Near = active.filter(
        (m) => m.player === "P2" &&
               !m.battleShocked &&
               Math.sqrt((m.x + 0.5 - obj.x) ** 2 + (m.y + 0.5 - obj.y) ** 2) <= captureRadius
      );

      let controller: "P1" | "P2" | null = null;
      if (p1Near.length > 0 && p2Near.length === 0) controller = "P1";
      else if (p2Near.length > 0 && p1Near.length === 0) controller = "P2";
      else if (p1Near.length > p2Near.length) controller = "P1";
      else if (p2Near.length > p1Near.length) controller = "P2";

      if (controller === player) {
        vp += 5;
        controlledNums.push(idx + 1);
      }
    });

    if (vp > 0) {
      if (player === "P1") setP1Vp((n) => n + vp);
      else setP2Vp((n) => n + vp);
      addLog(
        `Scoring: ${player} controls obj ${controlledNums.join(", ")} — +${vp} VP (${controlledNums.length}×5).`,
        player
      );
    } else {
      addLog(`Scoring: ${player} controls no objectives this turn.`, "system");
    }
  }

  // Called after all battle-shock tests complete — finishes what advancePhase was doing
  function finishAfterBattleShock(afterShock: UnitMarker[]) {
    // Score objectives for the player who just finished their turn
    scoreObjectivesForPlayer(activePlayer, afterShock);

    // Behind Enemy Lines: 4 VP if 2+ units fully within enemy deployment zone at end of player's turn
    const enemyZone = activePlayer === "P1" ? mapPreset.p2Zone : mapPreset.p1Zone;
    const unitsInEnemyZone = afterShock.filter(
      (m) =>
        m.player === activePlayer &&
        !m.isDestroyed &&
        !m.isInReserve &&
        !m.isAttached &&
        m.x >= enemyZone.x && m.x < enemyZone.x + enemyZone.w &&
        m.y >= enemyZone.y && m.y < enemyZone.y + enemyZone.h
    );
    if (unitsInEnemyZone.length >= 2) {
      if (activePlayer === "P1") setP1Vp((n) => n + 4);
      else setP2Vp((n) => n + 4);
      addLog(
        `Behind Enemy Lines: ${activePlayer} scores 4 VP — ${unitsInEnemyZone.length} units in enemy deployment zone (${unitsInEnemyZone.map((m) => m.unitName).join(", ")}).`,
        activePlayer
      );
    }

    // Reanimation Protocols for Necrons
    const activeRules = activePlayer === "P1" ? p1FactionRules : p2FactionRules;
    if (activeRules.some((r) => r.id === "nec-reanimation-protocols")) {
      resolveReanimation(activePlayer, afterShock);
    }

    if (activePlayer === firstPlayerThisRound) {
      const secondPlayer: "P1" | "P2" = firstPlayerThisRound === "P1" ? "P2" : "P1";
      setActivePlayer(secondPlayer);
      setGamePhase("command");
      setDestroyedThisTurn([]);
      setDestroyedThisPhase([]);
      setAdvancedThisTurn([]);
      setNecronProtocol(null);
      setSynapticImperative(null);
      setOathTarget(null);
      setCommandAbilityUsed(false);
      // Clear first player's turn-scoped effects; reset second player's action flags
      setMarkers((prev) =>
        prev.map((m) =>
          m.player === firstPlayerThisRound
            ? { ...m, feelNoPain: undefined }
            : m.player === secondPlayer
            ? { ...m, hasAdvanced: false, hasCharged: false, hasFought: false, hasShotThisTurn: false }
            : m
        )
      );
      if (gameMode === "solo") setSoloSide(secondPlayer);
      addLog(`${firstPlayerThisRound}'s turn complete. Round ${round} — ${secondPlayer}'s Turn: Command Phase.`, "system");
      const secondPlayerHand = secondPlayer === "P2" ? p2Hand : p1Hand;
      if (secondPlayerHand.length < 3) drawMission(secondPlayer);
    } else {
      setGamePhase("scoring");
      setDestroyedThisTurn([]);
      setDestroyedThisPhase([]);
      setAdvancedThisTurn([]);
      setNecronProtocol(null);
      setSynapticImperative(null);
      setOathTarget(null);
      setCommandAbilityUsed(false);
      // Clear second player's turn-scoped effects
      setMarkers((prev) =>
        prev.map((m) => m.player === activePlayer ? { ...m, feelNoPain: undefined } : m)
      );
      addLog(`${activePlayer}'s turn complete. End of Round ${round} — click "End Round" to continue.`, "system");
    }
  }

  // 10th ed phase sequence per player: command → movement → shooting → charge → fight
  // After P1's fight: score P1's objectives → P2's command phase
  // After P2's fight: score P2's objectives → end-of-round scoring phase
  function advancePhase() {
    setSelectedMarkerId(null);
    setCombat(INIT_COMBAT);
    setMoveUnit(null);
    setReservesMode('idle');
    setReservesUnitId(null);
    // Clear phase-scoped psychic debuffs
    setHorrorTargetId(null);
    setAversionTargetId(null);
    if (gamePhase === "fight") {
      setFoughtThisPhase(new Set());
      setFightBackMode(false);
      setFightPhaseStep('active');
      setFoughtThisTurn([]);
    }
    if (gamePhase === "movement") setMovedThisTurn([]);
    if (gamePhase === "shooting") { setShotThisTurn([]); setWeaponsFiredThisShot(new Set()); }
    if (gamePhase === "charge") setChargedThisTurn([]);

    if (gamePhase === "fight") {
      // Check which units need battle-shock tests
      const friendlyActive = markers.filter(
        (m) => m.player === activePlayer && !m.isDestroyed && !m.isInReserve && !m.isAttached
          && m.currentWounds < m.maxWounds / 2
      );
      const needsTest = friendlyActive.filter((m) => {
        const isDA = m.faction?.toLowerCase().includes("dark angels");
        if (isDA) {
          const nearDA = markers.some((ally) =>
            ally.id !== m.id && ally.player === activePlayer && !ally.isDestroyed && !ally.isInReserve
            && ally.faction?.toLowerCase().includes("dark angels")
            && Math.sqrt((ally.x - m.x) ** 2 + (ally.y - m.y) ** 2) <= 6
          );
          if (nearDA) return false;
        }
        const engaged = markers.some(
          (em) => em.player !== activePlayer && !em.isDestroyed && !em.isInReserve
            && Math.sqrt((em.x - m.x) ** 2 + (em.y - m.y) ** 2) <= 1
        );
        return !engaged;
      });

      if (needsTest.length > 0) {
        // Interactive battle-shock — show modal
        setBattleShockPhase(true);
        setBattleShockQueue(needsTest.map((m) => m.id));
        setBattleShockTested(new Set());
        setBattleShockResults({});
        return; // finishAfterBattleShock called when all tests done
      }

      // No tests needed — run silently
      const afterShock = resolveBattleShock(activePlayer, markers);
      setMarkers(afterShock);
      finishAfterBattleShock(afterShock);
      return;
    }

    // Reset phase tracking
    setDestroyedThisPhase([]);

    if (gamePhase === "command") {
      // Snapshot objective control at turn start (for Storm Hostile Objective mission)
      const captureR = 3;
      const activeMkrs = markers.filter((m) => !m.isDestroyed && !m.isInReserve && !m.isAttached);
      const snap = mapPreset.objectives.map((obj) => {
        const p1n = activeMkrs.filter((m) => m.player === "P1" && !m.battleShocked && Math.sqrt((m.x + 0.5 - obj.x) ** 2 + (m.y + 0.5 - obj.y) ** 2) <= captureR);
        const p2n = activeMkrs.filter((m) => m.player === "P2" && !m.battleShocked && Math.sqrt((m.x + 0.5 - obj.x) ** 2 + (m.y + 0.5 - obj.y) ** 2) <= captureR);
        if (p1n.length > 0 && p2n.length === 0) return "P1" as const;
        if (p2n.length > 0 && p1n.length === 0) return "P2" as const;
        if (p1n.length > p2n.length) return "P1" as const;
        if (p2n.length > p1n.length) return "P2" as const;
        return null;
      });
      setObjControlAtTurnStart(snap);
    }

    const idx = PLAYER_PHASES.indexOf(gamePhase);
    if (idx >= 0 && idx < PLAYER_PHASES.length - 1) {
      const next = PLAYER_PHASES[idx + 1];
      setGamePhase(next);
      addLog(`→ ${activePlayer}'s ${PHASE_LABELS[next]} Phase`, "system");
    }
  }

  // ── Reanimation Protocols (Necrons) ──
  function resolveReanimation(player: "P1" | "P2", currentMarkers: UnitMarker[]) {
    let updatedMarkers = [...currentMarkers];
    let anyHealed = false;

    const necronMarkers = currentMarkers.filter(
      (m) =>
        m.player === player &&
        !m.isDestroyed &&
        !m.isInReserve &&
        m.faction?.toLowerCase().includes("necron") &&
        m.currentWounds < m.maxWounds
    );

    for (const m of necronMarkers) {
      const woundsLost = m.maxWounds - m.currentWounds;
      const rolls = Array.from({ length: woundsLost }, () => d6());
      const healed = rolls.filter((r) => r >= 5).length;
      if (healed > 0) {
        const newWounds = Math.min(m.maxWounds, m.currentWounds + healed);
        updatedMarkers = updatedMarkers.map((mk) =>
          mk.id === m.id ? { ...mk, currentWounds: newWounds } : mk
        );
        addLog(
          `Reanimation Protocols: ${m.unitName} rolls ${rolls.join(",")} — ${healed} wound(s) restored!`,
          player
        );
        anyHealed = true;
      }
    }

    if (!anyHealed && necronMarkers.length > 0) {
      addLog(`Reanimation Protocols: no wounds restored this phase.`, "system");
    }

    setMarkers(updatedMarkers);
  }

  function endRound() {
    if (round >= 5) {
      const winner = p1Vp > p2Vp ? "P1" : p2Vp > p1Vp ? "P2" : "Draw";
      setRoomPhase("finished");
      addLog(
        `Battle ends! Final score — P1: ${p1Vp}VP (${p1SecondaryVp} secondary), P2: ${p2Vp}VP (${p2SecondaryVp} secondary). ${winner === "Draw" ? "It's a draw!" : `${winner} wins!`}`,
        "system"
      );
      persistState({ current_phase: "finished" });
      return;
    }
    const nextRound = round + 1;
    // Alternate who goes first each round
    const newFirstPlayer: "P1" | "P2" = firstPlayerThisRound === "P1" ? "P2" : "P1";
    setFirstPlayerThisRound(newFirstPlayer);
    setRound(nextRound);
    setActivePlayer(newFirstPlayer);
    setGamePhase("command");
    setDestroyedThisTurn([]);
    setDestroyedThisPhase([]);
    setAdvancedThisTurn([]);
    // Reset all unit action flags and battle-shock for the new round
    setMarkers((prev) =>
      prev.map((m) => ({
        ...m,
        hasAdvanced: false,
        hasCharged: false,
        hasFought: false,
        hasShotThisTurn: false,
        battleShocked: false,
      }))
    );
    setSelectedMarkerId(null);
    setCombat(INIT_COMBAT);
    setMoveUnit(null);
    setFightBackMode(false);
    setFightPhaseStep('active');
    setMovedThisTurn([]);
    setShotThisTurn([]);
    setChargedThisTurn([]);
    setFoughtThisTurn([]);
    if (gameMode === "solo") setSoloSide(newFirstPlayer);
    addLog(`Round ${nextRound} begins. ${newFirstPlayer}'s Turn — Command Phase.`, "system");
    const newSecondPlayer: "P1" | "P2" = newFirstPlayer === "P1" ? "P2" : "P1";
    giveCommandPhaseCP(newFirstPlayer, markers);
    giveCommandPhaseCP(newSecondPlayer, markers);
    setCommandAbilityUsed(false);
    setOathTarget(null);
    setNecronProtocol(null);
    setSynapticImperative(null);
    const newFirstPlayerHand = newFirstPlayer === "P1" ? p1Hand : p2Hand;
    if (newFirstPlayerHand.length < 3) drawMission(newFirstPlayer);
    scheduleSync();
  }

  // ── Transport: embark / disembark ──
  function handleEmbark(infantryId: string, transportId: string) {
    const infantry = markers.find((m) => m.id === infantryId);
    const transport = markers.find((m) => m.id === transportId);
    if (!infantry || !transport) return;

    const capacity = getTransportCapacity(transport);
    const currentLoad = (transportContents[transportId] ?? []).length;
    if (currentLoad >= capacity) {
      addLog(`${transport.unitName} is full (capacity: ${capacity}).`, "system");
      return;
    }

    const dist = Math.sqrt((infantry.x - transport.x) ** 2 + (infantry.y - transport.y) ** 2);
    if (dist > 3) {
      addLog(`${infantry.unitName} is ${dist.toFixed(1)}" from ${transport.unitName} — must be within 3" to embark.`, "system");
      return;
    }

    if (movedThisTurn.includes(infantryId)) {
      addLog(`${infantry.unitName} has already moved this phase — cannot embark.`, "system");
      return;
    }

    pushHistory();
    setTransportContents((prev) => ({
      ...prev,
      [transportId]: [...(prev[transportId] ?? []), infantryId],
    }));
    setMarkers((prev) =>
      prev.map((m) =>
        m.id === infantryId ? { ...m, isEmbarked: true, embarkTransportId: transportId } : m
      )
    );
    setMovedThisTurn((prev) => [...prev, infantryId]);
    addLog(`${infantry.unitName} embarks onto ${transport.unitName}.`, infantry.player);
  }

  function handleDisembark(infantryId: string, transportId: string) {
    const infantry = markers.find((m) => m.id === infantryId);
    const transport = markers.find((m) => m.id === transportId);
    if (!infantry || !transport) return;

    const transportHasMoved = movedThisTurn.includes(transportId);
    pushHistory();
    setTransportContents((prev) => ({
      ...prev,
      [transportId]: (prev[transportId] ?? []).filter((id) => id !== infantryId),
    }));
    setMarkers((prev) =>
      prev.map((m) => {
        if (m.id !== infantryId) return m;
        // Place the unit adjacent to the transport; offset slightly so they don't stack
        const dx = transport.player === "P1" ? 0 : 0;
        const dy = transport.player === "P1" ? 1 : -1;
        return {
          ...m,
          isEmbarked: false,
          embarkTransportId: undefined,
          x: Math.max(0, Math.min(59, transport.x + dx)),
          y: Math.max(0, Math.min(43, transport.y + dy)),
          hasCharged: transportHasMoved ? true : m.hasCharged,
        };
      })
    );
    if (transportHasMoved) {
      addLog(`${infantry.unitName} disembarks from ${transport.unitName} — cannot charge this turn (transport moved).`, infantry.player);
    } else {
      addLog(`${infantry.unitName} disembarks from ${transport.unitName}.`, infantry.player);
    }
  }

  function handleTransportDestroyed(transportId: string) {
    const transport = markers.find((m) => m.id === transportId);
    if (!transport) return;
    const embarked = transportContents[transportId] ?? [];
    if (embarked.length === 0) return;

    let updatedMarkers = [...markers];
    for (const uid of embarked) {
      const unit = updatedMarkers.find((m) => m.id === uid);
      if (!unit) continue;
      const mortalWounds = Math.floor(Math.random() * 3) + 1;
      const newW = Math.max(0, unit.currentWounds - mortalWounds);
      addLog(
        `${unit.unitName} takes ${mortalWounds} mortal wound(s) escaping the destroyed ${transport.unitName}! (${newW}W remaining)`,
        unit.player
      );
      updatedMarkers = updatedMarkers.map((m) =>
        m.id === uid
          ? {
              ...m,
              isEmbarked: false,
              embarkTransportId: undefined,
              x: Math.max(0, Math.min(59, transport.x)),
              y: Math.max(0, Math.min(43, transport.y + 1)),
              currentWounds: newW,
              isDestroyed: newW <= 0,
            }
          : m
      );
    }
    setMarkers(updatedMarkers);
    setTransportContents((prev) => {
      const next = { ...prev };
      delete next[transportId];
      return next;
    });
  }

  // ── Reserves deployment ──
  function handleReservesDeploy(x: number, y: number) {
    if (!reservesUnitId) return;
    const marker = markers.find((m) => m.id === reservesUnitId);
    if (!marker) return;

    const activeMarkers = markers.filter((m) => !m.isDestroyed && !m.isInReserve);
    const occupied = markers.some(
      (m) => m.x === x && m.y === y && !m.isInReserve && !m.isDestroyed
    );
    if (occupied) { addLog("That cell is occupied.", "system"); return; }

    if (reservesMode === 'place_homer') {
      // Homer arrival: must be within 6" of this unit's homer and 3"+ from all enemies
      const homer = teleportHomers.find((h) => h.forMarkerId === reservesUnitId);
      if (!homer) { addLog("No Teleport Homer found for this unit.", "system"); return; }
      const distToHomer = Math.sqrt((x + 0.5 - homer.x) ** 2 + (y + 0.5 - homer.y) ** 2);
      if (distToHomer > 6) {
        addLog(`Must arrive within 6" of the Teleport Homer (${distToHomer.toFixed(1)}" away).`, "system");
        return;
      }
      const enemies = activeMarkers.filter((m) => m.player !== marker.player);
      const tooClose = enemies.some((e) => Math.sqrt((x - e.x) ** 2 + (y - e.y) ** 2) < 3);
      if (tooClose) {
        addLog("Homer arrival must be more than 3\" from all enemy models.", "system");
        return;
      }
    } else if (reservesMode === 'place_deepstrike') {
      // Deep strike: must be 9"+ from all enemy units
      const enemies = activeMarkers.filter((m) => m.player !== marker.player);
      const tooClose = enemies.some((e) => Math.sqrt((x - e.x) ** 2 + (y - e.y) ** 2) < 9);
      if (tooClose) {
        const msg = 'Must place more than 9" from all enemies!';
        addLog("Deep Strike must be placed more than 9\" from all enemy models.", "system");
        setReservesError(msg);
        setTimeout(() => setReservesError(null), 2500);
        return;
      }
    } else {
      // Normal reserve: must be within 6" of player's board edge
      let nearEdge: boolean;
      if (mapPreset.deploymentType === 'dawn_of_war') {
        // Deploy from left/right board edges
        const zone = marker.player === "P1" ? mapPreset.p1Zone : mapPreset.p2Zone;
        if (marker.player === "P1") {
          nearEdge = x < zone.x + zone.w + 6;
        } else {
          nearEdge = x >= zone.x - 6;
        }
      } else {
        // Standard/Crucible/Sweeping: P1 arrives from bottom edge, P2 from top edge
        if (marker.player === "P1") {
          nearEdge = y >= BOARD_H_CONST - 6; // y >= 38
        } else {
          nearEdge = y < 6; // y <= 5
        }
      }
      if (!nearEdge) {
        const msg = 'Must place within 6" of your board edge!';
        addLog(`Reserves must arrive within 6" of your board edge.`, "system");
        setReservesError(msg);
        setTimeout(() => setReservesError(null), 2500);
        return;
      }
    }

    pushHistory();
    // Auto-disembark any units inside a Drop Pod on landing
    const isDP = isDropPod(marker);
    const embarkedInThis = transportContents[marker.id] ?? [];
    const reserveInCover = mapPreset.terrain.some((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
    setMarkers((prev) =>
      prev.map((m) => {
        if (m.id === reservesUnitId) return { ...m, x, y, isInReserve: false, inCover: reserveInCover };
        if (marker.attachedCharacterId && m.id === marker.attachedCharacterId) {
          const dy2 = marker.player === "P1" ? -1 : 1;
          const cy = Math.max(0, Math.min(43, y + dy2));
          const charInCover = mapPreset.terrain.some((t) => x >= t.x && x < t.x + t.w && cy >= t.y && cy < t.y + t.h);
          return { ...m, x, y: cy, isInReserve: false, inCover: charInCover };
        }
        if (isDP && embarkedInThis.includes(m.id)) {
          const idx = embarkedInThis.indexOf(m.id);
          const dx2 = Math.max(0, Math.min(59, x + (idx % 2 === 0 ? 1 : -1)));
          const dy3 = Math.max(0, Math.min(43, y + Math.floor(idx / 2)));
          return {
            ...m,
            isEmbarked: false,
            embarkTransportId: undefined,
            isInReserve: false,
            x: dx2,
            y: dy3,
            inCover: mapPreset.terrain.some((t) => dx2 >= t.x && dx2 < t.x + t.w && dy3 >= t.y && dy3 < t.y + t.h),
          };
        }
        return m;
      })
    );
    if (isDP && embarkedInThis.length > 0) {
      setTransportContents((prev) => { const next = { ...prev }; delete next[marker.id]; return next; });
      addLog(`Drop Pod lands at (${x}, ${y}) — ${embarkedInThis.length} unit(s) disembark immediately!`, marker.player);
    } else {
      const modeLabel = reservesMode === 'place_deepstrike' ? ' (Deep Strike)' : reservesMode === 'place_homer' ? ' (Homer Arrival)' : '';
      addLog(`${marker.player} deployed ${marker.unitName} from reserves at (${x}, ${y})${modeLabel}.`, marker.player);
    }
    // Remove homer linked to this unit
    if (reservesMode === 'place_homer' || teleportHomers.some((h) => h.forMarkerId === reservesUnitId)) {
      setTeleportHomers((prev) => prev.filter((h) => h.forMarkerId !== reservesUnitId));
    }
    setMovedThisTurn((prev) => [...prev, marker.id]); // Unit can't move again after arriving from reserves
    setReservesMode('idle');
    setReservesUnitId(null);
    setSelectedMarkerId(null);
  }

  // ── Cell click handler (context-sensitive) ──
  function handleCellClick(x: number, y: number) {
    if (roomPhase === "deployment") {
      // Homer placement must happen before any other deployment action
      if (pendingHomerForMarkerId) {
        const unit = markers.find((m) => m.id === pendingHomerForMarkerId);
        if (!unit) { setPendingHomerForMarkerId(null); return; }
        const { p1Zone, p2Zone } = mapPreset;
        const zone = unit.player === "P1" ? p1Zone : p2Zone;
        const inZone = x >= zone.x && x < zone.x + zone.w && y >= zone.y && y < zone.y + zone.h;
        if (!inZone) {
          addLog("Teleport Homer must be placed in your deployment zone.", "system");
          return;
        }
        const homerId = `homer-${pendingHomerForMarkerId}-${Date.now()}`;
        setTeleportHomers((prev) => [...prev, { id: homerId, x: x + 0.5, y: y + 0.5, placedBy: unit.player, forMarkerId: pendingHomerForMarkerId }]);
        addLog(`📡 ${unit.player} placed Teleport Homer for ${unit.unitName} at (${x}, ${y}).`, unit.player);
        setPendingHomerForMarkerId(null);
        // Now alternate the deployer
        const updatedMarkers = markers; // already updated by handleReserve
        const stillP1 = updatedMarkers.filter((m) => m.player === "P1" && m.isInReserve).length;
        const stillP2 = updatedMarkers.filter((m) => m.player === "P2" && m.isInReserve).length;
        if (stillP1 === 0 && stillP2 === 0) return;
        if (deployDeployer === "P1") setDeployDeployer(stillP2 > 0 ? "P2" : "P1");
        else setDeployDeployer(stillP1 > 0 ? "P1" : "P2");
        return;
      }
      handleDeployCell(x, y);
      return;
    }
    if (roomPhase !== "game") return;

    if (gamePhase === "movement" && (reservesMode === 'place_normal' || reservesMode === 'place_deepstrike' || reservesMode === 'place_homer')) {
      handleReservesDeploy(x, y);
      return;
    }

    if (gamePhase === "movement" && moveUnit) {
      const marker = markers.find((m) => m.id === moveUnit);
      if (!marker) return;
      const moveIn = parseStat(marker.stats.movement);
      // advanceRollResult is locked when "Advance" is checked; never re-roll on each cell click
      const maxRange = moveAdvance ? moveIn + (advanceRollResult ?? 0) : moveIn;
      const dist = Math.sqrt((x - marker.x) ** 2 + (y - marker.y) ** 2);
      if (dist > maxRange) {
        addLog(`Too far (${dist.toFixed(1)}" vs max ${maxRange}").`, "system");
        return;
      }
      const occupied = markers.some((m) => m.id !== moveUnit && m.x === x && m.y === y && !m.isDestroyed && !m.isInReserve);
      if (occupied) { addLog("Cell occupied.", "system"); return; }
      pushHistory();
      const oldX = marker.x;
      const oldY = marker.y;
      const dx = x - oldX;
      const dy = y - oldY;
      const newInCover = mapPreset.terrain.some((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
      setMarkers((prev) =>
        prev.map((m) => {
          if (m.id === moveUnit) {
            const newModelPositions = m.modelPositions?.map((pos) => ({ x: pos.x + dx, y: pos.y + dy }));
            return { ...m, x, y, hasAdvanced: moveAdvance, inCover: newInCover, modelPositions: newModelPositions };
          }
          if (marker.attachedCharacterId && m.id === marker.attachedCharacterId) {
            const nx = Math.max(0, Math.min(59, m.x + dx));
            const ny = Math.max(0, Math.min(43, m.y + dy));
            const charInCover = mapPreset.terrain.some((t) => nx >= t.x && nx < t.x + t.w && ny >= t.y && ny < t.y + t.h);
            const newCharModelPositions = m.modelPositions?.map((pos) => ({ x: pos.x + dx, y: pos.y + dy }));
            return { ...m, x: nx, y: ny, hasAdvanced: moveAdvance, inCover: charInCover, modelPositions: newCharModelPositions };
          }
          return m;
        })
      );
      if (moveAdvance) {
        setAdvancedThisTurn((prev) => [...prev, moveUnit]);
      }
      setMovedThisTurn((prev) => [...prev, moveUnit]);
      addLog(`${marker.player} moved ${marker.unitName} to (${x}, ${y})${moveAdvance ? " (Advanced)" : ""}${newInCover ? " [in cover]" : ""}.`, marker.player);
      setMoveUnit(null);
      setMoveAdvance(false);
      setAdvanceRollResult(null);
    }

    // ── Charge move placement (after successful 2D6 roll, player clicks destination) ──
    if (gamePhase === "charge" && chargeMove) {
      const attacker = markers.find((m) => m.id === chargeMove.unitId);
      const target = markers.find((m) => m.id === chargeMove.targetId);
      if (!attacker || !target) return;

      const dist = Math.sqrt((x - attacker.x) ** 2 + (y - attacker.y) ** 2);
      if (dist > chargeMove.maxDist) {
        addLog(`Too far — ${dist.toFixed(1)}" exceeds charge roll of ${chargeMove.maxDist}".`, "system");
        return;
      }
      const distToTarget = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
      if (distToTarget > 2) {
        addLog(`Charge move must end within engagement range (1") of ${target.unitName}.`, "system");
        return;
      }
      if (x === attacker.x && y === attacker.y) return; // no-op

      pushHistory();
      const charId = attacker.attachedCharacterId;
      const dx = x - attacker.x;
      const dy = y - attacker.y;
      const chargeInCover = mapPreset.terrain.some((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
      setMarkers((prev) =>
        prev.map((m) => {
          if (m.id === chargeMove.unitId) {
            const newModelPositions = m.modelPositions?.map((pos) => ({ x: pos.x + dx, y: pos.y + dy }));
            return { ...m, x, y, hasCharged: true, inCover: chargeInCover, modelPositions: newModelPositions };
          }
          if (charId && m.id === charId) {
            const nx = Math.max(0, Math.min(59, m.x + dx));
            const ny = Math.max(0, Math.min(43, m.y + dy));
            const newCharModelPositions = m.modelPositions?.map((pos) => ({ x: pos.x + dx, y: pos.y + dy }));
            return { ...m, x: nx, y: ny, inCover: mapPreset.terrain.some((t) => nx >= t.x && nx < t.x + t.w && ny >= t.y && ny < t.y + t.h), modelPositions: newCharModelPositions };
          }
          return m;
        })
      );
      addLog(`Charge succeeds! ${attacker.unitName} moves to (${x}, ${y}) — adjacent to ${target.unitName}.`, attacker.player);
      setChargedThisTurn((prev) => [...prev, chargeMove.unitId]);
      setChargeMove(null);
      setCombat(INIT_COMBAT);
      setSelectedMarkerId(null);
      return;
    }
  }

  // ── Unit click handler (context-sensitive) ──
  function handleUnitClick(markerId: string) {
    if (activeAnimation) return;
    const m = markers.find((mk) => mk.id === markerId);
    if (!m) return;
    if (m.isInReserve) return; // in-reserve units are not interactive during normal gameplay

    // Oath of Moment board-click targeting: if selection mode is active, designate enemy unit
    if (oathSelectionMode) {
      const activeSide = isAIGame ? "P1" : gameMode === "solo" ? soloSide : activePlayer;
      if (m.player !== activeSide) {
        setOathTarget(markerId);
        setOathSelectionMode(false);
        setCommandAbilityUsed(true);
        addLog(`Oath of Moment: ${m.unitName} designated as target. All attacks against it may reroll 1s to hit.`, activePlayer);
      }
      return;
    }

    // If a stacked-picker is already open and the user clicked one of its listed units, proceed normally
    if (stackedPicker) {
      setStackedPicker(null);
      // Fall through to normal handling with the chosen markerId
    } else {
      // Detect other non-destroyed, non-reserve units sharing the same cell
      const sameCell = markers.filter(
        (mk) => mk.id !== markerId && !mk.isDestroyed && !mk.isInReserve && mk.x === m.x && mk.y === m.y
      );
      if (sameCell.length > 0) {
        setStackedPicker({ unitIds: [markerId, ...sameCell.map((mk) => mk.id)] });
        return; // show picker first; user will click their choice
      }
    }

    if (roomPhase === "game") {
      if (gamePhase === "movement") {
        const activeSide = isAIGame ? "P1" : gameMode === "solo" ? soloSide : activePlayer;
        if (m.player !== activeSide) return;
        // Attached characters move with their parent unit — redirect click to parent
        const effectiveId = m.isAttached && m.attachedToMarkerId ? m.attachedToMarkerId : markerId;
        if (movedThisTurn.includes(effectiveId)) {
          addLog(`${m.unitName} has already moved this phase.`, "system");
          return;
        }
        setMoveUnit((prev) => (prev === effectiveId ? null : effectiveId));
        setSelectedMarkerId(effectiveId);
        return;
      }
      if (gamePhase === "shooting") {
        if (combat.step === "idle" || combat.step === "selectAttacker") {
          const activeSide = isAIGame ? "P1" : gameMode === "solo" ? soloSide : activePlayer;
          if (m.player !== activeSide) return;
          if (shotThisTurn.includes(markerId)) {
            addLog(`${m.unitName} has already shot this phase.`, "system");
            return;
          }
          setCombat({ ...INIT_COMBAT, step: "selectWeapon", attackerId: markerId });
          setSelectedMarkerId(markerId);
          return;
        }
        if (combat.step === "selectTarget") {
          const attacker = markers.find((mk) => mk.id === combat.attackerId);
          if (!attacker || m.player === attacker.player) return;

          // Range validation
          if (combat.weaponIdx !== null) {
            const weapon = attacker.weapons[combat.weaponIdx];
            if (weapon?.range) {
              const rangeIn = parseStat(weapon.range);
              if (rangeIn > 0) {
                const aPos = markerPos(attacker);
                const tPos = markerPos(m);
                const dist = Math.sqrt((aPos.x - tPos.x) ** 2 + (aPos.y - tPos.y) ** 2);
                if (dist > rangeIn) {
                  addLog(
                    `Target out of range (${dist.toFixed(1)}" away, weapon range ${rangeIn}").`,
                    "system"
                  );
                  return;
                }
              }
            }
          }

          // LOS validation — terrain blocks if line passes through it and target is NOT inside
          const targetInside = (t: { x: number; y: number; w: number; h: number }) =>
            m.x >= t.x && m.x < t.x + t.w && m.y >= t.y && m.y < t.y + t.h;

          const losBlocked = mapPreset.terrain.some((t) => {
            if (!lineIntersectsRect(
              attacker.x + 0.5, attacker.y + 0.5,
              m.x + 0.5, m.y + 0.5,
              t.x, t.y, t.w, t.h
            )) return false;
            return !targetInside(t); // blocked only when target is NOT inside the terrain
          });

          if (losBlocked) {
            addLog("No LOS — terrain blocks line of sight to target.", "system");
            return;
          }

          // Inform if target has cover (they're inside ruins)
          const hasCover = mapPreset.terrain.some((t) => targetInside(t));
          if (hasCover) {
            addLog(`${m.unitName} is in ruins — will receive +1 cover save.`, "system");
          }

          const weaponName =
            combat.weaponIdx !== null ? (attacker.weapons[combat.weaponIdx]?.name ?? '') : '';
          pendingAnimationRef.current = () => {
            setCombat((prev) => ({ ...prev, targetId: markerId, step: "hitRolls" }));
          };
          setActiveAnimation({ type: 'shoot', fromId: combat.attackerId!, toId: markerId, weaponName });
          setSelectedMarkerId(markerId);
          return;
        }
      }
      if (gamePhase === "charge") {
        const activeSide = isAIGame ? "P1" : gameMode === "solo" ? soloSide : activePlayer;
        if (combat.step === "idle" && m.player === activeSide) {
          if (chargedThisTurn.includes(markerId)) {
            addLog(`${m.unitName} has already charged this phase.`, "system");
            return;
          }
          setCombat({ ...INIT_COMBAT, step: "selectTarget", attackerId: markerId });
          setSelectedMarkerId(markerId);
          return;
        }
        if (combat.step === "selectTarget") {
          const attacker = markers.find((mk) => mk.id === combat.attackerId);
          if (!attacker || m.player === attacker.player) return;
          resolveCharge(combat.attackerId!, markerId);
          return;
        }
      }
      if (gamePhase === "fight") {
        const activeSide = isAIGame ? "P1" : gameMode === "solo" ? soloSide : activePlayer;
        // Start attacker selection — in fight-back mode the DEFENDING player can select
        if (combat.step === "idle" && !foughtThisPhase.has(markerId)) {
          const fightingPlayer = fightBackMode
            ? (activeSide === "P1" ? "P2" : "P1")
            : activeSide;
          if (m.player !== fightingPlayer) return;
          if (!fightBackMode && foughtThisTurn.includes(markerId)) {
            addLog(`${m.unitName} has already fought this phase.`, "system");
            return;
          }
          const hasMelee = m.weapons.some((w) => w.type === "Melee");
          if (!hasMelee) { addLog(`${m.unitName} has no melee weapons.`, "system"); return; }
          setCombat({ ...INIT_COMBAT, step: "selectWeapon", attackerId: markerId, isFightback: fightBackMode });
          setSelectedMarkerId(markerId);
          return;
        }
        // Target selection for fight (engagement range check) — works for both normal and fight-back
        if (combat.step === "selectTarget") {
          const attacker = markers.find((mk) => mk.id === combat.attackerId);
          if (!attacker || m.player === attacker.player) return;
          const aFightPos = markerPos(attacker);
          const tFightPos = markerPos(m);
          const dist = Math.sqrt((aFightPos.x - tFightPos.x) ** 2 + (aFightPos.y - tFightPos.y) ** 2);
          if (dist > 2) {
            addLog(`${m.unitName} not in engagement range (within 1").`, "system");
            return;
          }
          pendingAnimationRef.current = () => {
            setCombat((prev) => ({ ...prev, targetId: markerId, step: "hitRolls" }));
          };
          setActiveAnimation({ type: 'melee', fromId: combat.attackerId!, toId: markerId });
          setSelectedMarkerId(markerId);
          return;
        }
      }
      setSelectedMarkerId((prev) => (prev === markerId ? null : markerId));
    }
  }

  // ── Shooting resolution ──
  function resolveHitRolls() {
    const attacker = markers.find((m) => m.id === combat.attackerId);
    const target = markers.find((m) => m.id === combat.targetId);
    if (!attacker || combat.weaponIdx === null) return;
    const weapon = attacker.weapons[combat.weaponIdx];
    const kws = weapon.keywords ?? [];
    const hasTorrent = kws.some((k) => k.toLowerCase() === "torrent");
    const hasLethalHits = kws.some((k) => k.toLowerCase() === "lethal hits");
    const sustainedHitsN = (() => {
      const k = kws.find((k) => k.toLowerCase().startsWith("sustained hits"));
      if (!k) return 0;
      const n = parseInt(k.trim().split(/\s+/).pop() ?? "0");
      return isNaN(n) ? 0 : n;
    })();

    const isNecron = attacker.faction?.toLowerCase().includes("necron");
    const isSM = attacker.faction?.toLowerCase().includes("space marine") || attacker.faction?.toLowerCase().includes("dark angel");
    const necronHitBonus = isNecron && necronProtocol === "Protocol of the Conquering Tyrant" && attacker.player === activePlayer;
    const rawSkill = parseSkill(weapon.skill);
    // Psychic debuffs: The Horror (-1 to attacker's hit rolls), Aversion (-1 when attacking the aversion target)
    const horrorPenalty = combat.attackerId === horrorTargetId ? 1 : 0;
    const aversionPenalty = combat.targetId === aversionTargetId ? 1 : 0;
    const psychicPenalty = Math.min(horrorPenalty + aversionPenalty, 1); // cap at -1
    const skillTarget = Math.min(6, necronHitBonus ? Math.max(2, rawSkill - 1) : rawSkill + psychicPenalty);

    // Blast: +1 attack vs 6+ models; +D3 vs 11+ models
    const targetModelCount = target?.modelCount ?? 1;
    let attacksPerModel = parseDiceExpr(weapon.attacks);
    const hasBlast = kws.some((k) => k.toLowerCase() === "blast");
    if (hasBlast && targetModelCount >= 11) {
      const bonus = Math.floor(Math.random() * 3) + 1;
      attacksPerModel += bonus;
      addLog(`💣 Blast: target has ${targetModelCount} models (+D3=${bonus} attacks).`, attacker.player);
    } else if (hasBlast && targetModelCount >= 6) {
      attacksPerModel += 1;
      addLog(`💣 Blast: target has ${targetModelCount} models (+1 attack).`, attacker.player);
    }
    const numAttacks = attacksPerModel * (attacker.modelCount ?? 1);

    // Torrent: auto-hit all attacks, skip roll entirely
    if (hasTorrent) {
      const modelNote = (attacker.modelCount ?? 1) > 1 ? ` (${attacker.modelCount} models × ${attacksPerModel})` : "";
      addLog(`🌊 Torrent: ${weapon.name} auto-hits — ${numAttacks} hit(s)${modelNote}.`, attacker.player);
      showRoll({ rolls: [], type: "hit", threshold: 0, label: `Torrent — ${numAttacks} auto-hits` });
      setCombat((prev) => ({ ...prev, hitRolls: [], hits: numAttacks, autoWounds: 0, step: "woundRolls" }));
      pushHistory();
      // For shooting, hasShotThisTurn is deferred to doneShooting() so the unit can fire all weapons first
      if (gamePhase === "fight" && combat.attackerId) setFoughtThisTurn((prev) => [...prev, combat.attackerId!]);
      return;
    }

    let rolls = rollDice(numAttacks);

    // Oath of Moment: re-roll 1s against the oath target
    const isAgainstOathTarget = combat.targetId === oathTarget;
    if (isSM && isAgainstOathTarget && oathTarget) {
      const oathTargetName = markers.find((m) => m.id === oathTarget)?.unitName ?? "oath target";
      const newRolls = rolls.map((r) => r === 1 ? d6() : r);
      rolls.forEach((old, i) => {
        if (old === 1) addLog(`⚔️ Oath of Moment reroll: ${old} → ${newRolls[i]}`, attacker.player);
      });
      rolls = newRolls;
      addLog(`Oath of Moment: re-rolled 1s against ${oathTargetName} — all attacks may reroll 1s to hit.`, attacker.player);
    }

    // Count hits and apply special rules on natural 6s
    let normalHits = 0;
    let autoWounds = 0;
    let sustainedBonus = 0;
    for (const r of rolls) {
      const isHit = r >= skillTarget;
      if (r === 6) {
        if (hasLethalHits) { autoWounds++; } // 6 = hit that auto-wounds; remove from normal wound roll
        else if (isHit) { normalHits++; }    // normal hit (not lethal)
        if (sustainedHitsN > 0) {
          sustainedBonus += sustainedHitsN;
          addLog(`🔁 Sustained Hits ${sustainedHitsN}: natural 6 → +${sustainedHitsN} extra hit(s).`, attacker.player);
        }
      } else if (isHit) {
        normalHits++;
      }
    }
    const totalHits = normalHits + sustainedBonus; // hits going to wound roll
    const modelNote = (attacker.modelCount ?? 1) > 1 ? ` (${attacker.modelCount} models × ${attacksPerModel})` : "";
    const bonusNote = necronHitBonus ? ` [Conquering Tyrant +1]` : psychicPenalty ? ` [✨ psychic -1 to hit]` : "";
    let specialNote = "";
    if (autoWounds > 0) specialNote += ` ⚡ Lethal Hits: ${autoWounds} auto-wound(s)!`;
    if (sustainedBonus > 0) specialNote += ` (+${sustainedBonus} sustained)`;
    addLog(
      `${gamePhase === "fight" ? "Fight" : "Shooting"}: ${numAttacks} attack(s)${modelNote} → ${rolls.join(", ")} → ${totalHits + autoWounds} hit(s) (needing ${skillTarget}+${bonusNote}).${specialNote}`,
      attacker.player
    );
    showRoll({ rolls, type: "hit", threshold: skillTarget, label: `Hit Rolls (${skillTarget}+)` });
    if (autoWounds > 0) addLog(`⚡ Lethal Hit — ${autoWounds} auto-wound(s), bypassing wound rolls!`, attacker.player);
    setCombat((prev) => ({ ...prev, hitRolls: rolls, hits: totalHits, autoWounds, step: "woundRolls" }));
    pushHistory();
    // For shooting, hasShotThisTurn is deferred to doneShooting() so the unit can fire all weapons first
    if (gamePhase === "fight" && combat.attackerId) setFoughtThisTurn((prev) => [...prev, combat.attackerId!]);
  }

  function resolveWoundRolls() {
    const attacker = markers.find((m) => m.id === combat.attackerId);
    const target = markers.find((m) => m.id === combat.targetId);
    if (!attacker || !target || combat.weaponIdx === null) return;
    const weapon = attacker.weapons[combat.weaponIdx];
    const kws = weapon.keywords ?? [];
    const hasDevastatingWounds = kws.some((k) => k.toLowerCase() === "devastating wounds");
    const S = parseInt(weapon.strength) || 4;
    const T = target.stats.toughness;
    const woundTarget = getWoundTarget(S, T);

    // Roll only for normal hits (Lethal Hits auto-wounds bypass this step)
    const rolls = combat.hits > 0 ? rollDice(combat.hits) : [];
    let mortalWounds = 0;
    let regularWounds = 0;
    for (const r of rolls) {
      if (r === 6 && hasDevastatingWounds) {
        mortalWounds++;
      } else if (r >= woundTarget) {
        regularWounds++;
      }
    }
    // Lethal Hits auto-wounds join the regular wound pool (they go to saves, not mortal)
    const totalWoundsForSave = regularWounds + (combat.autoWounds ?? 0);

    let logMsg = `Wounding: S${S} vs T${T} (${woundTarget}+) → ${rolls.length > 0 ? rolls.join(", ") : "no rolls"} → ${regularWounds} wound(s)`;
    if (combat.autoWounds) logMsg += ` + ${combat.autoWounds} auto-wound(s) [Lethal Hits]`;
    if (mortalWounds > 0) logMsg += ` + ${mortalWounds} mortal wound(s) [Devastating Wounds — saves bypassed!]`;
    addLog(logMsg + `.`, attacker.player);
    if (mortalWounds > 0) addLog(`💥 Devastating Wound — ${mortalWounds} mortal wound(s), saves ignored!`, attacker.player);
    showRoll({ rolls, type: "wound", threshold: woundTarget, label: `Wound Rolls (${woundTarget}+)` });
    setCombat((prev) => ({ ...prev, woundRolls: rolls, wounds: totalWoundsForSave, mortalWounds, step: "saveRolls" }));
  }

  function resolveSaveRolls() {
    const attacker = markers.find((m) => m.id === combat.attackerId);
    const target = markers.find((m) => m.id === combat.targetId);
    if (!attacker || !target || combat.weaponIdx === null) return;
    const weapon = attacker.weapons[combat.weaponIdx];
    const ap = parseAP(weapon.ap);
    const saveBase = parseSave(target.stats.save);
    const invSave = parseInvSave(target.stats.save);
    const effectiveSave = Math.min(saveBase - ap, invSave ?? 7);
    // Cover: target inside ruins grants +1 to saving throw (10th ed ruins rule)
    // Only applies when AP is -1 or better (AP0 or AP-1); AP-2 or worse strips cover.
    let coverSave = effectiveSave;
    const targetInRuins = mapPreset.terrain.some(
      (t) => target.x >= t.x && target.x < t.x + t.w && target.y >= t.y && target.y < t.y + t.h
    );
    const coverApplies = targetInRuins && ap >= -1 && effectiveSave < 7;
    if (coverApplies) {
      coverSave = Math.max(2, effectiveSave - 1);
      addLog(`Cover: ${target.unitName} is in ruins — save improved to ${coverSave}+.`, "system");
    } else if (targetInRuins && ap < -1) {
      addLog(`Cover negated by AP${ap} weapon — ${target.unitName} receives no cover bonus.`, "system");
    }

    // Necron Eternal Guardian protocol: +1 to save rolls (defender's faction, active player's turn)
    const isNecronTarget = target.faction?.toLowerCase().includes("necron");
    const necronSaveBonus = isNecronTarget && necronProtocol === "Protocol of the Eternal Guardian" && target.player === activePlayer;
    const finalSave = necronSaveBonus ? Math.max(2, coverSave - 1) : coverSave;

    // Tyranid Lurk and Feed: +1 to save near objectives (simplified: any tyranid within range)
    const isTyranidTarget = target.faction?.toLowerCase().includes("tyranid");
    const tyranidSaveBonus = isTyranidTarget && synapticImperative === "Lurk and Feed" && target.player === activePlayer
      ? mapPreset.objectives.some((obj) => Math.sqrt((target.x + 0.5 - obj.x) ** 2 + (target.y + 0.5 - obj.y) ** 2) <= 6)
      : false;
    const effectiveFinalSave = tyranidSaveBonus ? Math.max(2, finalSave - 1) : finalSave;

    // Mortal wounds (Devastating Wounds) bypass saves — deal 1 damage each directly
    const mortalWoundDmg = combat.mortalWounds ?? 0;
    if (mortalWoundDmg > 0) {
      addLog(`💥 ${mortalWoundDmg} mortal wound(s) bypass saves — ${mortalWoundDmg} damage dealt directly!`, attacker.player);
    }

    const rolls = combat.wounds > 0 ? rollDice(combat.wounds) : [];
    const unsaved = rolls.filter((r) => r < effectiveFinalSave).length;
    // Roll damage per unsaved wound (correct for variable damage like D3/D6)
    let totalDmg = mortalWoundDmg;
    const dmgRolls: number[] = [];
    for (let i = 0; i < unsaved; i++) { const d = parseDiceExpr(weapon.damage); dmgRolls.push(d); totalDmg += d; }
    const dmgNote = dmgRolls.length > 1 ? ` [${dmgRolls.join("+")}]` : "";
    const saveBonusNote = necronSaveBonus ? " [Eternal Guardian +1]" : tyranidSaveBonus ? " [Lurk and Feed +1]" : "";
    const mortalNote = mortalWoundDmg > 0 ? ` (+${mortalWoundDmg} mortal)` : "";
    addLog(`Saves: ${effectiveFinalSave}+ needed (Sv${saveBase}, AP${ap}${coverApplies ? ", +1 cover" : ""}${saveBonusNote}) → ${rolls.length > 0 ? rolls.join(", ") : "no rolls"} → ${unsaved} unsaved → ${totalDmg} damage${dmgNote}${mortalNote}.`, target.player);
    showRoll({ rolls, type: "save", threshold: effectiveFinalSave, label: `Save Rolls (${effectiveFinalSave}+)` });

    // Damage cascade: apply damage across models, killing models as wounds hit 0
    const currentTarget = markers.find((m) => m.id === combat.targetId);

    // Feel No Pain: roll D6 per damage point; on threshold+ ignore that wound
    const fnpThreshold = currentTarget?.feelNoPain ?? 0;
    if (fnpThreshold > 0 && totalDmg > 0) {
      const fnpRolls = Array.from({ length: totalDmg }, () => d6());
      const fnpSaved = fnpRolls.filter((r) => r >= fnpThreshold).length;
      totalDmg = Math.max(0, totalDmg - fnpSaved);
      if (fnpSaved > 0) {
        addLog(`🧬 FNP: saved ${fnpSaved} wound(s) on ${currentTarget!.unitName}! (${fnpThreshold}+ save, rolls: ${fnpRolls.join(", ")})`, target.player);
      }
    }

    let remainingDmg = totalDmg;
    let curWounds = currentTarget?.currentWounds ?? 0;
    let curModelCount = currentTarget?.modelCount ?? 1;
    const wpm = currentTarget?.woundsPerModel ?? currentTarget?.maxWounds ?? 1;
    while (remainingDmg > 0 && curModelCount > 0) {
      if (remainingDmg >= curWounds) {
        remainingDmg -= curWounds;
        curModelCount--;
        curWounds = curModelCount > 0 ? wpm : 0;
      } else {
        curWounds -= remainingDmg;
        remainingDmg = 0;
      }
    }
    const targetDestroyed = curModelCount <= 0;
    const newTargetWounds = curWounds;
    const newModelCount = Math.max(0, curModelCount);
    const modelsKilled = (currentTarget?.modelCount ?? 1) - newModelCount;

    // Apply damage and mark attacker
    const attackerId = combat.attackerId;
    const targetId = combat.targetId;
    const firedWeaponIdx = combat.weaponIdx!;
    const isFightPhase = gamePhase === "fight";
    const isFightback = combat.isFightback ?? false;

    setMarkers((prev) =>
      prev.map((m) => {
        if (m.id === targetId) {
          if (targetDestroyed) {
            addLog(`${m.unitName} destroyed!`, "system");
            setDestroyedThisTurn((p) => [...p, m.id]);
            setDestroyedThisPhase((p) => [...p, m.id]);
          } else if (modelsKilled > 0) {
            addLog(`${m.unitName}: ${modelsKilled} model(s) slain — ${newModelCount} remain.`, "system");
          }
          let updatedModelPositions = m.modelPositions;
          if (modelsKilled > 0 && (m.modelCount ?? 1) > 1) {
            if (!updatedModelPositions || updatedModelPositions.length === 0) {
              updatedModelPositions = hexPackPositions(m.x + 0.5, m.y + 0.5, m.modelCount ?? 1);
            }
            updatedModelPositions = updatedModelPositions.slice(0, newModelCount);
          }
          return { ...m, currentWounds: newTargetWounds, modelCount: newModelCount, isDestroyed: targetDestroyed, modelPositions: updatedModelPositions };
        }
        if (m.id === attackerId) {
          // For shooting, hasShotThisTurn is deferred until doneShooting() so the unit fires all weapons
          return isFightPhase ? { ...m, hasFought: true } : m;
        }
        return m;
      })
    );

    if (isFightPhase && attackerId) {
      setFoughtThisPhase((prev) => new Set([...prev, attackerId]));
    }

    if (targetDestroyed && targetId && (transportContents[targetId] ?? []).length > 0) {
      setTimeout(() => handleTransportDestroyed(targetId), 50);
    }

    // No Prisoners: score 1 VP when destroying a unit with 10+ starting models
    if (targetDestroyed && currentTarget) {
      const startCount = currentTarget.startingModelCount ?? currentTarget.modelCount ?? 1;
      if (startCount >= 10) {
        const scoringPlayer = attacker!.player;
        if (scoringPlayer === "P1") setP1Vp((n) => n + 1);
        else setP2Vp((n) => n + 1);
        addLog(`No Prisoners: ${scoringPlayer} scores 1 VP — ${currentTarget.unitName} had ${startCount} models.`, scoringPlayer);
      }
    }

    if (isFightPhase) {
      setCombat({ ...INIT_COMBAT, step: "done" });
      setTimeout(() => setCombat(INIT_COMBAT), 2000);
    } else {
      // Shooting: mark this weapon as fired, then return to weapon select so the unit can fire more
      setWeaponsFiredThisShot((prev) => new Set([...prev, firedWeaponIdx]));
      setCombat({ ...INIT_COMBAT, step: "done" });
      setTimeout(() => setCombat({ ...INIT_COMBAT, step: "selectWeapon", attackerId }), 1500);
    }
  }

  // ── Charge ──
  function resolveCharge(attackerId: string, targetId: string) {
    const attacker = markers.find((m) => m.id === attackerId);
    const target = markers.find((m) => m.id === targetId);
    if (!attacker || !target) return;

    const aChargePos = markerPos(attacker);
    const tChargePos = markerPos(target);
    const dist = Math.sqrt((aChargePos.x - tChargePos.x) ** 2 + (aChargePos.y - tChargePos.y) ** 2);

    // 10th ed: charge declaration requires target within 12"
    if (dist > 12) {
      addLog(`Cannot charge ${target.unitName} — target is ${dist.toFixed(1)}" away (charges require 12" or less).`, attacker.player);
      setCombat(INIT_COMBAT);
      setSelectedMarkerId(null);
      return;
    }

    pushHistory();
    addLog(`${attacker.unitName} declares a charge against ${target.unitName} (${dist.toFixed(1)}" away).`, attacker.player);
    // Offer Overwatch to the defender BEFORE rolling 2D6 (10th ed rule order)
    setOverwatchPrompt({ attackerId, targetId });
  }

  function confirmOverwatch(spendCp: boolean) {
    if (!overwatchPrompt) return;
    const { attackerId, targetId } = overwatchPrompt;
    const attacker = markers.find((m) => m.id === attackerId);
    const target = markers.find((m) => m.id === targetId);
    if (!attacker || !target) { setOverwatchPrompt(null); return; }

    if (spendCp) {
      const defPlayer = target.player;
      const defCp = defPlayer === "P1" ? p1Cp : p2Cp;
      if (defCp < 1) {
        addLog(`${defPlayer} has no CP — Overwatch cannot be fired.`, "system");
      } else {
        if (defPlayer === "P1") setP1Cp((n) => n - 1);
        else setP2Cp((n) => n - 1);
        const owRolls = rollDice(1);
        const owHits = owRolls.filter((r) => r === 6).length;
        addLog(`Overwatch: ${target.unitName} fires — ${owRolls.join(",")} — ${owHits} hit(s)${owHits > 0 ? "!" : "."}`, target.player);
      }
    } else {
      addLog(`${target.unitName} does not fire Overwatch.`, "system");
    }

    // Now roll the charge (after Overwatch decision)
    const dist = Math.sqrt((attacker.x - target.x) ** 2 + (attacker.y - target.y) ** 2);
    const roll1 = d6();
    const roll2 = d6();
    const total = roll1 + roll2;
    const needed = Math.ceil(dist);
    showRoll({ rolls: [roll1, roll2], type: "charge", threshold: needed, label: `Charge Roll (need ${needed}+)` });
    addLog(
      `Charge roll: ${attacker.unitName} → ${target.unitName} (${dist.toFixed(1)}"). Rolled ${roll1}+${roll2}=${total} (need ${needed}+).`,
      attacker.player
    );

    setOverwatchPrompt(null);

    if (total >= needed) {
      // Charge succeeds — player manually positions the charger (click on board)
      addLog(`Charge roll ${total} ≥ ${needed}. Click a cell within ${total}" to place ${attacker.unitName} in base contact with ${target.unitName}.`, attacker.player);
      setChargeMove({ unitId: attackerId, targetId, maxDist: total });
      // Keep combat state so the charger stays highlighted
      setCombat((prev) => ({ ...prev, step: "idle" }));
    } else {
      addLog(`Charge fails! ${attacker.unitName} stays in place (rolled ${total}, needed ${needed}).`, attacker.player);
      setChargedThisTurn((prev) => [...prev, attackerId]);
      setCombat(INIT_COMBAT);
      setSelectedMarkerId(null);
    }
  }

  // ── Fight ──
  function resolveFight(attackerId: string, targetId: string) {
    const attacker = markers.find((m) => m.id === attackerId);
    const target = markers.find((m) => m.id === targetId);
    if (!attacker || !target) return;

    pushHistory();

    const meleeWeapon = attacker.weapons.find((w) => w.type === "Melee") ?? attacker.weapons[0];
    if (!meleeWeapon) { addLog("No weapons available.", "system"); return; }

    const kws = meleeWeapon.keywords ?? [];
    const hasTorrent = kws.some((k) => k.toLowerCase() === "torrent");
    const hasLethalHits = kws.some((k) => k.toLowerCase() === "lethal hits");
    const hasDevastatingWounds = kws.some((k) => k.toLowerCase() === "devastating wounds");
    const sustainedHitsN = (() => {
      const k = kws.find((k) => k.toLowerCase().startsWith("sustained hits"));
      if (!k) return 0;
      const n = parseInt(k.trim().split(/\s+/).pop() ?? "0");
      return isNaN(n) ? 0 : n;
    })();

    // Blast adjustment
    const hasBlast = kws.some((k) => k.toLowerCase() === "blast");
    let attacksBase = parseDiceExpr(meleeWeapon.attacks);
    if (hasBlast && (target.modelCount ?? 1) >= 11) {
      const bonus = Math.floor(Math.random() * 3) + 1;
      attacksBase += bonus;
      addLog(`💣 Blast: target has ${target.modelCount} models (+D3=${bonus} attacks).`, attacker.player);
    } else if (hasBlast && (target.modelCount ?? 1) >= 6) {
      attacksBase += 1;
      addLog(`💣 Blast: target has ${target.modelCount} models (+1 attack).`, attacker.player);
    }
    const numAttacks = attacksBase;
    const wsTarget = parseSkill(meleeWeapon.skill);

    // Hit rolls (Torrent: auto-hit)
    let normalHits = 0;
    let autoWoundsFromHits = 0;
    let sustainedBonus = 0;
    let hitRolls: number[] = [];
    if (hasTorrent) {
      normalHits = numAttacks;
      addLog(`🌊 Torrent: ${meleeWeapon.name} auto-hits — ${numAttacks} hit(s).`, attacker.player);
    } else {
      hitRolls = rollDice(numAttacks);
      for (const r of hitRolls) {
        const isHit = r >= wsTarget;
        if (r === 6) {
          if (hasLethalHits) { autoWoundsFromHits++; }
          else if (isHit) { normalHits++; }
          if (sustainedHitsN > 0) {
            sustainedBonus += sustainedHitsN;
            addLog(`🔁 Sustained Hits ${sustainedHitsN}: natural 6 → +${sustainedHitsN} extra hit(s).`, attacker.player);
          }
        } else if (isHit) {
          normalHits++;
        }
      }
    }
    const hitsForWound = normalHits + sustainedBonus;
    if (autoWoundsFromHits > 0) addLog(`⚡ Lethal Hit — ${autoWoundsFromHits} auto-wound(s), bypassing wound rolls!`, attacker.player);

    // Wound rolls
    const S = parseInt(meleeWeapon.strength) || 4;
    const T = target.stats.toughness;
    const woundTarget = getWoundTarget(S, T);
    const woundRolls = hitsForWound > 0 ? rollDice(hitsForWound) : [];
    let mortalWounds = 0;
    let regularWounds = 0;
    for (const r of woundRolls) {
      if (r === 6 && hasDevastatingWounds) {
        mortalWounds++;
      } else if (r >= woundTarget) {
        regularWounds++;
      }
    }
    const woundsForSave = regularWounds + autoWoundsFromHits;
    if (mortalWounds > 0) addLog(`💥 Devastating Wound — ${mortalWounds} mortal wound(s), saves ignored!`, attacker.player);

    // Save rolls (mortal wounds bypass saves)
    const ap = parseAP(meleeWeapon.ap);
    const saveBase = parseSave(target.stats.save);
    const invSave = parseInvSave(target.stats.save);
    const effectiveSave = Math.min(saveBase - ap, invSave ?? 7);
    const saveRolls = woundsForSave > 0 ? rollDice(woundsForSave) : [];
    const unsaved = saveRolls.filter((r) => r < effectiveSave).length;
    const dmgRolls: number[] = [];
    let totalDmg = mortalWounds; // mortal wounds deal 1 damage each
    for (let i = 0; i < unsaved; i++) { const d = parseDiceExpr(meleeWeapon.damage); dmgRolls.push(d); totalDmg += d; }

    const hitLog = hasTorrent ? `${numAttacks} auto-hits` : `${hitRolls.join(", ")} → ${hitsForWound + autoWoundsFromHits} hit(s)`;
    const woundLog = woundRolls.length > 0 ? `${woundRolls.join(", ")} → ${woundsForSave} wound(s)` : `${autoWoundsFromHits} auto-wound(s)`;
    const mortalLog = mortalWounds > 0 ? `, ${mortalWounds} mortal` : "";
    addLog(
      `Fight: ${attacker.unitName} vs ${target.unitName} — ${hitLog}, ${woundLog}${mortalLog}, ${unsaved} unsaved → ${totalDmg} damage.`,
      attacker.player
    );

    const newW = Math.max(0, target.currentWounds - totalDmg);
    if (newW <= 0) {
      addLog(`${target.unitName} destroyed!`, "system");
      setDestroyedThisPhase((p) => [...p, target.id]);
      setDestroyedThisTurn((p) => [...p, target.id]);
      // No Prisoners: score 1 VP when destroying a unit with 10+ starting models
      const startCount = target.startingModelCount ?? target.modelCount ?? 1;
      if (startCount >= 10) {
        if (attacker.player === "P1") setP1Vp((n) => n + 1);
        else setP2Vp((n) => n + 1);
        addLog(`No Prisoners: ${attacker.player} scores 1 VP — ${target.unitName} had ${startCount} models.`, attacker.player);
      }
    }

    setMarkers((prev) =>
      prev.map((m) => {
        if (m.id === targetId) return { ...m, currentWounds: newW, isDestroyed: newW <= 0 };
        if (m.id === attackerId) return { ...m, hasFought: true };
        return m;
      })
    );

    if (newW <= 0 && (transportContents[targetId] ?? []).length > 0) {
      setTimeout(() => handleTransportDestroyed(targetId), 50);
    }

    setCombat(INIT_COMBAT);
    setSelectedMarkerId(null);
  }

  // ── Morale ──
  function resolveMorale(player: "P1" | "P2") {
    const playerMarkers = markers.filter((m) => m.player === player && !m.isDestroyed && !m.isInReserve);
    let casualties = 0;
    playerMarkers.forEach((m) => {
      if (m.currentWounds < m.maxWounds) {
        const ldTarget = parseInt(m.stats.leadership) || 7;
        const roll = d6();
        if (roll > ldTarget) {
          const lost = roll - ldTarget;
          addLog(`Morale: ${m.unitName} (Ld${ldTarget}) rolled ${roll} — loses ${lost} model(s).`, player);
          casualties += lost;
          setMarkers((prev) =>
            prev.map((mk) =>
              mk.id === m.id
                ? { ...mk, currentWounds: Math.max(0, mk.currentWounds - lost), isDestroyed: mk.currentWounds - lost <= 0 }
                : mk
            )
          );
        } else {
          addLog(`Morale: ${m.unitName} (Ld${ldTarget}) rolled ${roll} — holds.`, player);
        }
      }
    });
    if (casualties === 0) addLog(`Morale: ${player} — all units hold.`, player);
  }

  // ── Stratagems (generic) ──
  const genericStratagems = [
    { name: "Counter-Offensive", cost: 2, phase: "Fight", description: "Fight again with one unit." },
    { name: "Rapid Ingress", cost: 1, phase: "Movement", description: "One unit in Strategic Reserves arrives immediately." },
    { name: "Armour of Contempt", cost: 1, phase: "Any", description: "Ignore one wound on 5+." },
    { name: "Insane Bravery", cost: 2, phase: "Morale", description: "Auto-pass one Battleshock test." },
    { name: "Grenade", cost: 1, phase: "Shooting", description: "One INFANTRY unit throws a grenade (D3 shots, S4, AP0, D1)." },
  ];

  function useStratagem(player: "P1" | "P2", cost: number, name: string) {
    if (player === "P1") {
      if (p1Cp < cost) { addLog(`P1 — not enough CP for ${name}.`, "system"); return; }
      pushHistory();
      setP1Cp((n) => n - cost);
    } else {
      if (p2Cp < cost) { addLog(`P2 — not enough CP for ${name}.`, "system"); return; }
      pushHistory();
      setP2Cp((n) => n - cost);
    }
    addLog(`${player} used "${name}" (${cost} CP).`, player);
  }

  function beginStratagem(player: "P1" | "P2", strat: StratagemDef) {
    const cp = player === "P1" ? p1Cp : p2Cp;
    if (cp < strat.cost) { addLog(`${player} — not enough CP for ${strat.name}.`, "system"); return; }
    pushHistory();
    if (player === "P1") setP1Cp((n) => n - strat.cost);
    else setP2Cp((n) => n - strat.cost);
    if (!strat.requiresUnit && !strat.requiresTarget) {
      addLog(`${player} used "${strat.name}" (${strat.cost} CP).`, player);
      return;
    }
    setActiveStratagem({
      name: strat.name, phase: strat.phase, description: strat.description,
      step: strat.requiresUnit ? "select_unit" : "select_target",
      unitId: null, targetId: null, effect: strat.effect, player,
    });
  }

  function resolveStratagemEffect(sName: string, sEffect: string, sPlayer: "P1" | "P2", unitId: string | null, targetId: string | null) {
    setActiveStratagem(null);
    const unit = unitId ? markers.find((m) => m.id === unitId) : null;
    const target = targetId ? markers.find((m) => m.id === targetId) : null;
    if (sEffect === "rapid_ingress" && unit) {
      setReservesUnitId(unit.id);
      setReservesMode("place_normal");
      addLog(`${sPlayer} Rapid Ingress: deploy ${unit.unitName} from reserves (place more than 9" from enemy).`, sPlayer);
    } else if (sEffect === "counter_offensive" && unit) {
      addLog(`${sPlayer} Counter-Offensive: ${unit.unitName} fights again this phase.`, sPlayer);
    } else if (sEffect === "insane_bravery" && unit) {
      setMarkers((prev) => prev.map((m) => m.id === unit.id ? { ...m, battleShocked: false } : m));
      addLog(`${sPlayer} Insane Bravery: ${unit.unitName} auto-passes Battle-shock.`, sPlayer);
    } else if (sEffect === "synaptic_communion" && unit) {
      setMarkers((prev) => prev.map((m) => m.id === unit.id ? { ...m, battleShocked: false } : m));
      addLog(`${sPlayer} Synaptic Communion: ${unit.unitName} recovers from Battle-shock via Synapse link.`, sPlayer);
    } else if (sEffect === "grenade" && unit && target) {
      // Mini grenade shoot: D3 shots, S4, AP0, D1, BS same as unit
      const shots = Math.floor(Math.random() * 3) + 1;
      const unitDef = findUnit(unit.faction, unit.unitId);
      const bsStr = unitDef?.weapons.find((w) => w.type !== "Melee")?.skill ?? "4+";
      const skillTarget = parseSkill(bsStr);
      let hits = 0;
      const hitRolls = Array.from({ length: shots }, () => d6());
      hits = hitRolls.filter((r) => r >= skillTarget).length;
      const woundTarget = getWoundTarget(4, target.stats?.toughness ?? 4);
      const woundRolls = Array.from({ length: hits }, () => d6());
      const wounds = woundRolls.filter((r) => r >= woundTarget).length;
      const saveNum = parseSave(target.stats?.save ?? "6+");
      const saveRolls = Array.from({ length: wounds }, () => d6());
      const unsaved = saveRolls.filter((r) => r < saveNum).length;
      const dmg = unsaved;
      if (dmg > 0) {
        setMarkers((prev) => prev.map((m) => m.id === target.id ? { ...m, currentWounds: Math.max(0, m.currentWounds - dmg) } : m));
      }
      addLog(`${sPlayer} Grenade: ${unit.unitName} → ${target.unitName}: ${shots} shots, ${hits} hits, ${wounds} wounds, ${dmg} damage.`, sPlayer);
    // ── Psychic stratagems ──────────────────────────────────────────────────
    } else if (sEffect === "psychic_scream" && target) {
      const mw = Math.floor(Math.random() * 3) + 1;
      const newW = Math.max(0, target.currentWounds - mw);
      const isDestroyed = newW <= 0;
      setMarkers((prev) => prev.map((m) => m.id === target.id ? { ...m, currentWounds: newW, isDestroyed } : m));
      addLog(`✨ ${sPlayer} Psychic Scream: ${target.unitName} suffers ${mw} mortal wound(s) → ${newW}W remaining.`, sPlayer);
      if (!isDestroyed) {
        const ldNum = parseInt(target.stats?.leadership ?? "7");
        const r1 = d6(); const r2 = d6(); const total = r1 + r2;
        const shocked = total > ldNum;
        setMarkers((prev) => prev.map((m) => m.id === target.id ? { ...m, battleShocked: shocked, belowHalfStrength: m.currentWounds < m.maxWounds / 2 } : m));
        addLog(`✨ Battle-shock test: ${target.unitName} — 2D6 (${r1}+${r2}=${total}) vs Ld${ldNum}+ → ${shocked ? "SHOCKED!" : "holds."}`, sPlayer);
      }
    } else if (sEffect === "catalyst" && unit) {
      setMarkers((prev) => prev.map((m) => m.id === unit.id ? { ...m, feelNoPain: 5 } : m));
      addLog(`✨ ${sPlayer} Catalyst: ${unit.unitName} gains Feel No Pain 5+ until end of turn.`, sPlayer);
    } else if (sEffect === "the_horror" && target) {
      setHorrorTargetId(target.id);
      addLog(`✨ ${sPlayer} The Horror: ${target.unitName} suffers -1 to hit rolls until end of phase.`, sPlayer);
    } else if (sEffect === "mind_worm" && target) {
      const mw = Math.floor(Math.random() * 3) + 1;
      const newW = Math.max(0, target.currentWounds - mw);
      const isDestroyed = newW <= 0;
      setMarkers((prev) => prev.map((m) => m.id === target.id ? { ...m, currentWounds: newW, isDestroyed } : m));
      addLog(`✨ ${sPlayer} Mind Worm: ${target.unitName} suffers ${mw} mortal wound(s) → ${newW}W remaining${isDestroyed ? " — DESTROYED!" : ""}.`, sPlayer);
    } else if (sEffect === "aversion" && unit) {
      setAversionTargetId(unit.id);
      addLog(`✨ ${sPlayer} Aversion: attackers suffer -1 to hit rolls against ${unit.unitName} until end of phase.`, sPlayer);
    } else if (sEffect === "might_of_heroes" && unit) {
      addLog(`✨ ${sPlayer} Might of Heroes: ${unit.unitName} gains +1 Strength and +1 Attacks until end of Fight phase.`, sPlayer);
    } else {
      addLog(`${sPlayer} used "${sName}" on ${unit?.unitName ?? "—"}${target ? ` → ${target.unitName}` : ""}.`, sPlayer);
    }
  }

  // ─── AI opponent turn execution ────────────────────────────────────────────

  useEffect(() => {
    if (!isAIGame || activePlayer !== "P2" || roomPhase !== "game") return;
    if (gamePhase === "scoring") return;

    let cancelled = false;
    const pendingTimers: ReturnType<typeof setTimeout>[] = [];

    function delay(ms: number): Promise<void> {
      return new Promise((resolve) => {
        const t = setTimeout(() => { if (!cancelled) resolve(); }, ms);
        pendingTimers.push(t);
      });
    }

    setAiThinking(true);

    async function runAIPhase() {
      try {
        // Capture a local mutable copy of markers for this AI phase
        // (avoids stale closure issues between async delays)
        let local = [...markers];

        if (gamePhase === "command") {
          addLog("🤖 AI Command Phase — generating CP.", "system");
          await delay(600);
          // CP is granted by giveCommandPhaseCP in finishAfterBattleShock when it's P2's turn
          // Just advance to movement
          if (!cancelled) setGamePhase("movement");

        } else if (gamePhase === "movement") {
          addLog("🤖 AI Movement Phase.", "system");
          await delay(400);

          const moves = computeAIMovements("P2", local, mapPreset, movedThisTurn);
          for (const action of moves) {
            if (cancelled) break;
            if (action.type !== "move") continue;
            await delay(350);
            if (cancelled) break;

            const marker = local.find((m) => m.id === action.markerId);
            if (!marker) continue;
            const isOccupied = local.some(
              (m) => m.id !== action.markerId && m.x === action.targetX && m.y === action.targetY && !m.isDestroyed && !m.isInReserve
            );
            if (isOccupied) continue;

            const newInCover = mapPreset.terrain.some(
              (t) => action.targetX >= t.x && action.targetX < t.x + t.w && action.targetY >= t.y && action.targetY < t.y + t.h
            );
            const oldX = marker.x, oldY = marker.y;
            local = local.map((m) => {
              if (m.id === action.markerId) return { ...m, x: action.targetX, y: action.targetY, hasAdvanced: false, inCover: newInCover };
              if (marker.attachedCharacterId && m.id === marker.attachedCharacterId) {
                const nx = Math.max(0, Math.min(59, m.x + (action.targetX - oldX)));
                const ny = Math.max(0, Math.min(43, m.y + (action.targetY - oldY)));
                return { ...m, x: nx, y: ny, inCover: mapPreset.terrain.some((t) => nx >= t.x && nx < t.x + t.w && ny >= t.y && ny < t.y + t.h) };
              }
              return m;
            });
            setMarkers([...local]);
            setMovedThisTurn((prev) => [...prev, action.markerId]);
            addLog(`AI moved ${marker.unitName} to (${action.targetX},${action.targetY})${newInCover ? " [cover]" : ""}.`, "P2");
          }

          if (!cancelled) {
            setMovedThisTurn([]);
            setGamePhase("shooting");
          }

        } else if (gamePhase === "shooting") {
          addLog("🤖 AI Shooting Phase.", "system");
          await delay(400);

          const shots = computeAIShooting("P2", local, mapPreset, shotThisTurn);
          for (const action of shots) {
            if (cancelled) break;
            if (action.type !== "shoot") continue;
            await delay(400);
            if (cancelled) break;

            const attacker = local.find((m) => m.id === action.attackerId);
            const target = local.find((m) => m.id === action.targetId);
            if (!attacker || !target || target.isDestroyed) continue;

            const result = resolveAIAttack(attacker, action.weaponIdx, target);
            const weaponName = attacker.weapons[action.weaponIdx]?.name ?? "weapon";

            local = local.map((m) => {
              if (m.id === action.targetId) {
                const destroyed = result.targetDestroyed;
                if (destroyed) {
                  setDestroyedThisTurn((p) => [...p, m.id]);
                  setDestroyedThisPhase((p) => [...p, m.id]);
                }
                return { ...m, currentWounds: result.newTargetWounds, modelCount: result.newModelCount, isDestroyed: destroyed };
              }
              if (m.id === action.attackerId) return { ...m, hasShotThisTurn: true };
              return m;
            });
            setMarkers([...local]);
            setShotThisTurn((prev) => [...prev, action.attackerId]);
            addLog(
              `AI: ${attacker.unitName} shoots ${target.unitName} with ${weaponName} — ${result.hits} hits, ${result.unsavedWounds} unsaved, ${result.totalDamage} damage.${result.targetDestroyed ? ` ${target.unitName} destroyed!` : ""}`,
              "P2"
            );
          }

          if (!cancelled) {
            setShotThisTurn([]);
            setWeaponsFiredThisShot(new Set());
            setGamePhase("charge");
          }

        } else if (gamePhase === "charge") {
          addLog("🤖 AI Charge Phase.", "system");
          await delay(400);

          const charges = computeAICharges("P2", local, chargedThisTurn);
          for (const action of charges) {
            if (cancelled) break;
            if (action.type !== "charge") continue;
            await delay(400);
            if (cancelled) break;

            const attacker = local.find((m) => m.id === action.attackerId);
            const target = local.find((m) => m.id === action.targetId);
            if (!attacker || !target || target.isDestroyed) continue;

            const ap = { x: attacker.x + 0.5, y: attacker.y + 0.5 };
            const tp = { x: target.x + 0.5, y: target.y + 0.5 };
            const chargeDistInches = Math.sqrt((ap.x - tp.x) ** 2 + (ap.y - tp.y) ** 2);
            const needed = Math.ceil(chargeDistInches);

            const roll = chargeRoll2D6();
            addLog(`AI: ${attacker.unitName} charges ${target.unitName} (${chargeDistInches.toFixed(1)}\") — rolled ${roll} (need ${needed}+).`, "P2");

            if (roll >= needed) {
              const placement = findChargePlacement(attacker, target, roll, local);
              if (placement) {
                const dx = placement.x - attacker.x;
                const dy = placement.y - attacker.y;
                const charInCover = mapPreset.terrain.some((t) => placement.x >= t.x && placement.x < t.x + t.w && placement.y >= t.y && placement.y < t.y + t.h);
                local = local.map((m) => {
                  if (m.id === action.attackerId) return { ...m, x: placement.x, y: placement.y, hasCharged: true, inCover: charInCover };
                  if (attacker.attachedCharacterId && m.id === attacker.attachedCharacterId) {
                    const nx = Math.max(0, Math.min(59, m.x + dx));
                    const ny = Math.max(0, Math.min(43, m.y + dy));
                    return { ...m, x: nx, y: ny };
                  }
                  return m;
                });
                setMarkers([...local]);
                addLog(`Charge succeeds! ${attacker.unitName} moves adjacent to ${target.unitName}.`, "P2");
              } else {
                addLog(`Charge roll sufficient but no valid placement found for ${attacker.unitName}.`, "system");
              }
            } else {
              addLog(`Charge fails — ${attacker.unitName} stays put.`, "P2");
            }
            setChargedThisTurn((prev) => [...prev, action.attackerId]);
          }

          if (!cancelled) {
            setChargedThisTurn([]);
            setGamePhase("fight");
          }

        } else if (gamePhase === "fight") {
          addLog("🤖 AI Fight Phase.", "system");
          await delay(400);

          const fights = computeAIFights("P2", local, foughtThisTurn);
          for (const action of fights) {
            if (cancelled) break;
            if (action.type !== "fight") continue;
            await delay(400);
            if (cancelled) break;

            const attacker = local.find((m) => m.id === action.attackerId);
            const target = local.find((m) => m.id === action.targetId);
            if (!attacker || !target || target.isDestroyed) continue;

            const result = resolveAIAttack(attacker, action.weaponIdx, target);
            const weaponName = attacker.weapons[action.weaponIdx]?.name ?? "melee";

            local = local.map((m) => {
              if (m.id === action.targetId) {
                const destroyed = result.targetDestroyed;
                if (destroyed) {
                  setDestroyedThisTurn((p) => [...p, m.id]);
                  setDestroyedThisPhase((p) => [...p, m.id]);
                }
                return { ...m, currentWounds: result.newTargetWounds, modelCount: result.newModelCount, isDestroyed: destroyed };
              }
              if (m.id === action.attackerId) return { ...m, hasFought: true };
              return m;
            });
            setMarkers([...local]);
            setFoughtThisTurn((prev) => [...prev, action.attackerId]);
            addLog(
              `AI: ${attacker.unitName} fights ${target.unitName} with ${weaponName} — ${result.hits} hits, ${result.unsavedWounds} unsaved, ${result.totalDamage} damage.${result.targetDestroyed ? ` ${target.unitName} destroyed!` : ""}`,
              "P2"
            );
          }

          if (!cancelled) {
            // Auto-resolve battle-shock and end AI turn
            setFoughtThisTurn([]);
            setFoughtThisPhase(new Set());
            setFightBackMode(false);
            setFightPhaseStep("active");
            setDestroyedThisPhase([]);
            const afterShock = resolveBattleShock("P2", local);
            setMarkers(afterShock);
            finishAfterBattleShock(afterShock);
          }
        }
      } finally {
        if (!cancelled) setAiThinking(false);
      }
    }

    runAIPhase();

    return () => {
      cancelled = true;
      pendingTimers.forEach(clearTimeout);
      setAiThinking(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIGame, activePlayer, gamePhase, roomPhase]);

  // ─── Phase action panel ───────────────────────────────────────────────────

  const activeSide = isAIGame ? "P1" : gameMode === "solo" ? soloSide : activePlayer;
  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);
  const combatAttacker = markers.find((m) => m.id === combat.attackerId);
  const combatTarget = markers.find((m) => m.id === combat.targetId);

  // ── Range indicators computed from current phase + selection ──
  const rangeIndicators: RangeIndicator[] = [];

  if (roomPhase === "game") {
    if (gamePhase === "movement" && moveUnit) {
      const mu = markers.find((m) => m.id === moveUnit);
      if (mu) {
        const moveIn = parseStat(mu.stats.movement);
        rangeIndicators.push({
          centreX: mu.x + 0.5,
          centreY: mu.y + 0.5,
          radiusInches: moveIn,
          colour: "#4ade80",
          opacity: 0.08,
          strokeOpacity: 0.5,
          label: `${moveIn}"`,
        });
        if (mu.hasAdvanced || moveAdvance) {
          const advBonus = advanceRollResult ?? 6;
          rangeIndicators.push({
            centreX: mu.x + 0.5,
            centreY: mu.y + 0.5,
            radiusInches: moveIn + advBonus,
            colour: "#f97316",
            opacity: 0.05,
            strokeOpacity: 0.35,
            label: `Adv max ${moveIn + advBonus}"`,
          });
        }
      }
    }

    if (gamePhase === "shooting" && combat.step === "selectTarget" && combatAttacker && combat.weaponIdx !== null) {
      const weapon = combatAttacker.weapons[combat.weaponIdx];
      if (weapon?.range) {
        const rangeIn = parseStat(weapon.range);
        if (rangeIn > 0) {
          rangeIndicators.push({
            centreX: combatAttacker.x + 0.5,
            centreY: combatAttacker.y + 0.5,
            radiusInches: rangeIn,
            colour: "#ef4444",
            opacity: 0.07,
            strokeOpacity: 0.4,
            label: `${rangeIn}"`,
          });
        }
      }
    }

    if (gamePhase === "charge" && combat.step === "selectTarget" && combatAttacker) {
      rangeIndicators.push({
        centreX: combatAttacker.x + 0.5,
        centreY: combatAttacker.y + 0.5,
        radiusInches: 12,
        colour: "#facc15",
        opacity: 0.07,
        strokeOpacity: 0.4,
        label: "12\" charge",
      });
    }

    // Range ring showing how far the charger can place after a successful roll
    if (chargeMove) {
      const charger = markers.find((m) => m.id === chargeMove.unitId);
      if (charger) {
        rangeIndicators.push({
          centreX: charger.x + 0.5,
          centreY: charger.y + 0.5,
          radiusInches: chargeMove.maxDist,
          colour: "#4ade80",
          opacity: 0.08,
          strokeOpacity: 0.45,
          label: `Move ≤${chargeMove.maxDist}"`,
        });
      }
    }
  }

  function PhasePanel() {
    if (gamePhase === "command") {
      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Command Phase
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {activePlayer} gained +1 CP this phase. Use stratagems or issue orders.
          </p>
          <button
            onClick={advancePhase}
            className="w-full py-2 rounded-lg text-xs font-semibold mt-2"
            style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.35)" }}
          >
            End Command Phase →
          </button>
        </div>
      );
    }

    if (gamePhase === "movement") {
      const reservedForActive = markers.filter(
        (m) => m.isInReserve && !m.isDestroyed && m.player === activeSide && !m.isAttached && !m.isEmbarked
      );
      const canBringReserves = round >= 2 && reservedForActive.length > 0;

      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Movement Phase
          </p>

          {/* Active placement mode banner */}
          {reservesMode !== 'idle' && (
            <div className="rounded-lg p-2" style={{ backgroundColor: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.3)" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#a855f7" }}>
                {reservesMode === 'place_homer'
                  ? '📡 Homer Arrival'
                  : reservesMode === 'place_deepstrike'
                  ? '🎯 Deep Strike'
                  : '📦 Deploy from Reserve'}
              </p>
              <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                {reservesMode === 'place_homer'
                  ? `Click within 6" of your Teleport Homer (3"+ from enemies).`
                  : reservesMode === 'place_deepstrike'
                  ? 'Click anywhere 9"+ from all enemies.'
                  : 'Click within 6" of your board edge.'}
              </p>
              <p className="text-[10px] font-semibold mb-1" style={{ color: "#fbbf24" }}>
                Placing: {markers.find((m) => m.id === reservesUnitId)?.unitName}
              </p>
              <button
                onClick={() => { setReservesMode('idle'); setReservesUnitId(null); }}
                className="w-full py-1 rounded text-[10px]"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Normal movement UI */}
          {reservesMode === 'idle' && (
            <>
              {moveUnit ? (
                <>
                  <p className="text-xs" style={{ color: "#d97706" }}>
                    Click a cell to move {markers.find((m) => m.id === moveUnit)?.unitName}
                  </p>
                  <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                    <input
                      type="checkbox"
                      checked={moveAdvance}
                      onChange={(e) => {
                        const isAdv = e.target.checked;
                        setMoveAdvance(isAdv);
                        if (isAdv) {
                          const roll = d6();
                          setAdvanceRollResult(roll);
                          const unit = markers.find((m) => m.id === moveUnit);
                          const mv = unit ? parseStat(unit.stats.movement) : 0;
                          addLog(`Advance D6 roll: ${roll} — max move ${mv + roll}".`, "system");
                        } else {
                          setAdvanceRollResult(null);
                        }
                      }}
                      className="rounded"
                    />
                    Advance (+D6" but can&apos;t shoot)
                    {moveAdvance && advanceRollResult !== null && (
                      <span className="font-bold ml-1" style={{ color: "#f97316" }}>+{advanceRollResult}</span>
                    )}
                  </label>
                  <button
                    onClick={() => { setMoveUnit(null); setMoveAdvance(false); setSelectedMarkerId(null); }}
                    className="w-full py-1.5 rounded-lg text-xs"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Click a friendly unit to select it, then click a destination cell.
                </p>
              )}
            </>
          )}

          {/* Transport panel */}
          {reservesMode === 'idle' && (() => {
            const activeTransports = markers.filter(
              (m) => m.player === activeSide && !m.isDestroyed && !m.isInReserve && !m.isEmbarked && isTransportUnit(m)
            );
            const inReserveTransports = markers.filter(
              (m) => m.player === activeSide && !m.isDestroyed && m.isInReserve && isTransportUnit(m)
            );
            if (activeTransports.length === 0 && inReserveTransports.length === 0) return null;
            return (
              <div>
                <p className="text-[10px] uppercase tracking-widest mt-2 mb-1" style={{ color: "#10b981" }}>
                  Transports
                </p>
                <div className="space-y-2">
                  {activeTransports.map((transport) => {
                    const embarked = (transportContents[transport.id] ?? [])
                      .map((uid) => markers.find((m) => m.id === uid))
                      .filter(Boolean) as typeof markers;
                    const capacity = getTransportCapacity(transport);
                    const nearbyInfantry = markers.filter((m) =>
                      m.player === activeSide &&
                      !m.isDestroyed &&
                      !m.isInReserve &&
                      !m.isEmbarked &&
                      !m.isAttached &&
                      !isTransportUnit(m) &&
                      (m.keywords ?? []).some((k) => k.toUpperCase().includes("INFANTRY")) &&
                      Math.sqrt((m.x - transport.x) ** 2 + (m.y - transport.y) ** 2) <= 3 &&
                      !movedThisTurn.includes(m.id)
                    );
                    return (
                      <div key={transport.id} className="rounded-lg p-2" style={{ backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold" style={{ color: "#10b981" }}>
                            📦 {transport.unitName}
                          </span>
                          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                            {embarked.length}/{capacity}
                          </span>
                        </div>
                        {embarked.length > 0 && (
                          <div className="mb-1 space-y-0.5">
                            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Embarked</p>
                            {embarked.map((unit) => (
                              <div key={unit.id} className="flex items-center gap-1">
                                <span className="flex-1 text-[10px] truncate" style={{ color: "var(--text-primary)" }}>{unit.unitName}</span>
                                <button
                                  onClick={() => handleDisembark(unit.id, transport.id)}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                                  style={{ backgroundColor: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}
                                >
                                  Disembark
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {nearbyInfantry.length > 0 && embarked.length < capacity && (
                          <div className="space-y-0.5">
                            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Nearby infantry (≤3")</p>
                            {nearbyInfantry.map((unit) => (
                              <div key={unit.id} className="flex items-center gap-1">
                                <span className="flex-1 text-[10px] truncate" style={{ color: "var(--text-primary)" }}>{unit.unitName}</span>
                                <button
                                  onClick={() => handleEmbark(unit.id, transport.id)}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                                  style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                                >
                                  Embark
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {nearbyInfantry.length === 0 && embarked.length === 0 && (
                          <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>No infantry within 3"</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Drop Pod pre-loading (in reserve) */}
                  {inReserveTransports.filter(isDropPod).map((dp) => {
                    const embarked = (transportContents[dp.id] ?? [])
                      .map((uid) => markers.find((m) => m.id === uid))
                      .filter(Boolean) as typeof markers;
                    const capacity = getTransportCapacity(dp);
                    const loadableUnits = markers.filter((m) =>
                      m.player === activeSide && !m.isDestroyed && m.isInReserve && !m.isEmbarked && !isTransportUnit(m)
                    );
                    return (
                      <div key={dp.id} className="rounded-lg p-2" style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold" style={{ color: "#818cf8" }}>
                            🚀 {dp.unitName} (Reserve)
                          </span>
                          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                            {embarked.length}/{capacity}
                          </span>
                        </div>
                        {embarked.length > 0 && (
                          <div className="mb-1 space-y-0.5">
                            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Loading</p>
                            {embarked.map((unit) => (
                              <div key={unit.id} className="flex items-center gap-1">
                                <span className="flex-1 text-[10px] truncate" style={{ color: "var(--text-primary)" }}>{unit.unitName}</span>
                                <button
                                  onClick={() => {
                                    setTransportContents((prev) => ({
                                      ...prev,
                                      [dp.id]: (prev[dp.id] ?? []).filter((id) => id !== unit.id),
                                    }));
                                    setMarkers((prev) => prev.map((m) => m.id === unit.id ? { ...m, isEmbarked: false, embarkTransportId: undefined } : m));
                                    addLog(`${unit.unitName} unloaded from ${dp.unitName}.`, unit.player);
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                                >
                                  Unload
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {loadableUnits.length > 0 && embarked.length < capacity && (
                          <div className="space-y-0.5">
                            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Load from Reserve</p>
                            {loadableUnits.map((unit) => (
                              <div key={unit.id} className="flex items-center gap-1">
                                <span className="flex-1 text-[10px] truncate" style={{ color: "var(--text-primary)" }}>{unit.unitName}</span>
                                <button
                                  onClick={() => {
                                    setTransportContents((prev) => ({
                                      ...prev,
                                      [dp.id]: [...(prev[dp.id] ?? []), unit.id],
                                    }));
                                    setMarkers((prev) => prev.map((m) => m.id === unit.id ? { ...m, isEmbarked: true, embarkTransportId: dp.id } : m));
                                    addLog(`${unit.unitName} loaded into ${dp.unitName} (will disembark on landing).`, unit.player);
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                                  style={{ backgroundColor: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
                                >
                                  Load
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Strategic Reserves panel */}
          {reservedForActive.length > 0 && reservesMode === 'idle' && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mt-2 mb-1" style={{ color: "#a855f7" }}>
                Strategic Reserves
              </p>
              <div className="space-y-1.5">
                {reservedForActive.map((m) => {
                  const isDeepStrike = (m.keywords ?? []).some((k) => k.toLowerCase() === "deep strike");
                  const unitHomer = teleportHomers.find((h) => h.forMarkerId === m.id);
                  const available = round >= 2;
                  return (
                    <div key={m.id} className="rounded-lg p-2" style={{ backgroundColor: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.18)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.unitName}</span>
                        {unitHomer && <span className="text-[9px] ml-1 flex-shrink-0" style={{ color: "#eab308" }}>📡 Homer</span>}
                      </div>
                      {!available ? (
                        <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Available Round 2+</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => { setReservesUnitId(m.id); setReservesMode('place_normal'); }}
                            className="w-full py-1 rounded text-[10px] font-semibold"
                            style={{ backgroundColor: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}
                          >
                            📦 Deploy (board edge)
                          </button>
                          {isDeepStrike && (
                            <button
                              onClick={() => { setReservesUnitId(m.id); setReservesMode('place_deepstrike'); }}
                              className="w-full py-1 rounded text-[10px] font-semibold"
                              style={{ backgroundColor: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
                            >
                              🎯 Deep Strike (9"+ from enemies)
                            </button>
                          )}
                          {unitHomer && (
                            <button
                              onClick={() => { setReservesUnitId(m.id); setReservesMode('place_homer'); }}
                              className="w-full py-1 rounded text-[10px] font-semibold"
                              style={{ backgroundColor: "rgba(234,179,8,0.12)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}
                            >
                              📡 Homer Arrival (6" of beacon, 3"+ from enemies)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={advancePhase}
            className="w-full py-2 rounded-lg text-xs font-semibold mt-2"
            style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.35)" }}
          >
            End Movement Phase →
          </button>
        </div>
      );
    }

    if (gamePhase === "shooting") {
      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Shooting Phase
          </p>
          {combat.step === "idle" && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Click a friendly unit to shoot with it.
            </p>
          )}
          {combat.step === "selectWeapon" && combatAttacker && (
            <div>
              <p className="text-xs mb-1 font-semibold" style={{ color: "#d97706" }}>
                {combatAttacker.unitName} — Fire weapons:
              </p>
              <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
                Select each weapon to fire, then click Done Shooting.
              </p>
              <div className="space-y-1">
                {(() => {
                  const rangedWeapons = combatAttacker.weapons
                    .map((w, origIdx) => ({ w, origIdx }))
                    .filter(({ w }) => w.type !== "Melee");
                  // Detect which weapons are "grouped" (share a base name slot, e.g. plasma modes)
                  const getBaseName = (name: string) => {
                    const i = name.indexOf(" ("); return i >= 0 ? name.slice(0, i) : name;
                  };
                  return rangedWeapons.map(({ w, origIdx }) => {
                    const baseName = getBaseName(w.name);
                    const isFired = weaponsFiredThisShot.has(origIdx) ||
                      rangedWeapons.some(({ w: o, origIdx: oi }) =>
                        oi !== origIdx && weaponsFiredThisShot.has(oi) &&
                        (getBaseName(o.name) === baseName || getBaseName(w.name) === getBaseName(o.name))
                      );
                    return (
                      <button
                        key={origIdx}
                        disabled={isFired}
                        onClick={() => setCombat((prev) => ({ ...prev, weaponIdx: origIdx, step: "selectTarget" }))}
                        className="w-full text-left px-2 py-1.5 rounded text-xs"
                        style={{
                          backgroundColor: isFired ? "rgba(255,255,255,0.03)" : "rgba(217,119,6,0.1)",
                          color: isFired ? "var(--text-muted)" : "var(--text-primary)",
                          border: `1px solid ${isFired ? "rgba(255,255,255,0.06)" : "rgba(217,119,6,0.2)"}`,
                          opacity: isFired ? 0.6 : 1,
                          cursor: isFired ? "default" : "pointer",
                        }}
                      >
                        <span className="font-medium">{isFired ? "✓ " : ""}{w.name}</span>
                        <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                          {w.range} A{w.attacks} S{w.strength} AP{w.ap} D{w.damage}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
              <button
                onClick={doneShooting}
                className="w-full py-1.5 rounded-lg text-xs font-semibold mt-2"
                style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                ✓ Done Shooting
              </button>
              <button
                onClick={() => { setCombat(INIT_COMBAT); setWeaponsFiredThisShot(new Set()); setSelectedMarkerId(null); }}
                className="w-full py-1 rounded-lg text-xs mt-1"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                ← Cancel
              </button>
            </div>
          )}
          {combat.step === "selectTarget" && (
            <div>
              <p className="text-xs mb-2" style={{ color: "#d97706" }}>
                Click an enemy unit to target.
              </p>
              <button
                onClick={() => setCombat((prev) => ({ ...prev, weaponIdx: null, step: "selectWeapon" }))}
                className="w-full py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                ← Back
              </button>
            </div>
          )}
          {combat.step === "hitRolls" && (
            <button
              onClick={resolveHitRolls}
              className="w-full py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <Dice6 size={12} className="inline mr-1" /> Roll to Hit
            </button>
          )}
          {combat.step === "woundRolls" && (
            <button
              onClick={resolveWoundRolls}
              className="w-full py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <Dice6 size={12} className="inline mr-1" /> Roll to Wound ({combat.hits} dice)
            </button>
          )}
          {combat.step === "saveRolls" && (
            <button
              onClick={resolveSaveRolls}
              className="w-full py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <Shield size={12} className="inline mr-1" /> Roll Saves ({combat.wounds} dice)
            </button>
          )}
          {combat.step === "done" && (
            <div className="py-2 text-xs text-center" style={{ color: "#22c55e" }}>
              ✓ Shooting resolved — {combat.totalDamage} damage dealt.
            </div>
          )}
          <button
            onClick={advancePhase}
            className="w-full py-2 rounded-lg text-xs font-semibold mt-2"
            style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.35)" }}
          >
            End Shooting Phase →
          </button>
        </div>
      );
    }

    if (gamePhase === "charge") {
      const chargeMoveAttacker = chargeMove ? markers.find((m) => m.id === chargeMove.unitId) : null;
      const chargeMoveTarget = chargeMove ? markers.find((m) => m.id === chargeMove.targetId) : null;
      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Charge Phase
          </p>
          {chargeMove && chargeMoveAttacker && chargeMoveTarget && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: "#4ade80" }}>
                ⚔️ Charge move — max {chargeMove.maxDist}"
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Click a cell within {chargeMove.maxDist}" to place {chargeMoveAttacker.unitName} in base contact with {chargeMoveTarget.unitName}.
              </p>
              <button
                onClick={() => { setChargeMove(null); setCombat(INIT_COMBAT); setSelectedMarkerId(null); addLog("Charge move cancelled.", "system"); }}
                className="w-full py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Cancel Charge Move
              </button>
            </div>
          )}
          {!chargeMove && combat.step === "idle" && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Click a friendly unit to declare a charge. Then click the target (must be within 12").
            </p>
          )}
          {!chargeMove && combat.step === "selectTarget" && combatAttacker && (
            <p className="text-xs" style={{ color: "#d97706" }}>
              {combatAttacker.unitName} charging — click enemy target within 12".
            </p>
          )}
          {!chargeMove && (
            <button
              onClick={advancePhase}
              className="w-full py-2 rounded-lg text-xs font-semibold mt-2"
              style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.35)" }}
            >
              End Charge Phase →
            </button>
          )}
        </div>
      );
    }

    if (gamePhase === "fight") {
      const isFightback = combat.isFightback ?? false;
      const fightAttacker = markers.find((m) => m.id === combat.attackerId);
      const fightTarget = markers.find((m) => m.id === combat.targetId);
      return (
        <div className="space-y-2">
          {fightPhaseStep === 'fightback' ? (
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#3b82f6" }}>
              ⚔️ FIGHT-BACK
            </p>
          ) : (
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Fight Phase
            </p>
          )}

          {combat.step === "idle" && fightPhaseStep === 'active' && (
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Click a friendly unit (with melee weapons) to fight. Charged units fight first.
              </p>
              <button
                onClick={() => {
                  setFightPhaseStep('fightback');
                  setFightBackMode(true);
                  addLog(`${activePlayer} done fighting — fight-back phase begins.`, "system");
                }}
                className="w-full py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
              >
                Done Fighting →
              </button>
            </div>
          )}

          {combat.step === "idle" && fightPhaseStep === 'fightback' && (
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "#3b82f6" }}>
                {activePlayer === "P1" ? "P2" : "P1"}: click an engaged unit to fight back.
              </p>
              <button
                onClick={advancePhase}
                className="w-full py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.35)" }}
              >
                End Fight Phase →
              </button>
            </div>
          )}

          {combat.step === "selectWeapon" && fightAttacker && (
            <div>
              <p className="text-xs mb-1 font-semibold" style={{ color: isFightback ? "#3b82f6" : "#ef4444" }}>
                {isFightback ? `⚔ ${fightAttacker.unitName} fights back!` : `${fightAttacker.unitName} — Select melee weapon:`}
              </p>
              {isFightback && fightTarget && (
                <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                  Striking back at {fightTarget.unitName}
                </p>
              )}
              <div className="space-y-1">
                {fightAttacker.weapons
                  .map((w, origIdx) => ({ w, origIdx }))
                  .filter(({ w }) => w.type === "Melee")
                  .map(({ w, origIdx }) => (
                    <button
                      key={origIdx}
                      onClick={() => setCombat((prev) => ({
                        ...prev,
                        weaponIdx: origIdx,
                        step: "selectTarget",
                      }))}
                      className="w-full text-left px-2 py-1.5 rounded text-xs"
                      style={{ backgroundColor: "rgba(220,38,38,0.1)", color: "var(--text-primary)", border: "1px solid rgba(220,38,38,0.2)" }}
                    >
                      <span className="font-medium">{w.name}</span>
                      <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                        A{w.attacks} WS{w.skill} S{w.strength} AP{w.ap} D{w.damage}
                      </span>
                    </button>
                  ))}
              </div>
              <button
                onClick={() => { setCombat(INIT_COMBAT); setSelectedMarkerId(null); }}
                className="w-full py-1.5 rounded-lg text-xs mt-2"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                ← Back
              </button>
            </div>
          )}

          {combat.step === "selectTarget" && fightAttacker && (
            <div>
              <p className="text-xs mb-2" style={{ color: "#d97706" }}>
                {fightAttacker.unitName} — click an enemy within 1&quot; to fight.
              </p>
              <button
                onClick={() => setCombat((prev) => ({ ...prev, weaponIdx: null, step: "selectWeapon" }))}
                className="w-full py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                ← Back
              </button>
            </div>
          )}

          {combat.step === "hitRolls" && (
            <button
              onClick={resolveHitRolls}
              className="w-full py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <Dice6 size={12} className="inline mr-1" /> Roll to Hit {isFightback ? "(Fight Back)" : ""}
            </button>
          )}

          {combat.step === "woundRolls" && (
            <button
              onClick={resolveWoundRolls}
              className="w-full py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <Dice6 size={12} className="inline mr-1" /> Roll to Wound ({combat.hits} dice)
            </button>
          )}

          {combat.step === "saveRolls" && (
            <button
              onClick={resolveSaveRolls}
              className="w-full py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <Shield size={12} className="inline mr-1" /> Roll Saves ({combat.wounds} dice)
            </button>
          )}

          {combat.step === "done" && (
            <div className="py-2 text-xs text-center" style={{ color: "#22c55e" }}>
              ✓ Combat resolved.
            </div>
          )}
        </div>
      );
    }

    // TODO: Battle-shock (10th ed morale replacement): units below half-strength test on Leadership;
    // on fail, they cannot use special abilities until the end of the phase.

    if (gamePhase === "scoring") {
      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            End of Round {round}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Both players have scored VP for objectives they controlled at end of their turn.
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--text-primary)" }}>
            P1: {p1Vp} VP · P2: {p2Vp} VP
          </p>
          <button
            onClick={endRound}
            className="w-full py-2 rounded-lg text-xs font-semibold mt-2"
            style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
          >
            {round >= 5 ? "End Battle" : `Begin Round ${round + 1} →`}
          </button>
        </div>
      );
    }

    return null;
  }

  // ── Multiplayer: can the current browser take actions? ───────────────────────
  // In solo mode, always yes. In 2player: yes only when it's your turn.
  const canAct =
    gameMode === "solo" ||
    localRole === "loading" || // before role is determined, optimistically allow
    (localRole === "P1" &&
      (roomPhase !== "game" || activePlayer === "P1") &&
      (roomPhase !== "deployment" || deployDeployer === "P1")) ||
    (localRole === "P2" &&
      (roomPhase !== "game" || activePlayer === "P2") &&
      (roomPhase !== "deployment" || deployDeployer === "P2"));

  // ── Render: Loading ──────────────────────────────────────────────────────────

  if (roomPhase === "loading") {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <Navigation />
        <Loader2 size={32} className="animate-spin mt-20" style={{ color: "#d97706" }} />
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Loading game…
        </p>
      </div>
    );
  }

  // ── Render: Finished ─────────────────────────────────────────────────────────

  if (roomPhase === "finished") {
    const winner = p1Vp > p2Vp ? "P1" : p2Vp > p1Vp ? "P2" : null;
    return (
      <div
        className="h-screen flex flex-col"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#d97706" }}>
            Battle Complete
          </p>
          <h1 className="font-cinzel text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
            {winner ? `${winner} Victorious!` : "Honourable Draw"}
          </h1>
          <div className="flex gap-8">
            {[
              { label: "P1", vp: p1Vp, color: "#ef4444" },
              { label: "P2", vp: p2Vp, color: "#3b82f6" },
            ].map(({ label, vp, color }) => (
              <div key={label} className="text-center">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color }}>
                  {label}
                </p>
                <p className="font-cinzel text-5xl font-bold" style={{ color }}>
                  {vp}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Victory Points
                </p>
              </div>
            ))}
          </div>
          <a
            href="/warhammer"
            className="mt-4 px-6 py-3 rounded-xl text-sm font-cinzel font-semibold"
            style={{ backgroundColor: "rgba(220,38,38,0.18)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.4)" }}
          >
            Return to Hub
          </a>
        </div>
      </div>
    );
  }

  // ── Render: Rolloff ──────────────────────────────────────────────────────────

  if (roomPhase === "rolloff") {
    return (
      <div
        className="h-screen flex flex-col"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <Navigation />
        {/* Game code banner — shown in rolloff so P1 can share and P2 can see they joined */}
        {gameMode === "2player" && gameCode && (
          <div
            className="flex items-center justify-center gap-3 py-2 px-4 text-sm"
            style={{ backgroundColor: "rgba(124,58,237,0.12)", borderBottom: "1px solid rgba(124,58,237,0.25)" }}
          >
            <Users size={14} style={{ color: "#a78bfa" }} />
            <span style={{ color: "var(--text-muted)" }}>Game Code:</span>
            <span className="font-mono font-bold tracking-widest text-base" style={{ color: "#a78bfa" }}>
              {gameCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(gameCode);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
              style={{ color: codeCopied ? "#4ade80" : "#a78bfa", backgroundColor: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              {codeCopied ? <Check size={11} /> : <Copy size={11} />}
              {codeCopied ? "Copied!" : "Copy"}
            </button>
            {!p2UserId && localRole === "P1" && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <Clock size={12} />
                Waiting for Player 2…
              </span>
            )}
            {p2UserId && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#4ade80" }}>
                <Wifi size={12} />
                Player 2 connected
              </span>
            )}
          </div>
        )}
        <RolloffPhase gameName={gameName} onComplete={handleRolloffComplete} />
      </div>
    );
  }

  // ── Render: Deployment + Game ────────────────────────────────────────────────

  const isDeployment = roomPhase === "deployment";

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <Navigation />

      {/* ── Top bar ── */}
      <div
        className="flex items-center gap-3 px-4 h-12 flex-shrink-0 overflow-x-auto"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h1 className="font-cinzel font-bold text-sm whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
          {gameName}
        </h1>
        <div className="h-4 w-px flex-shrink-0" style={{ backgroundColor: "var(--border-subtle)" }} />

        {isDeployment ? (
          <span className="text-xs font-bold" style={{ color: "#22c55e" }}>
            Deployment Phase
          </span>
        ) : (
          <>
            <span className="text-xs font-bold flex-shrink-0" style={{ color: "#d97706" }}>
              Round {round}/5
            </span>
            {gamePhase !== "scoring" && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: activePlayer === "P1" ? "rgba(220,38,38,0.2)" : "rgba(37,99,235,0.2)",
                  color: activePlayer === "P1" ? "#f87171" : "#60a5fa",
                  border: `1px solid ${activePlayer === "P1" ? "rgba(220,38,38,0.5)" : "rgba(37,99,235,0.5)"}`,
                }}
              >
                {activePlayer === "P1" ? "Player 1's Turn" : "Player 2's Turn"}
              </span>
            )}
            <div className="flex gap-1 flex-shrink-0">
              {GAME_PHASES.map((p) => {
                const Icon = PHASE_ICONS[p];
                return (
                  <span
                    key={p}
                    className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all"
                    style={
                      p === gamePhase
                        ? { backgroundColor: "rgba(217,119,6,0.2)", color: "#d97706", border: "1px solid rgba(217,119,6,0.5)" }
                        : { color: "var(--text-muted)", opacity: 0.5 }
                    }
                  >
                    <Icon size={10} />
                    {PHASE_LABELS[p]}
                  </span>
                );
              })}
            </div>
          </>
        )}

        <div className="ml-auto flex gap-2 flex-shrink-0 items-center">
          {/* Undo / Redo buttons */}
          {roomPhase === "game" && (
            <>
              <button
                onClick={undoAction}
                disabled={history.length === 0}
                title="Undo last action"
                className="p-1.5 rounded flex items-center gap-1 text-xs transition-opacity"
                style={{
                  opacity: history.length === 0 ? 0.3 : 1,
                  color: "var(--text-muted)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <RotateCcw size={12} />
                <span>Undo</span>
              </button>
              <button
                onClick={redoAction}
                disabled={future.length === 0}
                title="Redo last undone action"
                className="p-1.5 rounded flex items-center gap-1 text-xs transition-opacity"
                style={{
                  opacity: future.length === 0 ? 0.3 : 1,
                  color: "var(--text-muted)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <RotateCw size={12} />
                <span>Redo</span>
              </button>
              <button
                onClick={() => setShowMeasurementLine((v) => !v)}
                title="Toggle measurement line"
                className="p-1.5 rounded flex items-center gap-1 text-xs"
                style={{
                  color: showMeasurementLine ? "#d97706" : "var(--text-muted)",
                  backgroundColor: showMeasurementLine ? "rgba(217,119,6,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${showMeasurementLine ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <span>📏</span>
              </button>
            </>
          )}
          {/* AI thinking indicator */}
          {isAIGame && activePlayer === "P2" && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.35)" }}>
              {aiThinking && (
                <svg className="animate-spin" width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2.5}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              <span className="text-xs font-medium" style={{ color: "#60a5fa" }}>
                {aiThinking ? "AI thinking…" : "AI's turn"}
              </span>
            </div>
          )}
          {isAIGame && activePlayer === "P1" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)" }}>
              vs AI
            </span>
          )}
          {/* Multiplayer: role badge + syncing indicator */}
          {gameMode === "2player" && localRole !== "loading" && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: localRole === "P1" ? "rgba(220,38,38,0.15)" : localRole === "P2" ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.06)",
                  color: localRole === "P1" ? "#f87171" : localRole === "P2" ? "#60a5fa" : "var(--text-muted)",
                  border: `1px solid ${localRole === "P1" ? "rgba(220,38,38,0.4)" : localRole === "P2" ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {localRole === "P1" ? "You: P1" : localRole === "P2" ? "You: P2" : "Spectator"}
              </span>
              {isSyncing && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Loader2 size={10} className="animate-spin" />
                  syncing…
                </span>
              )}
            </div>
          )}
          {/* Solo side toggle */}
          {gameMode === "solo" && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Playing as</span>
              <div
                className="flex items-center rounded-full p-0.5"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {(["P1", "P2"] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setSoloSide(side)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={
                      soloSide === side
                        ? { backgroundColor: "rgba(217,119,6,0.3)", color: "#d97706" }
                        : { color: "var(--text-muted)" }
                    }
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Waiting for opponent overlay (2-player only, non-active player) ── */}
      {gameMode === "2player" && !canAct && roomPhase === "game" && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center pb-8 pointer-events-none"
          aria-live="polite"
        >
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl"
            style={{
              backgroundColor: "rgba(15,15,20,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Clock size={16} style={{ color: "#a78bfa" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Waiting for {activePlayer === "P1" ? "Player 1" : "Player 2"}…
            </span>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: "#a78bfa", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        </div>
      )}

      {/* ── Transparent interaction blocker when it's not your turn ── */}
      {gameMode === "2player" && !canAct && (
        <div className="fixed inset-0 z-30 pointer-events-auto" aria-hidden />
      )}

      {/* ── Main columns ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        {isDeployment ? (
          <DeploymentPanel
            undeployedMarkers={undeployedMarkers}
            currentDeployer={deployDeployer}
            selectedId={deploySelectedId}
            onSelect={setDeploySelectedId}
            onReserve={handleReserve}
            onEndDeployment={startGame}
            allDone={deployAllDone}
            pendingHomerUnit={pendingHomerForMarkerId ? markers.find((m) => m.id === pendingHomerForMarkerId) : null}
          />
        ) : (
          <div
            className="w-60 flex-shrink-0 flex flex-col overflow-y-auto"
            style={{ borderRight: "1px solid var(--border-subtle)" }}
          >
            {/* P1 panel */}
            <div
              className="p-3"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                ...(gameMode === "solo" && soloSide === "P1"
                  ? { boxShadow: "inset 2px 0 0 #d97706", backgroundColor: "rgba(217,119,6,0.04)" }
                  : {}),
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--text-muted)" }}>
                  {p1ArmyName}
                </span>
              </div>
              <div className="flex gap-3 mb-2">
                {[
                  { label: "CP", val: p1Cp, set: setP1Cp, logInc: "P1 gained 1 CP", logDec: "P1 spent 1 CP", color: "#3b82f6" },
                  { label: "VP", val: p1Vp, set: setP1Vp, logInc: "P1 VP +1", logDec: "P1 VP -1", color: "#3b82f6" },
                ].map(({ label, val, set, logInc, logDec, color }) => (
                  <div key={label} className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { set((n) => Math.max(0, n - 1)); addLog(logDec, "P1"); }}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        <Minus size={8} />
                      </button>
                      <span className="text-xl font-cinzel font-bold w-7 text-center" style={{ color }}>
                        {val}
                      </span>
                      <button
                        onClick={() => { set((n) => n + 1); addLog(logInc, "P1"); }}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        <Plus size={8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* P1 Command Phase Abilities */}
              {gamePhase === "command" && activePlayer === "P1" && p1FactionRules.some(r => r.id === "sm-oath-of-moment" || r.id === "da-oath-of-moment" || r.id === "tyr-synaptic-imperative" || r.id === "nec-awakened-dynasty") && (
                <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
                  <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#d97706" }}>⚔️ Command Abilities</p>

                  {p1FactionRules.some(r => r.id === "sm-oath-of-moment" || r.id === "da-oath-of-moment") && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>Oath of Moment</p>
                      {oathTarget ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] flex-1" style={{ color: "#93c5fd" }}>✅ {markers.find((m) => m.id === oathTarget)?.unitName ?? "—"}</span>
                          <button onClick={() => { setOathTarget(null); setCommandAbilityUsed(false); addLog("Oath of Moment target cleared.", "P1"); }}
                            className="text-[9px] px-1 rounded" style={{ color: "#f87171", backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)" }}>✕</button>
                        </div>
                      ) : oathSelectionMode ? (
                        <div>
                          <p className="text-[9px] mb-1 font-medium" style={{ color: "#fbbf24" }}>Click an enemy unit to designate</p>
                          <button onClick={() => setOathSelectionMode(false)} className="text-[9px] px-2 py-0.5 rounded"
                            style={{ color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
                        </div>
                      ) : !commandAbilityUsed ? (
                        <button onClick={() => setOathSelectionMode(true)} className="px-2 py-1 rounded text-[9px] w-full"
                          style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                          Select Target Unit
                        </button>
                      ) : null}
                    </div>
                  )}

                  {p1FactionRules.some(r => r.id === "tyr-synaptic-imperative") && markers.some((m) => m.player === "P1" && !m.isDestroyed && !m.isInReserve && findUnit(m.faction, m.unitId)?.keywords?.some((k) => k.toLowerCase() === "synapse")) && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>Synaptic Imperative</p>
                      <p className="text-[9px] mb-1" style={{ color: "#93c5fd" }}>Active: {synapticImperative ?? "None"}</p>
                      {showSynapticPicker ? (
                        <div className="space-y-0.5">
                          {["Aggressive Expansion", "Lurk and Feed", "Without Number"].map((opt) => (
                            <button key={opt} onClick={() => { setSynapticImperative(opt); setShowSynapticPicker(false); addLog(`P1 Synaptic Imperative: "${opt}".`, "P1"); }}
                              className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                              style={{ backgroundColor: opt === synapticImperative ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.06)", color: "#93c5fd" }}>{opt}</button>
                          ))}
                          <button onClick={() => setShowSynapticPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowSynapticPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                          style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                          {synapticImperative ? "Change Imperative" : "Choose Imperative"}
                        </button>
                      )}
                    </div>
                  )}

                  {p1FactionRules.some(r => r.id === "nec-awakened-dynasty") && !commandAbilityUsed && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>Dynastic Protocol</p>
                      <p className="text-[9px] mb-1" style={{ color: "#93c5fd" }}>Protocol: {necronProtocol ?? "None chosen"}</p>
                      {showNecronProtocolPicker ? (
                        <div className="space-y-0.5">
                          {["Protocol of the Eternal Guardian", "Protocol of the Conquering Tyrant"].map((opt) => (
                            <button key={opt} onClick={() => { setNecronProtocol(opt); setShowNecronProtocolPicker(false); setCommandAbilityUsed(true); addLog(`P1 Awakened Dynasty: "${opt}" active.`, "P1"); }}
                              className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                              style={{ backgroundColor: opt === necronProtocol ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.06)", color: "#93c5fd" }}>{opt}</button>
                          ))}
                          <button onClick={() => setShowNecronProtocolPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowNecronProtocolPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                          style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                          {necronProtocol ? "Active this turn" : "Activate Protocol"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* P1 Stratagems */}
              <button
                onClick={() => setP1StratOpen((x) => !x)}
                className="flex items-center justify-between w-full text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="flex items-center gap-1"><Scroll size={10} />Stratagems</span>
                {p1StratOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {p1StratOpen && (
                <div className="mt-1.5 space-y-1">
                  {STRATAGEMS.filter((s) => {
                    const phaseOk = s.phase === "Any" || s.phase.toLowerCase() === gamePhase;
                    const facOk = !s.factionFilter || s.factionFilter.some((f) => p1FactionRules.some((r) => r.faction === f));
                    return phaseOk && facOk;
                  }).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => beginStratagem("P1", s)}
                      disabled={p1Cp < s.cost}
                      className="w-full text-left px-2 py-1.5 rounded text-[10px]"
                      style={{ backgroundColor: s.isPsychic ? "rgba(139,92,246,0.08)" : "rgba(59,130,246,0.06)", border: `1px solid ${s.isPsychic ? "rgba(139,92,246,0.25)" : "rgba(59,130,246,0.12)"}`, opacity: p1Cp < s.cost ? 0.45 : 1 }}
                    >
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium flex items-center gap-1" style={{ color: s.isPsychic ? "#c4b5fd" : "#93c5fd" }}>
                          {s.name}
                          {s.isPsychic && <span className="text-[8px] px-1 rounded" style={{ backgroundColor: "rgba(139,92,246,0.3)", color: "#c4b5fd" }}>Psychic</span>}
                        </span>
                        <span style={{ color: "#eab308" }}>{s.cost}CP</span>
                      </div>
                      <span style={{ color: "var(--text-muted)" }}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* P1 Faction Rules */}
              {p1FactionRules.length > 0 && (
                <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <button
                    onClick={() => setP1FactionRulesOpen((x) => !x)}
                    className="flex items-center justify-between w-full text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span className="flex items-center gap-1"><BookOpen size={10} />Faction Rules</span>
                    {p1FactionRulesOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                  {p1FactionRulesOpen && (
                    <div className="mt-1.5 space-y-2">
                      {p1FactionRules.map((rule) => (
                        <div key={rule.id} className="px-2 py-1.5 rounded text-[10px]"
                          style={{ backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-medium" style={{ color: "#93c5fd" }}>{rule.name}</span>
                            <span className="text-[9px] px-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                              {rule.trigger.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="leading-relaxed mb-1" style={{ color: "var(--text-muted)" }}>{rule.description}</p>
                          {(rule.id === "sm-oath-of-moment" || rule.id === "da-oath-of-moment") && gamePhase === "command" && activePlayer === "P1" && (
                            <div className="pt-1 mt-0.5" style={{ borderTop: "1px solid rgba(59,130,246,0.15)" }}>
                              <p className="text-[9px] mb-1" style={{ color: "#93c5fd" }}>
                                Target: {oathTarget ? (markers.find((m) => m.id === oathTarget)?.unitName ?? "—") : "None set"}
                              </p>
                              {showOathPicker ? (
                                <div className="space-y-0.5">
                                  {markers.filter((m) => m.player === "P2" && !m.isDestroyed && !m.isInReserve && !m.isAttached).map((m) => (
                                    <button key={m.id} onClick={() => { setOathTarget(m.id); setShowOathPicker(false); addLog(`P1 Oath of Moment: targeting ${m.unitName}.`, "P1"); }}
                                      className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                                      style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#93c5fd" }}>{m.unitName}</button>
                                  ))}
                                  <button onClick={() => setShowOathPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setShowOathPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                                  style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                                  {oathTarget ? "Change Target" : "Set Target"}
                                </button>
                              )}
                            </div>
                          )}
                          {rule.id === "tyr-synaptic-imperative" && gamePhase === "command" && activePlayer === "P1" &&
                            markers.some((m) => m.player === "P1" && !m.isDestroyed && !m.isInReserve &&
                              findUnit(m.faction, m.unitId)?.keywords?.some((k) => k.toLowerCase() === "synapse")) && (
                            <div className="pt-1 mt-0.5" style={{ borderTop: "1px solid rgba(59,130,246,0.15)" }}>
                              <p className="text-[9px] mb-1" style={{ color: "#93c5fd" }}>Active: {synapticImperative ?? "None"}</p>
                              {showSynapticPicker ? (
                                <div className="space-y-0.5">
                                  {["Aggressive Expansion", "Lurk and Feed", "Without Number"].map((opt) => (
                                    <button key={opt} onClick={() => { setSynapticImperative(opt); setShowSynapticPicker(false); addLog(`P1 Synaptic Imperative: "${opt}".`, "P1"); }}
                                      className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                                      style={{ backgroundColor: opt === synapticImperative ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.06)", color: "#93c5fd" }}>{opt}</button>
                                  ))}
                                  <button onClick={() => setShowSynapticPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setShowSynapticPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                                  style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                                  {synapticImperative ? "Change Imperative" : "Choose Imperative"}
                                </button>
                              )}
                            </div>
                          )}
                          {rule.id === "nec-awakened-dynasty" && gamePhase === "command" && activePlayer === "P1" && !commandAbilityUsed && (
                            <div className="pt-1 mt-0.5" style={{ borderTop: "1px solid rgba(59,130,246,0.15)" }}>
                              <p className="text-[9px] mb-1" style={{ color: "#93c5fd" }}>Protocol: {necronProtocol ?? "None chosen"}</p>
                              {showNecronProtocolPicker ? (
                                <div className="space-y-0.5">
                                  {["Protocol of the Eternal Guardian", "Protocol of the Conquering Tyrant"].map((opt) => (
                                    <button key={opt} onClick={() => { setNecronProtocol(opt); setShowNecronProtocolPicker(false); setCommandAbilityUsed(true); addLog(`P1 Awakened Dynasty: "${opt}" active.`, "P1"); }}
                                      className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                                      style={{ backgroundColor: opt === necronProtocol ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.06)", color: "#93c5fd" }}>{opt}</button>
                                  ))}
                                  <button onClick={() => setShowNecronProtocolPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setShowNecronProtocolPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                                  style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                                  {necronProtocol ? "Active this turn" : "Activate Protocol"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* P2 panel */}
            <div
              className="p-3"
              style={
                gameMode === "solo" && soloSide === "P2"
                  ? { boxShadow: "inset 2px 0 0 #d97706", backgroundColor: "rgba(217,119,6,0.04)" }
                  : {}
              }
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--text-muted)" }}>
                  {p2ArmyName}
                </span>
              </div>
              <div className="flex gap-3 mb-2">
                {[
                  { label: "CP", val: p2Cp, set: setP2Cp, logInc: "P2 gained 1 CP", logDec: "P2 spent 1 CP", color: "#ef4444" },
                  { label: "VP", val: p2Vp, set: setP2Vp, logInc: "P2 VP +1", logDec: "P2 VP -1", color: "#ef4444" },
                ].map(({ label, val, set, logInc, logDec, color }) => (
                  <div key={label} className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { set((n) => Math.max(0, n - 1)); addLog(logDec, "P2"); }}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        <Minus size={8} />
                      </button>
                      <span className="text-xl font-cinzel font-bold w-7 text-center" style={{ color }}>
                        {val}
                      </span>
                      <button
                        onClick={() => { set((n) => n + 1); addLog(logInc, "P2"); }}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        <Plus size={8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* P2 Command Phase Abilities */}
              {gamePhase === "command" && activePlayer === "P2" && p2FactionRules.some(r => r.id === "sm-oath-of-moment" || r.id === "da-oath-of-moment" || r.id === "tyr-synaptic-imperative" || r.id === "nec-awakened-dynasty") && (
                <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
                  <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#d97706" }}>⚔️ Command Abilities</p>

                  {p2FactionRules.some(r => r.id === "sm-oath-of-moment" || r.id === "da-oath-of-moment") && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>Oath of Moment</p>
                      {oathTarget ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] flex-1" style={{ color: "#fca5a5" }}>✅ {markers.find((m) => m.id === oathTarget)?.unitName ?? "—"}</span>
                          <button onClick={() => { setOathTarget(null); setCommandAbilityUsed(false); addLog("Oath of Moment target cleared.", "P2"); }}
                            className="text-[9px] px-1 rounded" style={{ color: "#f87171", backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)" }}>✕</button>
                        </div>
                      ) : oathSelectionMode ? (
                        <div>
                          <p className="text-[9px] mb-1 font-medium" style={{ color: "#fbbf24" }}>Click an enemy unit to designate</p>
                          <button onClick={() => setOathSelectionMode(false)} className="text-[9px] px-2 py-0.5 rounded"
                            style={{ color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
                        </div>
                      ) : !commandAbilityUsed ? (
                        <button onClick={() => setOathSelectionMode(true)} className="px-2 py-1 rounded text-[9px] w-full"
                          style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                          Select Target Unit
                        </button>
                      ) : null}
                    </div>
                  )}

                  {p2FactionRules.some(r => r.id === "tyr-synaptic-imperative") && markers.some((m) => m.player === "P2" && !m.isDestroyed && !m.isInReserve && findUnit(m.faction, m.unitId)?.keywords?.some((k) => k.toLowerCase() === "synapse")) && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>Synaptic Imperative</p>
                      <p className="text-[9px] mb-1" style={{ color: "#fca5a5" }}>Active: {synapticImperative ?? "None"}</p>
                      {showSynapticPicker ? (
                        <div className="space-y-0.5">
                          {["Aggressive Expansion", "Lurk and Feed", "Without Number"].map((opt) => (
                            <button key={opt} onClick={() => { setSynapticImperative(opt); setShowSynapticPicker(false); addLog(`P2 Synaptic Imperative: "${opt}".`, "P2"); }}
                              className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                              style={{ backgroundColor: opt === synapticImperative ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.06)", color: "#fca5a5" }}>{opt}</button>
                          ))}
                          <button onClick={() => setShowSynapticPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowSynapticPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                          style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                          {synapticImperative ? "Change Imperative" : "Choose Imperative"}
                        </button>
                      )}
                    </div>
                  )}

                  {p2FactionRules.some(r => r.id === "nec-awakened-dynasty") && !commandAbilityUsed && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>Dynastic Protocol</p>
                      <p className="text-[9px] mb-1" style={{ color: "#fca5a5" }}>Protocol: {necronProtocol ?? "None chosen"}</p>
                      {showNecronProtocolPicker ? (
                        <div className="space-y-0.5">
                          {["Protocol of the Eternal Guardian", "Protocol of the Conquering Tyrant"].map((opt) => (
                            <button key={opt} onClick={() => { setNecronProtocol(opt); setShowNecronProtocolPicker(false); setCommandAbilityUsed(true); addLog(`P2 Awakened Dynasty: "${opt}" active.`, "P2"); }}
                              className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                              style={{ backgroundColor: opt === necronProtocol ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.06)", color: "#fca5a5" }}>{opt}</button>
                          ))}
                          <button onClick={() => setShowNecronProtocolPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowNecronProtocolPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                          style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                          {necronProtocol ? "Active this turn" : "Activate Protocol"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setP2StratOpen((x) => !x)}
                className="flex items-center justify-between w-full text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Stratagems</span>
                {p2StratOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {p2StratOpen && (
                <div className="mt-1.5 space-y-1">
                  {STRATAGEMS.filter((s) => {
                    const phaseOk = s.phase === "Any" || s.phase.toLowerCase() === gamePhase;
                    const facOk = !s.factionFilter || s.factionFilter.some((f) => p2FactionRules.some((r) => r.faction === f));
                    return phaseOk && facOk;
                  }).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => beginStratagem("P2", s)}
                      disabled={p2Cp < s.cost}
                      className="w-full text-left px-2 py-1.5 rounded text-[10px]"
                      style={{ backgroundColor: s.isPsychic ? "rgba(139,92,246,0.08)" : "rgba(239,68,68,0.06)", border: `1px solid ${s.isPsychic ? "rgba(139,92,246,0.25)" : "rgba(239,68,68,0.12)"}`, opacity: p2Cp < s.cost ? 0.45 : 1 }}
                    >
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium flex items-center gap-1" style={{ color: s.isPsychic ? "#c4b5fd" : "#fca5a5" }}>
                          {s.name}
                          {s.isPsychic && <span className="text-[8px] px-1 rounded" style={{ backgroundColor: "rgba(139,92,246,0.3)", color: "#c4b5fd" }}>Psychic</span>}
                        </span>
                        <span style={{ color: "#eab308" }}>{s.cost}CP</span>
                      </div>
                      <span style={{ color: "var(--text-muted)" }}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* P2 Faction Rules */}
              {p2FactionRules.length > 0 && (
                <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <button
                    onClick={() => setP2FactionRulesOpen((x) => !x)}
                    className="flex items-center justify-between w-full text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span className="flex items-center gap-1"><BookOpen size={10} />Faction Rules</span>
                    {p2FactionRulesOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                  {p2FactionRulesOpen && (
                    <div className="mt-1.5 space-y-2">
                      {p2FactionRules.map((rule) => (
                        <div key={rule.id} className="px-2 py-1.5 rounded text-[10px]"
                          style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-medium" style={{ color: "#fca5a5" }}>{rule.name}</span>
                            <span className="text-[9px] px-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                              {rule.trigger.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="leading-relaxed mb-1" style={{ color: "var(--text-muted)" }}>{rule.description}</p>
                          {(rule.id === "sm-oath-of-moment" || rule.id === "da-oath-of-moment") && gamePhase === "command" && activePlayer === "P2" && (
                            <div className="pt-1 mt-0.5" style={{ borderTop: "1px solid rgba(239,68,68,0.15)" }}>
                              <p className="text-[9px] mb-1" style={{ color: "#fca5a5" }}>
                                Target: {oathTarget ? (markers.find((m) => m.id === oathTarget)?.unitName ?? "—") : "None set"}
                              </p>
                              {showOathPicker ? (
                                <div className="space-y-0.5">
                                  {markers.filter((m) => m.player === "P1" && !m.isDestroyed && !m.isInReserve && !m.isAttached).map((m) => (
                                    <button key={m.id} onClick={() => { setOathTarget(m.id); setShowOathPicker(false); addLog(`P2 Oath of Moment: targeting ${m.unitName}.`, "P2"); }}
                                      className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                                      style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>{m.unitName}</button>
                                  ))}
                                  <button onClick={() => setShowOathPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setShowOathPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                                  {oathTarget ? "Change Target" : "Set Target"}
                                </button>
                              )}
                            </div>
                          )}
                          {rule.id === "tyr-synaptic-imperative" && gamePhase === "command" && activePlayer === "P2" &&
                            markers.some((m) => m.player === "P2" && !m.isDestroyed && !m.isInReserve &&
                              findUnit(m.faction, m.unitId)?.keywords?.some((k) => k.toLowerCase() === "synapse")) && (
                            <div className="pt-1 mt-0.5" style={{ borderTop: "1px solid rgba(239,68,68,0.15)" }}>
                              <p className="text-[9px] mb-1" style={{ color: "#fca5a5" }}>Active: {synapticImperative ?? "None"}</p>
                              {showSynapticPicker ? (
                                <div className="space-y-0.5">
                                  {["Aggressive Expansion", "Lurk and Feed", "Without Number"].map((opt) => (
                                    <button key={opt} onClick={() => { setSynapticImperative(opt); setShowSynapticPicker(false); addLog(`P2 Synaptic Imperative: "${opt}".`, "P2"); }}
                                      className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                                      style={{ backgroundColor: opt === synapticImperative ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.06)", color: "#fca5a5" }}>{opt}</button>
                                  ))}
                                  <button onClick={() => setShowSynapticPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setShowSynapticPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                                  {synapticImperative ? "Change Imperative" : "Choose Imperative"}
                                </button>
                              )}
                            </div>
                          )}
                          {rule.id === "nec-awakened-dynasty" && gamePhase === "command" && activePlayer === "P2" && !commandAbilityUsed && (
                            <div className="pt-1 mt-0.5" style={{ borderTop: "1px solid rgba(239,68,68,0.15)" }}>
                              <p className="text-[9px] mb-1" style={{ color: "#fca5a5" }}>Protocol: {necronProtocol ?? "None chosen"}</p>
                              {showNecronProtocolPicker ? (
                                <div className="space-y-0.5">
                                  {["Protocol of the Eternal Guardian", "Protocol of the Conquering Tyrant"].map((opt) => (
                                    <button key={opt} onClick={() => { setNecronProtocol(opt); setShowNecronProtocolPicker(false); setCommandAbilityUsed(true); addLog(`P2 Awakened Dynasty: "${opt}" active.`, "P2"); }}
                                      className="w-full text-left px-1.5 py-1 rounded text-[9px]"
                                      style={{ backgroundColor: opt === necronProtocol ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.06)", color: "#fca5a5" }}>{opt}</button>
                                  ))}
                                  <button onClick={() => setShowNecronProtocolPicker(false)} className="text-[9px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setShowNecronProtocolPicker(true)} className="px-2 py-1 rounded text-[9px] w-full"
                                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                                  {necronProtocol ? "Active this turn" : "Activate Protocol"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Units list (game phase) */}
            <div className="p-3 flex-1 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                Units on Board
              </p>
              {markers
                .filter((m) => !m.isDestroyed && !m.isInReserve && !m.isEmbarked)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMarkerId((prev) => (prev === m.id ? null : m.id))}
                    className="w-full text-left px-2 py-1.5 rounded-lg mb-1 text-xs"
                    style={{
                      backgroundColor:
                        selectedMarkerId === m.id
                          ? m.player === "P1"
                            ? "rgba(220,38,38,0.15)"
                            : "rgba(37,99,235,0.15)"
                          : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        selectedMarkerId === m.id
                          ? m.player === "P1"
                            ? "rgba(220,38,38,0.4)"
                            : "rgba(37,99,235,0.4)"
                          : "rgba(255,255,255,0.05)"
                      }`,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.player === "P1" ? "#ef4444" : "#3b82f6" }}
                      />
                      <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                        {m.unitName}
                      </span>
                      {m.battleShocked && <Zap size={9} style={{ color: "#facc15" }} />}
                      <span
                        className="text-[10px]"
                        style={{ color: m.currentWounds / m.maxWounds > 0.5 ? "#4ade80" : "#f87171" }}
                      >
                        {m.currentWounds}W
                      </span>
                    </div>
                  </button>
                ))}
              {/* Embarked units */}
              {(() => {
                const embarked = markers.filter((m) => m.isEmbarked && !m.isDestroyed);
                if (embarked.length === 0) return null;
                return (
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                      In Transports
                    </p>
                    {embarked.map((m) => {
                      const transport = markers.find((t) => t.id === m.embarkTransportId);
                      return (
                        <div key={m.id} className="w-full px-2 py-1 rounded-lg mb-0.5 text-xs"
                          style={{ backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: m.player === "P1" ? "#ef4444" : "#3b82f6" }} />
                            <span className="flex-1 truncate text-[10px]" style={{ color: "var(--text-muted)" }}>{m.unitName}</span>
                            <span className="text-[9px]" style={{ color: "#10b981" }}>📦 {transport?.unitName ?? "transport"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {/* In-reserve units */}
              {(() => {
                const inReserve = markers.filter((m) => m.isInReserve && !m.isDestroyed && !m.isEmbarked);
                if (inReserve.length === 0) return null;
                return (
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Archive size={9} />Reserves
                      <span className="ml-auto px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                        {inReserve.length}
                      </span>
                    </p>
                    {inReserve.map((m) => {
                      const isDeepStrikeUnit = (m.keywords ?? []).some((k) => k.toLowerCase() === "deep strike");
                      const canDeployNow = gamePhase === "movement" && m.player === activeSide && reservesMode === "idle" && round >= 2;
                      const availableNextMovement = gamePhase !== "movement" && m.player === activeSide;
                      return (
                        <div key={m.id} className="w-full px-2 py-1 rounded-lg mb-0.5 text-xs flex flex-col gap-0.5"
                          style={{ backgroundColor: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)" }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: m.player === "P1" ? "#ef4444" : "#3b82f6" }} />
                            <span className="flex-1 truncate text-[10px]" style={{ color: "var(--text-muted)" }}>{m.unitName}</span>
                            <span className="text-[9px]" style={{ color: "#fbbf24" }}>Reserve</span>
                          </div>
                          {canDeployNow && (
                            <div className="flex gap-1 mt-0.5">
                              <button
                                onClick={() => { setReservesUnitId(m.id); setReservesMode("place_normal"); }}
                                className="flex-1 py-1 rounded text-[9px] font-semibold"
                                style={{ backgroundColor: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}
                              >
                                Deploy
                              </button>
                              {isDeepStrikeUnit && (
                                <button
                                  onClick={() => { setReservesUnitId(m.id); setReservesMode("place_deepstrike"); }}
                                  className="flex-1 py-1 rounded text-[9px] font-semibold"
                                  style={{ backgroundColor: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
                                >
                                  Deep Strike
                                </button>
                              )}
                            </div>
                          )}
                          {availableNextMovement && (
                            <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Deploy in Movement phase</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── CENTER — Board ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {(() => {
            // Compute which player controls each objective for ring colouring
            const captureR = 3;
            const activeM = markers.filter((m) => !m.isDestroyed && !m.isInReserve && !m.isAttached && !m.isEmbarked);
            const objectiveControl: ('P1' | 'P2' | null)[] = mapPreset.objectives.map((obj) => {
              const p1n = activeM.filter(
                (m) => m.player === "P1" &&
                       !m.battleShocked &&
                       Math.sqrt((m.x+0.5-obj.x)**2 + (m.y+0.5-obj.y)**2) <= captureR
              );
              const p2n = activeM.filter(
                (m) => m.player === "P2" &&
                       !m.battleShocked &&
                       Math.sqrt((m.x+0.5-obj.x)**2 + (m.y+0.5-obj.y)**2) <= captureR
              );
              if (p1n.length > 0 && p2n.length === 0) return "P1";
              if (p2n.length > 0 && p1n.length === 0) return "P2";
              if (p1n.length > p2n.length) return "P1";
              if (p2n.length > p1n.length) return "P2";
              return null;
            });
            // Compute green overlay for valid reserves placement cells
            let reservesHighlightCells: Set<string> | undefined;
            if (reservesMode !== 'idle') {
              reservesHighlightCells = new Set<string>();
              const activeMarkersCells = markers.filter((m) => !m.isDestroyed && !m.isInReserve);
              if (reservesMode === 'place_deepstrike') {
                const enemies = activeMarkersCells.filter((m) => m.player !== activePlayer);
                for (let cx = 0; cx < 60; cx++) {
                  for (let cy = 0; cy < BOARD_H_CONST; cy++) {
                    const tooClose = enemies.some((e) => Math.sqrt((cx - e.x) ** 2 + (cy - e.y) ** 2) < 9);
                    if (!tooClose) reservesHighlightCells.add(`${cx},${cy}`);
                  }
                }
              } else if (mapPreset.deploymentType === 'dawn_of_war') {
                const zone = activePlayer === "P1" ? mapPreset.p1Zone : mapPreset.p2Zone;
                for (let cy = 0; cy < BOARD_H_CONST; cy++) {
                  if (activePlayer === "P1") {
                    for (let cx = 0; cx < zone.x + zone.w + 6; cx++) reservesHighlightCells.add(`${cx},${cy}`);
                  } else {
                    for (let cx = Math.max(0, zone.x - 6); cx < 60; cx++) reservesHighlightCells.add(`${cx},${cy}`);
                  }
                }
              } else {
                if (activePlayer === "P1") {
                  for (let cx = 0; cx < 60; cx++)
                    for (let cy = BOARD_H_CONST - 6; cy < BOARD_H_CONST; cy++)
                      reservesHighlightCells.add(`${cx},${cy}`);
                } else {
                  for (let cx = 0; cx < 60; cx++)
                    for (let cy = 0; cy < 6; cy++)
                      reservesHighlightCells.add(`${cx},${cy}`);
                }
              }
            }

            return (
              <Warhammer40kBoard
                markers={markers.filter((m) => !m.isInReserve)}
                selectedMarkerId={selectedMarkerId ?? deploySelectedId}
                onCellClick={handleCellClick}
                onUnitClick={handleUnitClick}
                phase={isDeployment ? "deployment" : gamePhase}
                activePlayer={activeSide}
                terrain={mapPreset.terrain}
                objectives={mapPreset.objectives}
                rangeIndicators={rangeIndicators}
                deploymentDepth={mapPreset.deploymentDepth}
                p1Zone={mapPreset.p1Zone}
                p2Zone={mapPreset.p2Zone}
                objectiveControl={objectiveControl}
                showMeasurementLine={showMeasurementLine}
                actedThisTurn={[...movedThisTurn, ...shotThisTurn, ...chargedThisTurn, ...foughtThisTurn]}
                reservesHighlightCells={reservesHighlightCells}
                oathTargetId={oathTarget ?? undefined}
                teleportHomers={teleportHomers}
                reservesHighlight={
                  pendingHomerForMarkerId
                    ? { type: 'deployment_zone', player: (markers.find((m) => m.id === pendingHomerForMarkerId)?.player ?? 'P1') as 'P1' | 'P2', zone: markers.find((m) => m.id === pendingHomerForMarkerId)?.player === 'P1' ? mapPreset.p1Zone : mapPreset.p2Zone }
                    : reservesMode === 'place_normal'
                    ? { type: 'board_edge', player: (markers.find((m) => m.id === reservesUnitId)?.player ?? 'P1') as 'P1' | 'P2', zone: markers.find((m) => m.id === reservesUnitId)?.player === 'P1' ? mapPreset.p1Zone : mapPreset.p2Zone }
                    : reservesMode === 'place_homer'
                    ? (() => { const h = teleportHomers.find((th) => th.forMarkerId === reservesUnitId); return h ? { type: 'homer' as const, player: (h.placedBy) as 'P1' | 'P2', homerX: h.x, homerY: h.y } : undefined; })()
                    : undefined
                }
                activeAnimation={activeAnimation ?? undefined}
                onAnimationComplete={handleAnimationComplete}
              />
            );
          })()}
          <DiceRollerPopup
            request={diceRequest}
            onDismiss={dismissDice}
            onReroll={() => {
              const activeCp = activePlayer === "P1" ? p1Cp : p2Cp;
              if (activeCp < 1) { addLog("No CP available for Command Re-roll.", "system"); return; }
              if (activePlayer === "P1") setP1Cp((n) => n - 1);
              else setP2Cp((n) => n - 1);
              addLog(`${activePlayer} spends 1 CP — Command Re-roll!`, activePlayer);
              rerollDice();
            }}
            rerollCp={activePlayer === "P1" ? p1Cp : p2Cp}
          />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="w-64 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          {/* Phase action panel (game only) */}
          {!isDeployment && (
            <div
              className="p-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <PhasePanel />
            </div>
          )}

          {/* Deployment actions */}
          {isDeployment && deploySelectedId && (
            <div
              className="p-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                Selected: <strong style={{ color: "var(--text-primary)" }}>
                  {markers.find((m) => m.id === deploySelectedId)?.unitName}
                </strong>
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Click in your deployment zone to place.
              </p>
            </div>
          )}

          {/* VP progress */}
          {(() => {
            const captureRSide = 3;
            const activeMSide = markers.filter((m) => !m.isDestroyed && !m.isInReserve && !m.isAttached && !m.isEmbarked);
            const objControlSide = mapPreset.objectives.map((obj) => {
              const p1n = activeMSide.filter((m) => m.player === "P1" && !m.battleShocked && Math.sqrt((m.x+0.5-obj.x)**2+(m.y+0.5-obj.y)**2) <= captureRSide);
              const p2n = activeMSide.filter((m) => m.player === "P2" && !m.battleShocked && Math.sqrt((m.x+0.5-obj.x)**2+(m.y+0.5-obj.y)**2) <= captureRSide);
              if (p1n.length > 0 && p2n.length === 0) return "P1" as const;
              if (p2n.length > 0 && p1n.length === 0) return "P2" as const;
              if (p1n.length > p2n.length) return "P1" as const;
              if (p2n.length > p1n.length) return "P2" as const;
              return null;
            });
            const p1ObjHeld = objControlSide.filter((c) => c === "P1").length;
            const p2ObjHeld = objControlSide.filter((c) => c === "P2").length;
            const vpCap = 85;
            const p1Won = p1Vp >= vpCap;
            const p2Won = p2Vp >= vpCap;
            return (
              <>
                {(p1Won || p2Won) && (
                  <div className="mx-3 mt-2 mb-1 p-2 rounded-lg text-center animate-pulse" style={{ backgroundColor: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.5)" }}>
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#fbbf24" }}>
                      ⚔ VICTORY ⚔
                    </p>
                    <p className="text-xs font-cinzel font-bold mt-0.5" style={{ color: "#fbbf24" }}>
                      {p1Won && p2Won ? "Both players at 85+ VP!" : p1Won ? "P1 reaches 85 VP!" : "P2 reaches 85 VP!"}
                    </p>
                  </div>
                )}
                <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                    Victory Points
                  </p>
                  {[
                    { label: "P1", vp: p1Vp, objHeld: p1ObjHeld, color: "#ef4444" },
                    { label: "P2", vp: p2Vp, objHeld: p2ObjHeld, color: "#3b82f6" },
                  ].map(({ label, vp, objHeld, color }) => (
                    <div key={label} className="mb-2">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span style={{ color }}>
                          {label}
                          <span className="ml-1.5 text-[9px] font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {objHeld}/{mapPreset.objectives.length} obj
                          </span>
                        </span>
                        <span className="font-bold" style={{ color }}>{vp}/85</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min((vp / 85) * 100, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* Tactical Missions */}
          {roomPhase === "game" && (p1Hand.length > 0 || p2Hand.length > 0 || p1Scored.length > 0 || p2Scored.length > 0) && (
            <div className="flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => setTacticalMissionsOpen((x) => !x)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="flex items-center gap-1.5">
                  <Scroll size={10} />
                  <span>Tactical Missions</span>
                  <span className="px-1.5 rounded-full text-[9px]" style={{ backgroundColor: "rgba(217,119,6,0.2)", color: "#d97706" }}>
                    {p1SecondaryVp + p2SecondaryVp > 0 ? `${p1SecondaryVp}/${p2SecondaryVp}` : `${p1Hand.length + p2Hand.length} cards`}
                  </span>
                </span>
                {tacticalMissionsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {tacticalMissionsOpen && (
                <div className="px-3 pb-3 space-y-3">
                  {/* P1 hand */}
                  {(p1Hand.length > 0 || p1Scored.length > 0) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "#ef4444" }}>P1 Missions</span>
                        <span className="text-[10px]" style={{ color: "#d97706" }}>2°VP: {p1SecondaryVp}</span>
                      </div>
                      <div className="space-y-1">
                        {p1Hand.map((card) => (
                          <div key={card.id} className="px-2 py-1.5 rounded text-[10px]"
                            style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                            <div className="flex items-start justify-between gap-1 mb-0.5">
                              <span className="font-medium" style={{ color: "#fca5a5" }}>{card.name}</span>
                              <span className="text-[9px] px-1 rounded flex-shrink-0" style={{ backgroundColor: "rgba(217,119,6,0.2)", color: "#d97706" }}>+{card.vp}VP</span>
                            </div>
                            <p className="mb-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{card.scoreCondition}</p>
                            <button
                              onClick={() => scoreMission("P1", card)}
                              className="w-full py-1 rounded text-[9px] font-semibold"
                              style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
                            >Score</button>
                          </div>
                        ))}
                        {p1Scored.map((card) => (
                          <div key={card.id} className="px-2 py-1 rounded text-[10px] flex items-center justify-between"
                            style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                            <span style={{ color: "#4ade80" }}>✓ {card.name}</span>
                            <span style={{ color: "#4ade80" }}>+{card.vp}VP</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* P2 hand */}
                  {(p2Hand.length > 0 || p2Scored.length > 0) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "#3b82f6" }}>P2 Missions</span>
                        <span className="text-[10px]" style={{ color: "#d97706" }}>2°VP: {p2SecondaryVp}</span>
                      </div>
                      <div className="space-y-1">
                        {p2Hand.map((card) => (
                          <div key={card.id} className="px-2 py-1.5 rounded text-[10px]"
                            style={{ backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                            <div className="flex items-start justify-between gap-1 mb-0.5">
                              <span className="font-medium" style={{ color: "#93c5fd" }}>{card.name}</span>
                              <span className="text-[9px] px-1 rounded flex-shrink-0" style={{ backgroundColor: "rgba(217,119,6,0.2)", color: "#d97706" }}>+{card.vp}VP</span>
                            </div>
                            <p className="mb-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{card.scoreCondition}</p>
                            <button
                              onClick={() => scoreMission("P2", card)}
                              className="w-full py-1 rounded text-[9px] font-semibold"
                              style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}
                            >Score</button>
                          </div>
                        ))}
                        {p2Scored.map((card) => (
                          <div key={card.id} className="px-2 py-1 rounded text-[10px] flex items-center justify-between"
                            style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                            <span style={{ color: "#4ade80" }}>✓ {card.name}</span>
                            <span style={{ color: "#4ade80" }}>+{card.vp}VP</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dice roller */}
          <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <DiceRoller />
          </div>

          {/* Activity Log */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5 flex-shrink-0">
              <Activity size={11} style={{ color: "var(--text-muted)" }} />
              <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Battle Log
              </span>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {actLog.map((entry, i) => (
                <div key={i} className="flex gap-2 text-[10px]">
                  <span className="flex-shrink-0 tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {entry.time}
                  </span>
                  <span
                    style={{
                      color:
                        entry.player === "P1"
                          ? "#fca5a5"
                          : entry.player === "P2"
                          ? "#93c5fd"
                          : "var(--text-muted)",
                    }}
                  >
                    {entry.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Overwatch modal ── */}
      {overwatchPrompt && (() => {
        const defender = markers.find((m) => m.id === overwatchPrompt.targetId);
        const defCp = defender?.player === "P1" ? p1Cp : p2Cp;
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0,0,0,0.72)" }}>
            <div className="rounded-xl p-6 space-y-4 max-w-xs w-full mx-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
              <p className="font-cinzel font-bold text-base" style={{ color: "var(--text-primary)" }}>Overwatch?</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {defender?.unitName} is being charged. Spend 1 CP to fire Overwatch (hits on 6s) before the charge roll? {defender?.player} has {defCp} CP.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => confirmOverwatch(true)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "rgba(220,38,38,0.18)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.4)" }}
                >
                  Spend 1 CP
                </button>
                <button
                  onClick={() => confirmOverwatch(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Stacked unit picker ── */}
      {stackedPicker && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setStackedPicker(null)}>
          <div className="rounded-xl p-4 space-y-2 max-w-xs w-full mx-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}
            onClick={(e) => e.stopPropagation()}>
            <p className="font-cinzel font-bold text-sm" style={{ color: "var(--text-primary)" }}>Select Unit</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Multiple units are stacked here — choose one:</p>
            {stackedPicker.unitIds.map((uid) => {
              const u = markers.find((m) => m.id === uid);
              if (!u) return null;
              return (
                <button
                  key={uid}
                  onClick={() => { setStackedPicker(null); handleUnitClick(uid); }}
                  className="w-full py-2 px-3 rounded-lg text-xs text-left flex items-center gap-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: u.player === "P1" ? "#3b82f6" : "#ef4444" }} />
                  <span className="font-semibold">{u.unitName}</span>
                  <span className="ml-auto" style={{ color: "var(--text-muted)" }}>{u.player}</span>
                </button>
              );
            })}
            <button onClick={() => setStackedPicker(null)} className="w-full py-1.5 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Active state banner ── */}
      {roomPhase === "game" && (oathTarget || synapticImperative || necronProtocol || activeStratagem) && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 flex gap-2 flex-wrap justify-center">
          {oathTarget && (
            <div className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#6ee7b7" }}>
              <Target size={10} />
              Oath: {markers.find((m) => m.id === oathTarget)?.unitName ?? "—"}
              <button onClick={() => setOathTarget(null)} className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}
          {synapticImperative && (
            <div className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.35)", color: "#c4b5fd" }}>
              <Star size={10} />
              Synaptic: {synapticImperative}
              <button onClick={() => setSynapticImperative(null)} className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}
          {necronProtocol && (
            <div className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)", color: "#fde047" }}>
              <Shield size={10} />
              {necronProtocol}
            </div>
          )}
          {activeStratagem && (
            <div className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
              <Scroll size={10} />
              Stratagem: {activeStratagem.name}
              <button onClick={() => { setActiveStratagem(null); if (activeStratagem.player === "P1") setP1Cp((n) => n + (STRATAGEMS.find((s) => s.name === activeStratagem.name)?.cost ?? 0)); else setP2Cp((n) => n + (STRATAGEMS.find((s) => s.name === activeStratagem.name)?.cost ?? 0)); }}
                className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}
        </div>
      )}

      {/* ── Stratagem unit/target selection modal ── */}
      {activeStratagem && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0,0,0,0.72)" }}>
          <div className="rounded-xl p-5 space-y-3 max-w-xs w-full mx-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
            <p className="font-cinzel font-bold text-sm" style={{ color: "var(--text-primary)" }}>{activeStratagem.name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{activeStratagem.description}</p>
            {activeStratagem.step === "select_unit" && (() => {
              const stratDef = STRATAGEMS.find((s) => s.name === activeStratagem.name);
              const eligible = stratDef?.unitFilter
                ? markers.filter((m) => stratDef.unitFilter!(m, activeStratagem.player) && !m.isDestroyed)
                : markers.filter((m) => m.player === activeStratagem.player && !m.isDestroyed);
              return (
                <>
                  <p className="text-xs font-medium" style={{ color: "#93c5fd" }}>Select a unit:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {eligible.map((m) => (
                      <button key={m.id}
                        onClick={() => {
                          if (stratDef?.requiresTarget) {
                            setActiveStratagem({ ...activeStratagem, step: "select_target", unitId: m.id });
                          } else {
                            resolveStratagemEffect(activeStratagem.name, activeStratagem.effect, activeStratagem.player, m.id, null);
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs"
                        style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "var(--text-primary)", border: "1px solid rgba(59,130,246,0.18)" }}
                      >
                        {m.unitName} <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>({m.player})</span>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
            {activeStratagem.step === "select_target" && (
              <>
                <p className="text-xs font-medium" style={{ color: "#fca5a5" }}>Select a target:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {markers.filter((m) => m.player !== activeStratagem.player && !m.isDestroyed && !m.isInReserve).map((m) => (
                    <button key={m.id}
                      onClick={() => resolveStratagemEffect(activeStratagem.name, activeStratagem.effect, activeStratagem.player, activeStratagem.unitId, m.id)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs"
                      style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "var(--text-primary)", border: "1px solid rgba(239,68,68,0.18)" }}
                    >
                      {m.unitName}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => { setActiveStratagem(null); const strat = STRATAGEMS.find((s) => s.name === activeStratagem.name); if (strat) { if (activeStratagem.player === "P1") setP1Cp((n) => n + strat.cost); else setP2Cp((n) => n + strat.cost); } }}
              className="w-full py-1.5 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>
              Cancel (refund CP)
            </button>
          </div>
        </div>
      )}

      {/* ── Battle-shock modal ── */}
      {battleShockPhase && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0,0,0,0.78)" }}>
          <div className="rounded-xl p-5 space-y-3 max-w-sm w-full mx-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
            <p className="font-cinzel font-bold text-base flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Zap size={16} style={{ color: "#facc15" }} />Battle-shock Tests
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {activePlayer}&apos;s units below half-strength must test on 2D6 vs Leadership.
            </p>
            <div className="space-y-2">
              {battleShockQueue.map((uid) => {
                const unit = markers.find((m) => m.id === uid);
                if (!unit) return null;
                const tested = battleShockTested.has(uid);
                const result = battleShockResults[uid];
                const ldNum = parseInt(unit.stats?.leadership ?? "7");
                return (
                  <div key={uid} className="px-3 py-2 rounded-lg text-xs"
                    style={{ backgroundColor: tested ? (result ? "rgba(239,68,68,0.12)" : "rgba(74,222,128,0.1)") : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: "var(--text-primary)" }}>{unit.unitName}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Ld {ldNum}+</span>
                    </div>
                    {!tested ? (
                      <button
                        onClick={() => {
                          const r1 = d6(); const r2 = d6(); const total = r1 + r2;
                          const shocked = total > ldNum;
                          setBattleShockTested((prev) => new Set([...prev, uid]));
                          setBattleShockResults((prev) => ({ ...prev, [uid]: shocked }));
                          setMarkers((prev) => prev.map((m) => m.id === uid ? { ...m, battleShocked: shocked, belowHalfStrength: true } : m));
                          addLog(`Battle-shock: ${unit.unitName} — 2D6 (${r1}+${r2}=${total}) vs Ld${ldNum}+ → ${shocked ? "SHOCKED!" : "holds."}`, activePlayer);
                        }}
                        className="mt-1.5 w-full py-1.5 rounded text-[10px] font-semibold"
                        style={{ backgroundColor: "rgba(250,204,21,0.15)", color: "#facc15", border: "1px solid rgba(250,204,21,0.3)" }}>
                        <Dice6 size={10} className="inline mr-1" />Roll Test
                      </button>
                    ) : (
                      <p className="mt-1 text-[11px] font-bold" style={{ color: result ? "#f87171" : "#4ade80" }}>
                        {result ? "⚡ SHOCKED" : "✓ PASSED"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {battleShockQueue.every((uid) => battleShockTested.has(uid)) && (
              <button
                onClick={() => {
                  setBattleShockPhase(false);
                  const afterShock = markers; // already updated via setMarkers in each roll
                  finishAfterBattleShock(afterShock);
                }}
                className="w-full py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Reserves placement error toast ── */}
      {reservesError && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-semibold pointer-events-none z-50"
          style={{ backgroundColor: "rgba(220,38,38,0.92)", border: "1px solid rgba(248,113,113,0.5)", color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}
        >
          {reservesError}
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium pointer-events-none z-50 flex items-center gap-2"
          style={{ backgroundColor: "rgba(30,30,30,0.95)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-primary)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}
        >
          <RotateCcw size={14} />
          Action undone
        </div>
      )}
    </div>
  );
}
