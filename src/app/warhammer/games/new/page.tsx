"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Target, ChevronRight, Users, User, Bot, CheckCircle, Loader2, Map } from "lucide-react";
import { MAP_PRESETS } from "@/lib/wh40k/mapPresets";
import type { MapPreset } from "@/lib/wh40k/mapPresets";

const GAME_SYSTEMS = [
  {
    id: "wh40k",
    name: "Warhammer 40,000",
    description: "10th Edition — Command Phase, Battle-forged armies, Command Points",
    icon: Target,
    accentColor: "#d97706",
  },
];

const POINT_LIMITS = [500, 1000, 2000, 3000];

type GameMode = "2player" | "solo" | "vs-ai";

interface WarhammerArmy {
  id: string;
  name: string;
  faction: string;
  subfaction: string | null;
  points_limit: number;
  total_points: number;
}

const FACTION_COLORS: Record<string, string> = {
  "Space Marines": "#1e40af",
  "Dark Angels": "#166534",
  "Tyranids": "#7c3aed",
  "Necrons": "#15803d",
};

function getArmyColor(faction: string): string {
  return FACTION_COLORS[faction] ?? "#d97706";
}

function ArmyCard({
  army,
  selected,
  onSelect,
}: {
  army: WarhammerArmy;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = getArmyColor(army.faction);
  return (
    <button
      onClick={onSelect}
      className="text-left rounded-xl p-3 transition-all w-full"
      style={
        selected
          ? {
              backgroundColor: `${color}18`,
              border: `2px solid ${color}80`,
            }
          : {
              backgroundColor: "var(--bg-card)",
              border: "2px solid var(--border-card)",
            }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: selected ? color : "var(--text-primary)" }}
          >
            {army.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {army.faction}
            {army.subfaction ? ` · ${army.subfaction}` : ""}
          </p>
          <p className="text-xs mt-1" style={{ color }}>
            {army.total_points} / {army.points_limit} pts
          </p>
        </div>
        {selected && <CheckCircle size={16} style={{ color, flexShrink: 0 }} />}
      </div>
    </button>
  );
}

export default function NewWarhammerGamePage() {
  const router = useRouter();
  const [gameName, setGameName] = useState("");
  const [gameSystem] = useState("wh40k");
  const [pointsLimit, setPointsLimit] = useState(2000);
  const [gameMode, setGameMode] = useState<GameMode>("2player");
  const [loading, setLoading] = useState(false);
  const [loadingArmies, setLoadingArmies] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [armies, setArmies] = useState<WarhammerArmy[]>([]);
  const [p1ArmyId, setP1ArmyId] = useState<string | null>(null);
  const [p2ArmyId, setP2ArmyId] = useState<string | null>(null);
  const [aiFaction, setAiFaction] = useState<string>("Space Marines");
  const [selectedPreset, setSelectedPreset] = useState<MapPreset>(MAP_PRESETS[0]);

  const AI_FACTIONS = ["Space Marines", "Dark Angels", "Tyranids", "Necrons"];

  useEffect(() => {
    async function fetchArmies() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingArmies(false);
        return;
      }
      const { data } = await supabase
        .from("warhammer_armies")
        .select("id, name, faction, subfaction, points_limit, total_points")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setArmies((data as WarhammerArmy[]) ?? []);
      setLoadingArmies(false);
    }
    fetchArmies();
  }, []);

  async function handleCreate() {
    if (!gameName.trim()) {
      setError("Please enter a game name.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to create a game.");
        setLoading(false);
        return;
      }

      // Ensure profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        await supabase
          .from("profiles")
          .insert({ id: user.id, username: user.email?.split("@")[0] || "player" });
      }

      // Session UUID — stored in localStorage so it persists across page reloads
      // and works for guests who aren't authenticated via Supabase Auth.
      let sessionId = localStorage.getItem("wh40k_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("wh40k_session_id", sessionId);
      }

      const { data, error: dbErr } = await supabase
        .from("warhammer_games")
        .insert({
          name: gameName.trim(),
          game_system: gameSystem,
          host_id: user.id,
          game_mode: gameMode,
          player1_army_id: p1ArmyId,
          player2_army_id: gameMode === "solo" ? p2ArmyId : null,
          current_round: 1,
          current_phase: "rolloff",
          map_preset: selectedPreset.id,
          p1_user_id: sessionId,
          game_state: {
            pointsLimit,
            maxPlayers: gameMode === "solo" || gameMode === "vs-ai" ? 1 : 2,
            round: 1,
            phase: "rolloff",
            markers: [],
            p1Cp: 4,
            p2Cp: 4,
            p1Vp: 0,
            p2Vp: 0,
            rolloffResults: { attacker: null, firstDeployer: null, firstTurn: null },
            activePlayer: "P1",
            deployment: { p1UnitsPlaced: [], p2UnitsPlaced: [], currentDeployer: "P1" },
            mapPresetId: selectedPreset.id,
            ...(gameMode === "vs-ai" ? { aiArmyFaction: aiFaction } : {}),
          },
        })
        .select()
        .single();

      if (dbErr) {
        console.error("Game creation error:", dbErr.code, dbErr.message, dbErr.details);
        setError(dbErr.message ?? "Failed to create game. Please try again.");
        return;
      }

      router.push(`/warhammer/games/${data.id}`);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to create game. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,38,38,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-14 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.3)",
              }}
            >
              <Shield size={20} style={{ color: "#dc2626" }} />
            </div>
            <div>
              <p
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: "#dc2626" }}
              >
                Warhammer 40,000
              </p>
              <h1
                className="font-cinzel text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                New Battle
              </h1>
            </div>
          </div>

          <div className="space-y-6">
            {/* Game Name */}
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Battle Name
              </label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="e.g. Blood Angels vs Necrons — Mission: Purge the Alien"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(220,38,38,0.5)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-card)")
                }
              />
            </div>

            {/* Game Mode */}
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Game Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setGameMode("2player")}
                  className="rounded-xl p-4 text-left transition-all"
                  style={
                    gameMode === "2player"
                      ? {
                          backgroundColor: "rgba(124,58,237,0.15)",
                          border: "2px solid rgba(124,58,237,0.6)",
                        }
                      : {
                          backgroundColor: "var(--bg-card)",
                          border: "2px solid var(--border-card)",
                        }
                  }
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{
                      backgroundColor:
                        gameMode === "2player"
                          ? "rgba(124,58,237,0.2)"
                          : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <Users
                      size={18}
                      style={{
                        color: gameMode === "2player" ? "#7c3aed" : "var(--text-muted)",
                      }}
                    />
                  </div>
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{
                      color: gameMode === "2player" ? "#a78bfa" : "var(--text-primary)",
                    }}
                  >
                    2-Player (Online)
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Play against an opponent via invite code
                  </p>
                </button>

                <button
                  onClick={() => setGameMode("solo")}
                  className="rounded-xl p-4 text-left transition-all"
                  style={
                    gameMode === "solo"
                      ? { backgroundColor: "rgba(217,119,6,0.15)", border: "2px solid rgba(217,119,6,0.6)" }
                      : { backgroundColor: "var(--bg-card)", border: "2px solid var(--border-card)" }
                  }
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: gameMode === "solo" ? "rgba(217,119,6,0.2)" : "rgba(255,255,255,0.06)" }}
                  >
                    <User size={18} style={{ color: gameMode === "solo" ? "#d97706" : "var(--text-muted)" }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: gameMode === "solo" ? "#d97706" : "var(--text-primary)" }}>
                    Solo
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Control both sides yourself
                  </p>
                </button>

                <button
                  onClick={() => setGameMode("vs-ai")}
                  className="rounded-xl p-4 text-left transition-all"
                  style={
                    gameMode === "vs-ai"
                      ? { backgroundColor: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.6)" }
                      : { backgroundColor: "var(--bg-card)", border: "2px solid var(--border-card)" }
                  }
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: gameMode === "vs-ai" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)" }}
                  >
                    <Bot size={18} style={{ color: gameMode === "vs-ai" ? "#10b981" : "var(--text-muted)" }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: gameMode === "vs-ai" ? "#10b981" : "var(--text-primary)" }}>
                    vs AI
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Play against a rule-based AI opponent
                  </p>
                </button>
              </div>

              {gameMode === "solo" && (
                <div
                  className="mt-3 px-4 py-2.5 rounded-lg text-xs"
                  style={{ backgroundColor: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "#d97706" }}
                >
                  Solo mode: you switch between P1 and P2 perspectives using a toggle in the game room.
                </div>
              )}

              {gameMode === "vs-ai" && (
                <div className="mt-3 space-y-3">
                  <div
                    className="px-4 py-2.5 rounded-lg text-xs"
                    style={{ backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}
                  >
                    You play as P1. The AI controls P2 and plays automatically each turn.
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      AI Faction
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {AI_FACTIONS.map((faction) => (
                        <button
                          key={faction}
                          onClick={() => setAiFaction(faction)}
                          className="rounded-lg px-3 py-2 text-left transition-all text-xs font-medium"
                          style={
                            aiFaction === faction
                              ? { backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.5)", color: "#10b981" }
                              : { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }
                          }
                        >
                          {aiFaction === faction && <CheckCircle size={10} className="inline mr-1" />}
                          {faction}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Army Selection */}
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                {gameMode === "solo" ? "Armies" : gameMode === "vs-ai" ? "Your Army (P1)" : "Your Army (P1)"}
              </label>

              {loadingArmies ? (
                <div className="flex items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Loading armies…</span>
                </div>
              ) : armies.length === 0 ? (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-card)",
                    color: "var(--text-muted)",
                  }}
                >
                  No armies saved yet.{" "}
                  <a
                    href="/warhammer/army-builder"
                    style={{ color: "#d97706", textDecoration: "underline" }}
                  >
                    Build an army first
                  </a>{" "}
                  or proceed without armies (bare board only).
                </div>
              ) : (
                <div className="space-y-4">
                  {/* P1 Army */}
                  <div>
                    <p
                      className="text-xs mb-2 font-medium"
                      style={{ color: "#ef4444" }}
                    >
                      {gameMode === "solo" ? "Player 1 Army" : "Your Army"}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {armies.map((army) => (
                        <ArmyCard
                          key={army.id}
                          army={army}
                          selected={p1ArmyId === army.id}
                          onSelect={() =>
                            setP1ArmyId((prev) => (prev === army.id ? null : army.id))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* P2 Army (solo only — vs-ai uses the faction picker above) */}
                  {gameMode === "solo" && (
                    <div>
                      <p
                        className="text-xs mb-2 font-medium"
                        style={{ color: "#3b82f6" }}
                      >
                        Player 2 Army
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {armies.map((army) => (
                          <ArmyCard
                            key={army.id}
                            army={army}
                            selected={p2ArmyId === army.id}
                            onSelect={() =>
                              setP2ArmyId((prev) => (prev === army.id ? null : army.id))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Game System */}
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Game System
              </label>
              {GAME_SYSTEMS.map((gs) => {
                const Icon = gs.icon;
                return (
                  <div
                    key={gs.id}
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: `1px solid ${gs.accentColor}50`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${gs.accentColor}15`,
                        border: `1px solid ${gs.accentColor}35`,
                      }}
                    >
                      <Icon size={20} style={{ color: gs.accentColor }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {gs.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {gs.description}
                      </p>
                    </div>
                    <span
                      className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${gs.accentColor}18`,
                        color: gs.accentColor,
                      }}
                    >
                      Selected
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Points Limit */}
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Points Limit
              </label>
              <div className="grid grid-cols-4 gap-2">
                {POINT_LIMITS.map((pts) => (
                  <button
                    key={pts}
                    onClick={() => setPointsLimit(pts)}
                    className="py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={
                      pointsLimit === pts
                        ? {
                            backgroundColor: "rgba(220,38,38,0.18)",
                            border: "1px solid rgba(220,38,38,0.5)",
                            color: "#dc2626",
                          }
                        : {
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-card)",
                            color: "var(--text-muted)",
                          }
                    }
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Preset */}
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                <Map size={12} className="inline mr-1" />
                Map Layout
              </label>
              <div className="grid grid-cols-1 gap-2">
                {MAP_PRESETS.map((preset) => {
                  const isSelected = selectedPreset.id === preset.id;
                  const MINI_W = 60;
                  const MINI_H = 44;
                  const scaleX = 180 / MINI_W;
                  const scaleY = 56 / MINI_H;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset)}
                      className="text-left rounded-xl p-3 transition-all"
                      style={
                        isSelected
                          ? { backgroundColor: "rgba(220,38,38,0.1)", border: "2px solid rgba(220,38,38,0.5)" }
                          : { backgroundColor: "var(--bg-card)", border: "2px solid var(--border-card)" }
                      }
                    >
                      <div className="flex items-start gap-3">
                        {/* Mini map preview */}
                        <svg
                          width={180}
                          height={56}
                          style={{ flexShrink: 0, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <rect width={180} height={56} fill="#163418" rx={4} />
                          {/* Deployment zones */}
                          <rect x={0} y={0} width={180} height={(preset.deploymentDepth / MINI_H) * 56} fill="rgba(37,99,235,0.25)" />
                          <rect x={0} y={56 - (preset.deploymentDepth / MINI_H) * 56} width={180} height={(preset.deploymentDepth / MINI_H) * 56} fill="rgba(220,38,38,0.25)" />
                          {/* Terrain */}
                          {preset.terrain.map((t, i) => (
                            <rect
                              key={i}
                              x={t.x * scaleX}
                              y={t.y * scaleY}
                              width={t.w * scaleX}
                              height={t.h * scaleY}
                              fill="rgba(80,70,60,0.8)"
                              stroke="rgba(120,100,80,0.9)"
                              strokeWidth={0.5}
                            />
                          ))}
                          {/* Objectives */}
                          {preset.objectives.map((obj, i) => (
                            <circle
                              key={i}
                              cx={obj.x * scaleX}
                              cy={obj.y * scaleY}
                              r={4}
                              fill="rgba(234,179,8,0.6)"
                              stroke="#eab308"
                              strokeWidth={0.8}
                            />
                          ))}
                        </svg>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className="text-sm font-semibold"
                              style={{ color: isSelected ? "#dc2626" : "var(--text-primary)" }}
                            >
                              {preset.name}
                            </p>
                            {isSelected && <CheckCircle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />}
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {preset.description}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: isSelected ? "#dc2626" : "rgba(255,255,255,0.35)" }}>
                            {preset.deploymentDepth}&quot; zones · {preset.terrain.length} terrain · {preset.objectives.length} objectives
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "rgba(220,38,38,0.1)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  color: "#ef4444",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !gameName.trim()}
              className="w-full py-3.5 rounded-xl font-cinzel font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                backgroundColor: "rgba(220,38,38,0.18)",
                border: "1px solid rgba(220,38,38,0.45)",
                color: "#dc2626",
              }}
              onMouseEnter={(e) => {
                if (!loading && gameName.trim())
                  e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.28)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.18)";
              }}
            >
              {loading ? "Creating…" : "Begin the Battle"}
              {!loading && <ChevronRight size={16} />}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
