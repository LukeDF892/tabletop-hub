"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import Warhammer40kBoard from "@/components/game/Warhammer40kBoard";
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
import type { BaseSize } from "@/lib/wh40k/gameTypes";
import { DiceRollerPopup, useDiceRoller } from "@/components/game/DiceRollerPopup";
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
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_H_CONST = 44; // board height in inches

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
  units: { entries: { unitId: string; modelCount: number; quantity: number; attachedLeaderId?: string }[] };
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

      markers.push({
        id: uid,
        unitId: entry.unitId,
        unitName: unit.name,
        player,
        x: 0,
        y: 0,
        currentWounds: unit.stats.wounds,
        maxWounds: unit.stats.wounds,
        stats: unit.stats,
        weapons: unit.weapons,
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
        onClick={() => setResults(Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1))}
        className="w-full py-1.5 rounded-lg text-xs font-semibold mb-2"
        style={{ backgroundColor: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)", color: "#d97706" }}
      >
        Roll {count}d{sides}
      </button>
      {results.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {results.map((r, i) => (
            <span
              key={i}
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: r === sides ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.06)",
                color: r === sides ? "#eab308" : "var(--text-primary)",
                border: `1px solid ${r === sides ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.08)"}`,
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
}

function DeploymentPanel({
  undeployedMarkers,
  currentDeployer,
  selectedId,
  onSelect,
  onReserve,
  onEndDeployment,
  allDone,
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
        <p
          className="text-sm font-semibold"
          style={{ color: currentDeployer === "P1" ? "#ef4444" : "#3b82f6" }}
        >
          {currentDeployer} deploys
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Click unit → click deployment zone
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
  woundRolls: number[];
  wounds: number;
  saveRolls: number[];
  unsavedWounds: number;
  totalDamage: number;
}

const INIT_COMBAT: CombatState = {
  step: "idle",
  attackerId: null,
  weaponIdx: null,
  targetId: null,
  hitRolls: [],
  hits: 0,
  woundRolls: [],
  wounds: 0,
  saveRolls: [],
  unsavedWounds: 0,
  totalDamage: 0,
};

// ─── Main Game Room ───────────────────────────────────────────────────────────

export default function WarhammerGameRoom() {
  const { id } = useParams<{ id: string }>();

  // ── Shared state ──
  const [roomPhase, setRoomPhase] = useState<RoomPhase>("loading");
  const [gameName, setGameName] = useState("Loading…");
  const [gameMode, setGameMode] = useState<"solo" | "2player">("2player");
  const [soloSide, setSoloSide] = useState<"P1" | "P2">("P1");
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
  const { request: diceRequest, showRoll, dismiss: dismissDice } = useDiceRoller();

  // ── Stratagem panels ──
  const [p1StratOpen, setP1StratOpen] = useState(false);
  const [p2StratOpen, setP2StratOpen] = useState(false);

  function addLog(text: string, player?: "P1" | "P2" | "system") {
    setActLog((prev) => [...prev, { time: nowTime(), text, player }]);
    setTimeout(() => logRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 50);
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
      const mode = game.game_mode === "solo" ? "solo" : "2player";
      setGameMode(mode);

      const savedState = game.game_state as Record<string, unknown> | null;
      if (savedState) {
        if (typeof savedState.round === "number") setRound(savedState.round);
        if (typeof savedState.p1Cp === "number") setP1Cp(savedState.p1Cp);
        if (typeof savedState.p2Cp === "number") setP2Cp(savedState.p2Cp);
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
        if (typeof savedState.mapPresetId === "string") {
          setMapPreset(getPresetById(savedState.mapPresetId));
        }
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
          addLog(`P1 army loaded: ${a1.name} (${p1Markers.length} units)`, "system");
        }
        if (a2) {
          setP2ArmyName(`P2 · ${a2.faction}`);
          const p2Markers = buildMarkers(a2 as ArmyRow, "P2");
          armyMarkers.push(...p2Markers);
          addLog(`P2 army loaded: ${a2.name} (${p2Markers.length} units)`, "system");
        }
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
    const channel = supabase.channel(`game:${id}`);

    channel
      .on("broadcast", { event: "state_sync" }, (payload) => {
        const s = payload.payload as {
          markers?: UnitMarker[];
          round?: number;
          gamePhase?: GamePhase;
          activePlayer?: "P1" | "P2";
          p1Cp?: number;
          p2Cp?: number;
          p1Vp?: number;
          p2Vp?: number;
          roomPhase?: RoomPhase;
        };
        if (s.markers) setMarkers(s.markers);
        if (s.round) setRound(s.round);
        if (s.gamePhase) setGamePhase(s.gamePhase);
        if (s.activePlayer) setActivePlayer(s.activePlayer);
        if (s.p1Cp !== undefined) setP1Cp(s.p1Cp);
        if (s.p2Cp !== undefined) setP2Cp(s.p2Cp);
        if (s.p1Vp !== undefined) setP1Vp(s.p1Vp);
        if (s.p2Vp !== undefined) setP2Vp(s.p2Vp);
        if (s.roomPhase) setRoomPhase(s.roomPhase);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
  }

  // ── Deployment ──
  const undeployedMarkers = markers.filter((m) => m.isInReserve && !m.isDestroyed);
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

    let updatedMarkers = markers.map((m) => {
      if (m.id === deploySelectedId) return { ...m, x: cellX, y: cellY, isInReserve: false };
      if (marker.attachedCharacterId && m.id === marker.attachedCharacterId) {
        return { ...m, x: cellX, y: charY, isInReserve: false };
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
    const stillUndeployedP1 = updatedMarkers.filter((m) => m.player === "P1" && m.isInReserve).length;
    const stillUndeployedP2 = updatedMarkers.filter((m) => m.player === "P2" && m.isInReserve).length;

    if (stillUndeployedP1 === 0 && stillUndeployedP2 === 0) return;

    if (deployDeployer === "P1" && stillUndeployedP2 > 0) setDeployDeployer("P2");
    else if (deployDeployer === "P2" && stillUndeployedP1 > 0) setDeployDeployer("P1");
    else if (deployDeployer === "P1" && stillUndeployedP1 > 0) setDeployDeployer("P1");
    else setDeployDeployer("P2");
  }

  function handleReserve(markerId: string) {
    const marker = markers.find((m) => m.id === markerId);
    if (!marker) return;
    addLog(`${marker.player} places ${marker.unitName} in Reserve.`, marker.player);
    setDeploySelectedId(null);

    const updatedMarkers = markers.map((m) =>
      m.id === markerId ? { ...m, isInReserve: true } : m
    );
    setMarkers(updatedMarkers);

    const stillP1 = updatedMarkers.filter((m) => m.player === "P1" && m.isInReserve).length;
    const stillP2 = updatedMarkers.filter((m) => m.player === "P2" && m.isInReserve).length;

    if (stillP1 === 0 && stillP2 === 0) return;
    if (deployDeployer === "P1") setDeployDeployer(stillP2 > 0 ? "P2" : "P1");
    else setDeployDeployer(stillP1 > 0 ? "P1" : "P2");
  }

  function startGame() {
    const firstPlayer = rolloffResults.firstTurn ?? "P1";
    setActivePlayer(firstPlayer);
    setRoomPhase("game");
    setGamePhase("command");
    persistState({ current_phase: "command", game_state: { markers, round: 1, gamePhase: "command", activePlayer: firstPlayer, p1Cp, p2Cp, p1Vp, p2Vp } });
    addLog(`Deployment complete. ${firstPlayer} goes first. Round 1 — Command Phase.`, "system");
    // First player gains their Command Phase CP immediately
    giveCommandPhaseCP(firstPlayer, markers);
  }

  // ── Game phase logic ──

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
    // TODO: Secondary objectives (Tactical missions) — hidden objectives drawn from a deck each round.
    const captureRadius = 3;
    const active = currentMarkers.filter((m) => !m.isDestroyed && !m.isInReserve && !m.isAttached);
    const controlledNums: number[] = [];
    let vp = 0;

    mapPreset.objectives.forEach((obj, idx) => {
      const p1Near = active.filter(
        (m) => m.player === "P1" &&
               Math.sqrt((m.x + 0.5 - obj.x) ** 2 + (m.y + 0.5 - obj.y) ** 2) <= captureRadius
      );
      const p2Near = active.filter(
        (m) => m.player === "P2" &&
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

  // 10th ed phase sequence per player: command → movement → shooting → charge → fight
  // After P1's fight: score P1's objectives → P2's command phase
  // After P2's fight: score P2's objectives → end-of-round scoring phase
  function advancePhase() {
    setSelectedMarkerId(null);
    setCombat(INIT_COMBAT);
    setMoveUnit(null);

    if (gamePhase === "fight") {
      // Score objectives for the player who just finished their turn
      scoreObjectivesForPlayer(activePlayer, markers);

      if (activePlayer === "P1") {
        // P1 done → start P2's turn
        const newPlayer: "P1" | "P2" = "P2";
        setActivePlayer(newPlayer);
        setGamePhase("command");
        // Reset P2's unit action flags for their fresh turn
        setMarkers((prev) =>
          prev.map((m) =>
            m.player === "P2"
              ? { ...m, hasAdvanced: false, hasCharged: false, hasFought: false, hasShotThisTurn: false }
              : m
          )
        );
        // Solo mode: auto-switch to P2
        if (gameMode === "solo") setSoloSide("P2");
        addLog(`P1's turn complete. Round ${round} — Player 2's Turn: Command Phase.`, "system");
        giveCommandPhaseCP("P2", markers);
      } else {
        // P2 done → end of battle round (scoring phase shows "End Round" button)
        setGamePhase("scoring");
        addLog(`P2's turn complete. End of Round ${round} — click "End Round" to continue.`, "system");
      }
      return;
    }

    if (gamePhase === "command") {
      // CP was already granted when we entered command phase; just advance
    }

    const idx = PLAYER_PHASES.indexOf(gamePhase);
    if (idx >= 0 && idx < PLAYER_PHASES.length - 1) {
      const next = PLAYER_PHASES[idx + 1];
      setGamePhase(next);
      addLog(`→ ${activePlayer}'s ${PHASE_LABELS[next]} Phase`, "system");
    }
  }

  function endRound() {
    if (round >= 5) {
      const winner = p1Vp > p2Vp ? "P1" : p2Vp > p1Vp ? "P2" : "Draw";
      setRoomPhase("finished");
      addLog(
        `Battle ends! Final score — P1: ${p1Vp}VP, P2: ${p2Vp}VP. ${winner === "Draw" ? "It's a draw!" : `${winner} wins!`}`,
        "system"
      );
      persistState({ current_phase: "finished" });
      return;
    }
    const nextRound = round + 1;
    setRound(nextRound);
    setActivePlayer("P1");
    setGamePhase("command");
    // Reset all unit action flags for the new round
    setMarkers((prev) =>
      prev.map((m) => ({
        ...m,
        hasAdvanced: false,
        hasCharged: false,
        hasFought: false,
        hasShotThisTurn: false,
      }))
    );
    setSelectedMarkerId(null);
    setCombat(INIT_COMBAT);
    setMoveUnit(null);
    // Solo mode: back to P1's perspective
    if (gameMode === "solo") setSoloSide("P1");
    addLog(`Round ${nextRound} begins. Player 1's Turn — Command Phase.`, "system");
    giveCommandPhaseCP("P1", markers);
  }

  // ── Cell click handler (context-sensitive) ──
  function handleCellClick(x: number, y: number) {
    if (roomPhase === "deployment") {
      handleDeployCell(x, y);
      return;
    }
    if (roomPhase !== "game") return;

    if (gamePhase === "movement" && moveUnit) {
      const marker = markers.find((m) => m.id === moveUnit);
      if (!marker) return;
      const moveIn = parseStat(marker.stats.movement);
      const maxRange = moveAdvance ? moveIn + d6() : moveIn;
      const dist = Math.sqrt((x - marker.x) ** 2 + (y - marker.y) ** 2);
      if (dist > maxRange) {
        addLog(`Too far (${dist.toFixed(1)}" vs max ${maxRange}").`, "system");
        return;
      }
      const occupied = markers.some((m) => m.id !== moveUnit && m.x === x && m.y === y && !m.isDestroyed && !m.isInReserve);
      if (occupied) { addLog("Cell occupied.", "system"); return; }
      // Units cannot end movement inside terrain (10th ed — treat all terrain as solid ruins).
      // TODO: Infantry keyword can move through area terrain freely but still cannot end inside.
      const inTerrain = mapPreset.terrain.some(
        (t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h
      );
      if (inTerrain) { addLog("Cannot move into solid terrain.", "system"); return; }
      const oldX = marker.x;
      const oldY = marker.y;
      setMarkers((prev) =>
        prev.map((m) => {
          if (m.id === moveUnit) return { ...m, x, y, hasAdvanced: moveAdvance };
          // Move attached character at the same offset
          if (marker.attachedCharacterId && m.id === marker.attachedCharacterId) {
            const dx = x - oldX;
            const dy = y - oldY;
            return { ...m, x: Math.max(0, Math.min(59, m.x + dx)), y: Math.max(0, Math.min(43, m.y + dy)), hasAdvanced: moveAdvance };
          }
          return m;
        })
      );
      addLog(`${marker.player} moved ${marker.unitName} to (${x}, ${y})${moveAdvance ? " (Advanced)" : ""}.`, marker.player);
      setMoveUnit(null);
      setMoveAdvance(false);
    }
  }

  // ── Unit click handler (context-sensitive) ──
  function handleUnitClick(markerId: string) {
    const m = markers.find((mk) => mk.id === markerId);
    if (!m) return;

    if (roomPhase === "game") {
      if (gamePhase === "movement") {
        const activeSide = gameMode === "solo" ? soloSide : activePlayer;
        if (m.player !== activeSide) return;
        setMoveUnit((prev) => (prev === markerId ? null : markerId));
        setSelectedMarkerId(markerId);
        return;
      }
      if (gamePhase === "shooting") {
        if (combat.step === "idle" || combat.step === "selectAttacker") {
          const activeSide = gameMode === "solo" ? soloSide : activePlayer;
          if (m.player !== activeSide) return;
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
                const dist = Math.sqrt(
                  (attacker.x + 0.5 - (m.x + 0.5)) ** 2 +
                  (attacker.y + 0.5 - (m.y + 0.5)) ** 2
                );
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

          setCombat((prev) => ({ ...prev, targetId: markerId, step: "hitRolls" }));
          setSelectedMarkerId(markerId);
          return;
        }
      }
      if (gamePhase === "charge") {
        const activeSide = gameMode === "solo" ? soloSide : activePlayer;
        if (combat.step === "idle" && m.player === activeSide) {
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
        const activeSide = gameMode === "solo" ? soloSide : activePlayer;
        if (combat.step === "idle" && m.player === activeSide) {
          setCombat({ ...INIT_COMBAT, step: "selectTarget", attackerId: markerId });
          setSelectedMarkerId(markerId);
          return;
        }
        if (combat.step === "selectTarget") {
          const attacker = markers.find((mk) => mk.id === combat.attackerId);
          if (!attacker || m.player === attacker.player) return;
          resolveFight(combat.attackerId!, markerId);
          return;
        }
      }
      setSelectedMarkerId((prev) => (prev === markerId ? null : markerId));
    }
  }

  // ── Shooting resolution ──
  function resolveHitRolls() {
    const attacker = markers.find((m) => m.id === combat.attackerId);
    if (!attacker || combat.weaponIdx === null) return;
    const weapon = attacker.weapons[combat.weaponIdx];
    const numAttacks = parseDiceExpr(weapon.attacks);
    const skillTarget = parseSkill(weapon.skill);
    const rolls = rollDice(numAttacks);
    const hits = rolls.filter((r) => r >= skillTarget).length;
    addLog(`Shooting: ${numAttacks} attack(s) → ${rolls.join(", ")} → ${hits} hit(s) (needing ${skillTarget}+).`, attacker.player);
    showRoll({ rolls, type: "hit", threshold: skillTarget, label: `Hit Rolls (${skillTarget}+)` });
    setCombat((prev) => ({ ...prev, hitRolls: rolls, hits, step: "woundRolls" }));
  }

  function resolveWoundRolls() {
    const attacker = markers.find((m) => m.id === combat.attackerId);
    const target = markers.find((m) => m.id === combat.targetId);
    if (!attacker || !target || combat.weaponIdx === null) return;
    const weapon = attacker.weapons[combat.weaponIdx];
    const S = parseInt(weapon.strength) || 4;
    const T = target.stats.toughness;
    const woundTarget = getWoundTarget(S, T);
    const rolls = rollDice(combat.hits);
    const wounds = rolls.filter((r) => r >= woundTarget).length;
    addLog(`Wounding: S${S} vs T${T} (${woundTarget}+) → ${rolls.join(", ")} → ${wounds} wound(s).`, attacker.player);
    showRoll({ rolls, type: "wound", threshold: woundTarget, label: `Wound Rolls (${woundTarget}+)` });
    setCombat((prev) => ({ ...prev, woundRolls: rolls, wounds, step: "saveRolls" }));
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
    let coverSave = effectiveSave;
    const targetInRuins = mapPreset.terrain.some(
      (t) => target.x >= t.x && target.x < t.x + t.w && target.y >= t.y && target.y < t.y + t.h
    );
    if (targetInRuins && effectiveSave < 7) {
      coverSave = Math.min(7, effectiveSave + 1);
      addLog(`Cover: ${target.unitName} is in ruins — save improved to ${coverSave}+.`, "system");
    }

    const rolls = rollDice(combat.wounds);
    const unsaved = rolls.filter((r) => r < coverSave).length;
    const dmgPer = parseDiceExpr(weapon.damage);
    const totalDmg = unsaved * dmgPer;
    addLog(`Saves: ${coverSave}+ needed (Sv${saveBase}, AP${ap}${targetInRuins ? ", +1 cover" : ""}) → ${rolls.join(", ")} → ${unsaved} unsaved → ${totalDmg} damage.`, target.player);
    showRoll({ rolls, type: "save", threshold: coverSave, label: `Save Rolls (${coverSave}+)` });

    // Apply damage
    setMarkers((prev) =>
      prev.map((m) => {
        if (m.id !== combat.targetId) return m;
        const newWounds = Math.max(0, m.currentWounds - totalDmg);
        const destroyed = newWounds <= 0;
        if (destroyed) addLog(`${m.unitName} destroyed!`, "system");
        return { ...m, currentWounds: newWounds, isDestroyed: destroyed };
      })
    );

    // Mark attacker as having shot
    setMarkers((prev) =>
      prev.map((m) => m.id === combat.attackerId ? { ...m, hasShotThisTurn: true } : m)
    );

    setCombat({ ...INIT_COMBAT, step: "done" });
    setTimeout(() => setCombat(INIT_COMBAT), 2000);
  }

  // ── Charge ──
  function resolveCharge(attackerId: string, targetId: string) {
    const attacker = markers.find((m) => m.id === attackerId);
    const target = markers.find((m) => m.id === targetId);
    if (!attacker || !target) return;

    const dist = Math.sqrt((attacker.x - target.x) ** 2 + (attacker.y - target.y) ** 2);
    const roll1 = d6();
    const roll2 = d6();
    const total = roll1 + roll2;
    showRoll({ rolls: [roll1, roll2], type: "charge", threshold: Math.ceil(dist), label: `Charge Roll (need ${Math.ceil(dist)}+)` });
    addLog(
      `Charge: ${attacker.unitName} → ${target.unitName} (dist ${dist.toFixed(1)}"). Rolled ${roll1}+${roll2}=${total}.`,
      attacker.player
    );

    if (total >= dist) {
      // Move adjacent
      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const len = Math.max(Math.abs(dx), Math.abs(dy));
      const newX = target.x - Math.sign(dx);
      const newY = target.y - Math.sign(dy);
      setMarkers((prev) =>
        prev.map((m) => m.id === attackerId ? { ...m, x: newX, y: newY, hasCharged: true } : m)
      );
      addLog(`Charge succeeds! ${attacker.unitName} moves adjacent to ${target.unitName}.`, attacker.player);

      // Overwatch: target rolls d6 for each model; 6s hit
      const owRolls = rollDice(1);
      const owHits = owRolls.filter((r) => r === 6).length;
      if (owHits > 0) {
        addLog(`Overwatch: ${target.unitName} hits on 6s — ${owRolls.join(",")} — ${owHits} hit(s)!`, target.player);
      } else {
        addLog(`Overwatch: ${owRolls.join(",")} — no hits.`, target.player);
      }
    } else {
      addLog(`Charge fails (rolled ${total}, needed ${Math.ceil(dist)}).`, attacker.player);
    }

    setCombat(INIT_COMBAT);
    setSelectedMarkerId(null);
  }

  // ── Fight ──
  function resolveFight(attackerId: string, targetId: string) {
    const attacker = markers.find((m) => m.id === attackerId);
    const target = markers.find((m) => m.id === targetId);
    if (!attacker || !target) return;

    const meleeWeapon = attacker.weapons.find((w) => w.type === "Melee") ?? attacker.weapons[0];
    if (!meleeWeapon) { addLog("No weapons available.", "system"); return; }

    const numAttacks = parseDiceExpr(meleeWeapon.attacks);
    const wsTarget = parseSkill(meleeWeapon.skill);
    const hitRolls = rollDice(numAttacks);
    const hits = hitRolls.filter((r) => r >= wsTarget).length;

    const S = parseInt(meleeWeapon.strength) || 4;
    const T = target.stats.toughness;
    const woundTarget = getWoundTarget(S, T);
    const woundRolls = rollDice(hits);
    const wounds = woundRolls.filter((r) => r >= woundTarget).length;

    const ap = parseAP(meleeWeapon.ap);
    const saveBase = parseSave(target.stats.save);
    const invSave = parseInvSave(target.stats.save);
    const effectiveSave = Math.min(saveBase - ap, invSave ?? 7);
    const saveRolls = rollDice(wounds);
    const unsaved = saveRolls.filter((r) => r < effectiveSave).length;
    const dmgPer = parseDiceExpr(meleeWeapon.damage);
    const totalDmg = unsaved * dmgPer;

    addLog(
      `Fight: ${attacker.unitName} vs ${target.unitName} — ${hits} hit(s), ${wounds} wound(s), ${unsaved} unsaved → ${totalDmg} damage.`,
      attacker.player
    );

    setMarkers((prev) =>
      prev.map((m) => {
        if (m.id === targetId) {
          const newW = Math.max(0, m.currentWounds - totalDmg);
          if (newW <= 0) addLog(`${m.unitName} destroyed!`, "system");
          return { ...m, currentWounds: newW, isDestroyed: newW <= 0 };
        }
        if (m.id === attackerId) return { ...m, hasFought: true };
        return m;
      })
    );

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
      setP1Cp((n) => n - cost);
    } else {
      if (p2Cp < cost) { addLog(`P2 — not enough CP for ${name}.`, "system"); return; }
      setP2Cp((n) => n - cost);
    }
    addLog(`${player} used "${name}" (${cost} CP).`, player);
  }

  // ─── Phase action panel ───────────────────────────────────────────────────

  const activeSide = gameMode === "solo" ? soloSide : activePlayer;
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
          rangeIndicators.push({
            centreX: mu.x + 0.5,
            centreY: mu.y + 0.5,
            radiusInches: moveIn + 6,
            colour: "#f97316",
            opacity: 0.05,
            strokeOpacity: 0.35,
            label: `Adv max ${moveIn + 6}"`,
          });
        }
      }
    }

    if (gamePhase === "shooting" && combat.step === "selectWeapon" && combatAttacker && combat.weaponIdx !== null) {
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
      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Movement Phase
          </p>
          {moveUnit ? (
            <>
              <p className="text-xs" style={{ color: "#d97706" }}>
                Click a cell to move {markers.find((m) => m.id === moveUnit)?.unitName}
              </p>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <input
                  type="checkbox"
                  checked={moveAdvance}
                  onChange={(e) => setMoveAdvance(e.target.checked)}
                  className="rounded"
                />
                Advance (+D6" but can&apos;t shoot)
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
              <p className="text-xs mb-2" style={{ color: "#d97706" }}>
                {combatAttacker.unitName} — Select weapon:
              </p>
              <div className="space-y-1">
                {combatAttacker.weapons.filter((w) => w.type !== "Melee").map((w, i) => (
                  <button
                    key={i}
                    onClick={() => setCombat((prev) => ({ ...prev, weaponIdx: i, step: "selectTarget" }))}
                    className="w-full text-left px-2 py-1.5 rounded text-xs"
                    style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "var(--text-primary)", border: "1px solid rgba(217,119,6,0.2)" }}
                  >
                    <span className="font-medium">{w.name}</span>
                    <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                      {w.range} A{w.attacks} S{w.strength} AP{w.ap} D{w.damage}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setCombat(INIT_COMBAT); setSelectedMarkerId(null); }}
                className="w-full py-1.5 rounded-lg text-xs mt-2"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Cancel
              </button>
            </div>
          )}
          {combat.step === "selectTarget" && (
            <p className="text-xs" style={{ color: "#d97706" }}>
              Click an enemy unit to target.
            </p>
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
      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Charge Phase
          </p>
          {combat.step === "idle" && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Click a friendly unit to declare a charge. Then click the target.
            </p>
          )}
          {combat.step === "selectTarget" && combatAttacker && (
            <p className="text-xs" style={{ color: "#d97706" }}>
              {combatAttacker.unitName} charging — click enemy target.
            </p>
          )}
          <button
            onClick={advancePhase}
            className="w-full py-2 rounded-lg text-xs font-semibold mt-2"
            style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.35)" }}
          >
            End Charge Phase →
          </button>
        </div>
      );
    }

    if (gamePhase === "fight") {
      return (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Fight Phase
          </p>
          {combat.step === "idle" && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Click a unit to fight with it, then click the target. Charged units fight first.
            </p>
          )}
          {combat.step === "selectTarget" && combatAttacker && (
            <p className="text-xs" style={{ color: "#d97706" }}>
              {combatAttacker.unitName} fighting — click enemy target.
            </p>
          )}
          <button
            onClick={advancePhase}
            className="w-full py-2 rounded-lg text-xs font-semibold mt-2"
            style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#d97706", border: "1px solid rgba(217,119,6,0.35)" }}
          >
            End Fight Phase →
          </button>
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

        <div className="ml-auto flex gap-2 flex-shrink-0">
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

              {/* P1 Stratagems */}
              <button
                onClick={() => setP1StratOpen((x) => !x)}
                className="flex items-center justify-between w-full text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Stratagems</span>
                {p1StratOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {p1StratOpen && (
                <div className="mt-1.5 space-y-1">
                  {genericStratagems.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => useStratagem("P1", s.cost, s.name)}
                      className="w-full text-left px-2 py-1.5 rounded text-[10px]"
                      style={{ backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
                    >
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium" style={{ color: "#93c5fd" }}>{s.name}</span>
                        <span style={{ color: "#eab308" }}>{s.cost}CP</span>
                      </div>
                      <span style={{ color: "var(--text-muted)" }}>{s.description}</span>
                    </button>
                  ))}
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
                  {genericStratagems.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => useStratagem("P2", s.cost, s.name)}
                      className="w-full text-left px-2 py-1.5 rounded text-[10px]"
                      style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}
                    >
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium" style={{ color: "#fca5a5" }}>{s.name}</span>
                        <span style={{ color: "#eab308" }}>{s.cost}CP</span>
                      </div>
                      <span style={{ color: "var(--text-muted)" }}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Units list (game phase) */}
            <div className="p-3 flex-1 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                Units on Board
              </p>
              {markers
                .filter((m) => !m.isDestroyed && !m.isInReserve)
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
                      <span
                        className="text-[10px]"
                        style={{ color: m.currentWounds / m.maxWounds > 0.5 ? "#4ade80" : "#f87171" }}
                      >
                        {m.currentWounds}W
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* ── CENTER — Board ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {(() => {
            // Compute which player controls each objective for ring colouring
            const captureR = 3;
            const activeM = markers.filter((m) => !m.isDestroyed && !m.isInReserve && !m.isAttached);
            const objectiveControl: ('P1' | 'P2' | null)[] = mapPreset.objectives.map((obj) => {
              const p1n = activeM.filter(
                (m) => m.player === "P1" &&
                       Math.sqrt((m.x+0.5-obj.x)**2 + (m.y+0.5-obj.y)**2) <= captureR
              );
              const p2n = activeM.filter(
                (m) => m.player === "P2" &&
                       Math.sqrt((m.x+0.5-obj.x)**2 + (m.y+0.5-obj.y)**2) <= captureR
              );
              if (p1n.length > 0 && p2n.length === 0) return "P1";
              if (p2n.length > 0 && p1n.length === 0) return "P2";
              if (p1n.length > p2n.length) return "P1";
              if (p2n.length > p1n.length) return "P2";
              return null;
            });
            return (
              <Warhammer40kBoard
                markers={markers}
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
              />
            );
          })()}
          <DiceRollerPopup request={diceRequest} onDismiss={dismissDice} />
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
          <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
              Victory Points
            </p>
            {[
              { label: "P1", vp: p1Vp, color: "#ef4444" },
              { label: "P2", vp: p2Vp, color: "#3b82f6" },
            ].map(({ label, vp, color }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color }}>{label}</span>
                  <span className="font-bold" style={{ color }}>{vp}/90</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min((vp / 90) * 100, 100)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>

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
    </div>
  );
}
