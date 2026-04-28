"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Dice6,
  CheckCircle,
  Circle,
  Activity,
  Target,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | "command"
  | "movement"
  | "shooting"
  | "charge"
  | "fight"
  | "morale";

type TerrainType = "ruin" | "crater" | "barricade" | "woods" | "building" | "impassable" | null;

interface ObjectiveState {
  id: number;
  controlled: "P1" | "P2" | null;
  row: number;
  col: number;
}

interface ActivityEntry {
  time: string;
  text: string;
  player?: "P1" | "P2" | "system";
}

interface Stratagem {
  name: string;
  cost: number;
  phase: string;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES: { id: Phase; label: string }[] = [
  { id: "command", label: "Command" },
  { id: "movement", label: "Movement" },
  { id: "shooting", label: "Shooting" },
  { id: "charge", label: "Charge" },
  { id: "fight", label: "Fight" },
];

const TERRAIN_PRESETS: Record<string, Array<{ row: number; col: number; type: TerrainType }>> = {
  "Urban Warzone": [
    { row: 1, col: 1, type: "ruin" }, { row: 1, col: 5, type: "ruin" },
    { row: 2, col: 3, type: "building" }, { row: 3, col: 0, type: "barricade" },
    { row: 3, col: 6, type: "barricade" }, { row: 4, col: 2, type: "ruin" },
    { row: 4, col: 4, type: "ruin" }, { row: 5, col: 1, type: "building" },
    { row: 5, col: 5, type: "building" },
  ],
  "Wasteland": [
    { row: 0, col: 2, type: "crater" }, { row: 1, col: 4, type: "crater" },
    { row: 2, col: 1, type: "barricade" }, { row: 2, col: 5, type: "barricade" },
    { row: 3, col: 3, type: "crater" }, { row: 4, col: 0, type: "crater" },
    { row: 4, col: 6, type: "crater" }, { row: 5, col: 3, type: "barricade" },
  ],
  "Industrial": [
    { row: 0, col: 3, type: "building" }, { row: 1, col: 1, type: "building" },
    { row: 1, col: 5, type: "building" }, { row: 2, col: 3, type: "barricade" },
    { row: 3, col: 0, type: "ruin" }, { row: 3, col: 6, type: "ruin" },
    { row: 4, col: 2, type: "building" }, { row: 4, col: 4, type: "building" },
    { row: 5, col: 3, type: "building" },
  ],
  "Jungle": [
    { row: 0, col: 1, type: "woods" }, { row: 0, col: 5, type: "woods" },
    { row: 1, col: 3, type: "woods" }, { row: 2, col: 0, type: "woods" },
    { row: 2, col: 6, type: "woods" }, { row: 3, col: 2, type: "woods" },
    { row: 3, col: 4, type: "woods" }, { row: 4, col: 1, type: "woods" },
    { row: 4, col: 5, type: "woods" }, { row: 5, col: 3, type: "woods" },
  ],
  "Custom": [],
};

const TERRAIN_COLORS: Record<Exclude<TerrainType, null>, { bg: string; label: string; color: string }> = {
  ruin: { bg: "#78350f", label: "Ruin", color: "#d97706" },
  crater: { bg: "#374151", label: "Crater", color: "#9ca3af" },
  barricade: { bg: "#4b3821", label: "Barricade", color: "#d4a35a" },
  woods: { bg: "#14532d", label: "Woods", color: "#22c55e" },
  building: { bg: "#1f2937", label: "Building", color: "#6b7280" },
  impassable: { bg: "#0f0f0f", label: "Impassable", color: "#374151" },
};

// 6 standard 2-player objectives on a 7×6 grid (col×row)
const DEFAULT_OBJECTIVES: ObjectiveState[] = [
  { id: 1, controlled: null, row: 0, col: 1 }, // P1 deployment
  { id: 2, controlled: null, row: 5, col: 5 }, // P2 deployment
  { id: 3, controlled: null, row: 2, col: 0 }, // mid-flank left
  { id: 4, controlled: null, row: 3, col: 6 }, // mid-flank right
  { id: 5, controlled: null, row: 2, col: 3 }, // centerline
  { id: 6, controlled: null, row: 3, col: 3 }, // centerline
];

const GRID_ROWS = 6;
const GRID_COLS = 7;

// ─── Dice Roller ─────────────────────────────────────────────────────────────

function DiceRoller() {
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(6);
  const [results, setResults] = useState<number[]>([]);

  function roll() {
    const r = Array.from({ length: diceCount }, () =>
      Math.floor(Math.random() * diceSides) + 1
    );
    setResults(r);
  }

  const total = results.reduce((s, n) => s + n, 0);

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Dice6 size={14} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Dice Roller
        </span>
      </div>
      <div className="flex gap-2 items-center mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDiceCount((n) => Math.max(1, n - 1))}
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
          >
            <Minus size={10} />
          </button>
          <span className="text-sm w-6 text-center font-bold" style={{ color: "var(--text-primary)" }}>
            {diceCount}
          </span>
          <button
            onClick={() => setDiceCount((n) => Math.min(20, n + 1))}
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
          >
            <Plus size={10} />
          </button>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>d</span>
        <div className="flex gap-1">
          {[4, 6, 8, 10, 12, 20].map((d) => (
            <button
              key={d}
              onClick={() => setDiceSides(d)}
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={
                diceSides === d
                  ? { backgroundColor: "rgba(217,119,6,0.2)", border: "1px solid rgba(217,119,6,0.5)", color: "#d97706" }
                  : { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }
              }
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={roll}
        className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
        style={{
          backgroundColor: "rgba(217,119,6,0.15)",
          border: "1px solid rgba(217,119,6,0.35)",
          color: "#d97706",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(217,119,6,0.25)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(217,119,6,0.15)")}
      >
        Roll {diceCount}d{diceSides}
      </button>
      {results.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1 mb-1">
            {results.map((r, i) => (
              <span
                key={i}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: r === diceSides ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.06)",
                  color: r === diceSides ? "#eab308" : "var(--text-primary)",
                  border: `1px solid ${r === diceSides ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {r}
              </span>
            ))}
          </div>
          {diceCount > 1 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Total: <strong style={{ color: "var(--text-primary)" }}>{total}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Game Room ───────────────────────────────────────────────────────────

export default function WarhammerGameRoom() {
  const { id } = useParams<{ id: string }>();

  // Game state
  const [gameName, setGameName] = useState("Loading…");
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("command");
  const [currentPlayer, setCurrentPlayer] = useState<"P1" | "P2">("P1");

  // Player state
  const [p1Cp, setP1Cp] = useState(3);
  const [p2Cp, setP2Cp] = useState(3);
  const [p1Vp, setP1Vp] = useState(0);
  const [p2Vp, setP2Vp] = useState(0);
  const [p1Army, setP1Army] = useState("Player 1 · Unknown Army");
  const [p2Army, setP2Army] = useState("Player 2 · Unknown Army");

  // Board state
  const [objectives, setObjectives] = useState<ObjectiveState[]>(DEFAULT_OBJECTIVES);
  const [terrain, setTerrain] = useState<Record<string, TerrainType>>({});
  const [terrainPreset, setTerrainPreset] = useState("Urban Warzone");
  const [customMode, setCustomMode] = useState(false);
  const [selectedTerrain, setSelectedTerrain] = useState<Exclude<TerrainType, null>>("ruin");

  // Stratagems (generic set for reference)
  const [p1Stratagems] = useState<Stratagem[]>([
    { name: "Armour of Contempt", cost: 1, phase: "Any", description: "When unit takes a wound, roll D6; on 5+ ignore it." },
    { name: "Honour the Chapter", cost: 1, phase: "Fight", description: "+1 Attack for one CORE unit within 6\" of a CHARACTER." },
    { name: "Rapid Deployment", cost: 1, phase: "Movement", description: "One CORE unit makes a free 6\" move." },
    { name: "Fire Discipline", cost: 1, phase: "Shooting", description: "Heavy weapons gain benefit of cover." },
    { name: "Adaptive Strategy", cost: 1, phase: "Command", description: "Swap one unit's current doctrine for another." },
  ]);
  const [p2Stratagems] = useState<Stratagem[]>([
    { name: "Disruption Fields", cost: 1, phase: "Fight", description: "CORE unit's melee attacks gain Sustained Hits 1." },
    { name: "Quantum Deflection", cost: 1, phase: "Any", description: "Unit gains 5++ invuln vs ranged attacks this phase." },
    { name: "Entropic Strike", cost: 1, phase: "Any", description: "Unit's weapons gain -1 additional AP." },
    { name: "Emergency Invasion Beam", cost: 1, phase: "Any", description: "Remove unit from board, redeploy from reserves next turn." },
    { name: "Hand of the Phaeron", cost: 2, phase: "Command", description: "One VEHICLE auto-passes Reanimation; restores to 1W." },
  ]);

  const [p1StratagemOpen, setP1StratagemOpen] = useState(false);
  const [p2StratagemOpen, setP2StratagemOpen] = useState(false);

  // Activity log
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([
    { time: "00:00", text: "Battle begins — Round 1, Command Phase", player: "system" },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  function addLog(text: string, player?: "P1" | "P2" | "system") {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setActivityLog((prev) => [...prev, { time, text, player }]);
    setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }), 50);
  }

  // Load game info from Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("warhammer_games")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setGameName(data.name);
          const gs = data.game_state as Record<string, unknown> | null;
          if (gs) {
            if (typeof gs.round === "number") setRound(gs.round);
            if (typeof gs.phase === "string") setPhase(gs.phase as Phase);
          }
        }
      });
  }, [id]);

  // Apply terrain preset
  useEffect(() => {
    if (terrainPreset === "Custom") {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    const tiles = TERRAIN_PRESETS[terrainPreset] ?? [];
    const map: Record<string, TerrainType> = {};
    tiles.forEach(({ row, col, type }) => {
      map[`${row}-${col}`] = type;
    });
    setTerrain(map);
  }, [terrainPreset]);

  function advancePhase() {
    const idx = PHASES.findIndex((p) => p.id === phase);
    if (idx < PHASES.length - 1) {
      const next = PHASES[idx + 1];
      setPhase(next.id);
      addLog(`Phase → ${next.label}`, "system");
    }
  }

  function endRound() {
    const nextRound = round + 1;
    if (nextRound > 5) {
      addLog("Battle ends after Round 5!", "system");
      return;
    }
    setRound(nextRound);
    setPhase("command");
    // Award +1 CP at start of command phase
    setP1Cp((n) => n + 1);
    setP2Cp((n) => n + 1);
    addLog(`Round ${nextRound} begins — Command Phase. Both players gain +1 CP.`, "system");
  }

  function commandPhaseCP() {
    if (phase !== "command") return;
    const player = currentPlayer;
    if (player === "P1") setP1Cp((n) => n + 1);
    else setP2Cp((n) => n + 1);
    addLog(`${player} gained 1 CP (Command Phase)`, player);
  }

  function useStratagem(player: "P1" | "P2", strat: Stratagem) {
    const cost = strat.cost;
    if (player === "P1") {
      if (p1Cp < cost) { addLog(`${player} — Not enough CP for ${strat.name}`, "system"); return; }
      setP1Cp((n) => n - cost);
    } else {
      if (p2Cp < cost) { addLog(`${player} — Not enough CP for ${strat.name}`, "system"); return; }
      setP2Cp((n) => n - cost);
    }
    addLog(`${player} used "${strat.name}" (${cost}CP) — ${strat.description}`, player);
  }

  function cycleObjective(id: number) {
    setObjectives((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const next: "P1" | "P2" | null =
          o.controlled === null ? "P1" : o.controlled === "P1" ? "P2" : null;
        if (next !== null) {
          const prevHolder = o.controlled;
          if (prevHolder !== null) {
            addLog(`Objective ${id} — ${next} claims from ${prevHolder}`, next);
          } else {
            addLog(`Objective ${id} — ${next} claims (was neutral)`, next);
          }
        } else {
          addLog(`Objective ${id} — contested (neutral)`, "system");
        }
        return { ...o, controlled: next };
      })
    );
  }

  function handleTerrainClick(row: number, col: number) {
    if (!customMode) return;
    const key = `${row}-${col}`;
    const isObjective = objectives.some((o) => o.row === row && o.col === col);
    if (isObjective) return;
    setTerrain((prev) => {
      const current = prev[key];
      if (current === selectedTerrain) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: selectedTerrain };
    });
  }

  const p1ObjCount = objectives.filter((o) => o.controlled === "P1").length;
  const p2ObjCount = objectives.filter((o) => o.controlled === "P2").length;
  const currentPhaseLabel = PHASES.find((p) => p.id === phase)?.label ?? phase;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <Navigation />

      {/* ── Top bar ── */}
      <div
        className="flex items-center gap-4 px-4 h-12 flex-shrink-0 overflow-x-auto"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <h1
          className="font-cinzel font-bold text-sm whitespace-nowrap"
          style={{ color: "var(--text-primary)" }}
        >
          {gameName}
        </h1>
        <div
          className="h-4 w-px flex-shrink-0"
          style={{ backgroundColor: "var(--border-subtle)" }}
        />
        <span
          className="text-xs font-bold flex-shrink-0"
          style={{ color: "#d97706" }}
        >
          Round {round}/5
        </span>
        <div className="flex gap-1 flex-shrink-0">
          {PHASES.map((p) => (
            <span
              key={p.id}
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={
                p.id === phase
                  ? {
                      backgroundColor: "rgba(217,119,6,0.2)",
                      border: "1px solid rgba(217,119,6,0.5)",
                      color: "#d97706",
                    }
                  : {
                      color: "var(--text-muted)",
                      opacity: 0.5,
                    }
              }
            >
              {p.label}
            </span>
          ))}
        </div>
        <div className="ml-auto flex gap-2 flex-shrink-0">
          <button
            onClick={advancePhase}
            disabled={phase === "fight"}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{
              backgroundColor: "rgba(217,119,6,0.15)",
              border: "1px solid rgba(217,119,6,0.35)",
              color: "#d97706",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(217,119,6,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(217,119,6,0.15)")}
          >
            Next Phase →
          </button>
          <button
            onClick={endRound}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: "rgba(220,38,38,0.15)",
              border: "1px solid rgba(220,38,38,0.35)",
              color: "#dc2626",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.15)")}
          >
            End Round
          </button>
        </div>
      </div>

      {/* ── Main columns ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL — Players ── */}
        <div
          className="w-64 flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ borderRight: "1px solid var(--border-subtle)" }}
        >
          {/* Player 1 */}
          <div
            className="p-4"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "#3b82f6" }}
              />
              <span
                className="text-xs font-medium flex-1 truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {p1Army}
              </span>
            </div>
            <div className="flex gap-3 mb-3">
              {/* CP */}
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#3b82f6" }}>CP</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setP1Cp((n) => Math.max(0, n - 1)); addLog("P1 spent 1 CP", "P1"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-2xl font-cinzel font-bold w-8 text-center" style={{ color: "#3b82f6" }}>
                    {p1Cp}
                  </span>
                  <button
                    onClick={() => { setP1Cp((n) => n + 1); addLog("P1 gained 1 CP", "P1"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
              {/* VP */}
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#3b82f6" }}>VP</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setP1Vp((n) => Math.max(0, n - 1)); addLog("P1 VP -1", "P1"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-2xl font-cinzel font-bold w-8 text-center" style={{ color: "#3b82f6" }}>
                    {p1Vp}
                  </span>
                  <button
                    onClick={() => { setP1Vp((n) => n + 1); addLog("P1 VP +1", "P1"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* Command Phase CP */}
            <button
              onClick={() => { commandPhaseCP(); setCurrentPlayer("P1"); }}
              className="w-full py-1.5 rounded-lg text-xs font-medium transition-all mb-3"
              style={{
                backgroundColor: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#3b82f6",
              }}
            >
              + Command Phase CP
            </button>

            {/* P1 Stratagems */}
            <button
              onClick={() => setP1StratagemOpen((x) => !x)}
              className="flex items-center justify-between w-full text-xs mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              <span>Stratagems</span>
              {p1StratagemOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {p1StratagemOpen && (
              <div className="space-y-1.5">
                {p1Stratagems.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => useStratagem("P1", s)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs transition-all"
                    style={{
                      backgroundColor: "rgba(59,130,246,0.08)",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: "#93c5fd" }}>{s.name}</span>
                      <span
                        className="text-[10px] font-bold px-1 rounded"
                        style={{ backgroundColor: "rgba(234,179,8,0.2)", color: "#eab308" }}
                      >
                        {s.cost}CP
                      </span>
                    </div>
                    <p className="mt-0.5" style={{ color: "var(--text-muted)" }}>{s.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "#ef4444" }}
              />
              <span
                className="text-xs font-medium flex-1 truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {p2Army}
              </span>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#ef4444" }}>CP</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setP2Cp((n) => Math.max(0, n - 1)); addLog("P2 spent 1 CP", "P2"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-2xl font-cinzel font-bold w-8 text-center" style={{ color: "#ef4444" }}>
                    {p2Cp}
                  </span>
                  <button
                    onClick={() => { setP2Cp((n) => n + 1); addLog("P2 gained 1 CP", "P2"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#ef4444" }}>VP</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setP2Vp((n) => Math.max(0, n - 1)); addLog("P2 VP -1", "P2"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-2xl font-cinzel font-bold w-8 text-center" style={{ color: "#ef4444" }}>
                    {p2Vp}
                  </span>
                  <button
                    onClick={() => { setP2Vp((n) => n + 1); addLog("P2 VP +1", "P2"); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => { commandPhaseCP(); setCurrentPlayer("P2"); }}
              className="w-full py-1.5 rounded-lg text-xs font-medium transition-all mb-3"
              style={{
                backgroundColor: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
              }}
            >
              + Command Phase CP
            </button>

            <button
              onClick={() => setP2StratagemOpen((x) => !x)}
              className="flex items-center justify-between w-full text-xs mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              <span>Stratagems</span>
              {p2StratagemOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {p2StratagemOpen && (
              <div className="space-y-1.5">
                {p2Stratagems.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => useStratagem("P2", s)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs transition-all"
                    style={{
                      backgroundColor: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: "#fca5a5" }}>{s.name}</span>
                      <span
                        className="text-[10px] font-bold px-1 rounded"
                        style={{ backgroundColor: "rgba(234,179,8,0.2)", color: "#eab308" }}
                      >
                        {s.cost}CP
                      </span>
                    </div>
                    <p className="mt-0.5" style={{ color: "var(--text-muted)" }}>{s.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER — Battle Board ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Board controls */}
          <div
            className="px-4 py-2 flex items-center gap-3 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <Target size={14} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Battle Board
            </span>
            <div className="flex gap-1 ml-2">
              {Object.keys(TERRAIN_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTerrainPreset(preset)}
                  className="px-2 py-1 rounded text-xs transition-all"
                  style={
                    terrainPreset === preset
                      ? {
                          backgroundColor: "rgba(217,119,6,0.2)",
                          border: "1px solid rgba(217,119,6,0.4)",
                          color: "#d97706",
                        }
                      : {
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "var(--text-muted)",
                        }
                  }
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Terrain palette (Custom mode) */}
            {customMode && (
              <div className="flex gap-1 ml-2">
                {(Object.keys(TERRAIN_COLORS) as Exclude<TerrainType, null>[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTerrain(t)}
                    title={TERRAIN_COLORS[t].label}
                    className="w-6 h-6 rounded text-[8px] font-bold transition-all"
                    style={{
                      backgroundColor: TERRAIN_COLORS[t].bg,
                      border: `2px solid ${selectedTerrain === t ? TERRAIN_COLORS[t].color : "transparent"}`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* The board grid */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <div
              className="relative"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
                gap: "2px",
                width: "min(100%, 700px)",
                aspectRatio: "7/6",
              }}
            >
              {Array.from({ length: GRID_ROWS }, (_, row) =>
                Array.from({ length: GRID_COLS }, (_, col) => {
                  const key = `${row}-${col}`;
                  const t = terrain[key];
                  const obj = objectives.find((o) => o.row === row && o.col === col);
                  const isP1Zone = row === 0;
                  const isP2Zone = row === GRID_ROWS - 1;

                  return (
                    <div
                      key={key}
                      onClick={() => obj ? cycleObjective(obj.id) : handleTerrainClick(row, col)}
                      className="relative rounded flex items-center justify-center cursor-pointer transition-all"
                      style={{
                        backgroundColor: t
                          ? TERRAIN_COLORS[t].bg
                          : isP1Zone
                          ? "rgba(59,130,246,0.08)"
                          : isP2Zone
                          ? "rgba(239,68,68,0.08)"
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${
                          t ? `${TERRAIN_COLORS[t].color}40` : "rgba(255,255,255,0.05)"
                        }`,
                        minHeight: "40px",
                      }}
                    >
                      {t && (
                        <span className="text-[10px] font-bold" style={{ color: TERRAIN_COLORS[t].color }}>
                          {TERRAIN_COLORS[t].label[0]}
                        </span>
                      )}
                      {obj && (
                        <div
                          className="absolute inset-1 rounded-full flex items-center justify-center text-xs font-bold font-cinzel"
                          style={{
                            backgroundColor:
                              obj.controlled === "P1"
                                ? "rgba(59,130,246,0.3)"
                                : obj.controlled === "P2"
                                ? "rgba(239,68,68,0.3)"
                                : "rgba(255,255,255,0.08)",
                            border: `2px solid ${
                              obj.controlled === "P1"
                                ? "#3b82f6"
                                : obj.controlled === "P2"
                                ? "#ef4444"
                                : "rgba(255,255,255,0.2)"
                            }`,
                            color:
                              obj.controlled === "P1"
                                ? "#93c5fd"
                                : obj.controlled === "P2"
                                ? "#fca5a5"
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {obj.id}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legend */}
          <div
            className="px-4 py-2 flex gap-4 flex-shrink-0 overflow-x-auto"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.3)", border: "2px solid #3b82f6" }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>P1 ({p1ObjCount} obj)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.3)", border: "2px solid #ef4444" }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>P2 ({p2ObjCount} obj)</span>
            </div>
            {(Object.keys(TERRAIN_COLORS) as Exclude<TerrainType, null>[]).map((t) => (
              <div key={t} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: TERRAIN_COLORS[t].bg, border: `1px solid ${TERRAIN_COLORS[t].color}40` }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{TERRAIN_COLORS[t].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL — Log, VP, Dice ── */}
        <div
          className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          {/* VP tracker */}
          <div
            className="p-4 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity size={13} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Victory Points
              </span>
              <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                First to 90 wins
              </span>
            </div>
            <div className="space-y-2">
              {/* P1 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "#3b82f6" }}>P1</span>
                  <span className="font-bold" style={{ color: "#3b82f6" }}>{p1Vp}/90</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min((p1Vp / 90) * 100, 100)}%`, backgroundColor: "#3b82f6" }}
                  />
                </div>
              </div>
              {/* P2 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "#ef4444" }}>P2</span>
                  <span className="font-bold" style={{ color: "#ef4444" }}>{p2Vp}/90</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min((p2Vp / 90) * 100, 100)}%`, backgroundColor: "#ef4444" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dice Roller */}
          <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <DiceRoller />
          </div>

          {/* Activity Log */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-shrink-0">
              <Activity size={13} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Battle Log
              </span>
            </div>
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5"
            >
              {activityLog.map((entry, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="flex-shrink-0 tabular-nums" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {entry.time}
                  </span>
                  <span
                    style={{
                      color:
                        entry.player === "P1"
                          ? "#93c5fd"
                          : entry.player === "P2"
                          ? "#fca5a5"
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
