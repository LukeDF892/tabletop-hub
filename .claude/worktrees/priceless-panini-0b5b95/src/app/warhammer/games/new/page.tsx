"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Target, ChevronRight, Users, User, BookOpen } from "lucide-react";

const POINT_LIMITS = [500, 1000, 2000, 3000];

interface SavedArmy {
  id: string;
  name: string;
  faction: string;
  detachment: string | null;
  detachments: string[] | null;
  total_points: number;
  points_limit: number;
}

export default function NewWarhammerGamePage() {
  const router = useRouter();
  const [gameName, setGameName] = useState("");
  const [pointsLimit, setPointsLimit] = useState(2000);
  const [playerMode, setPlayerMode] = useState<"multiplayer" | "solo">("multiplayer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedArmies, setSavedArmies] = useState<SavedArmy[]>([]);
  const [p1ArmyId, setP1ArmyId] = useState<string | null>(null);
  const [p2ArmyId, setP2ArmyId] = useState<string | null>(null);
  const [armiesLoading, setArmiesLoading] = useState(true);

  useEffect(() => {
    async function loadArmies() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setArmiesLoading(false); return; }
      const { data } = await supabase
        .from("warhammer_armies")
        .select("id, name, faction, detachment, detachments, total_points, points_limit")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setSavedArmies(data ?? []);
      setArmiesLoading(false);
    }
    loadArmies();
  }, []);

  async function handleCreate() {
    if (!gameName.trim()) {
      setError("Please enter a battle name.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to create a game.");
        setLoading(false);
        return;
      }

      const p1Army = savedArmies.find(a => a.id === p1ArmyId);
      const p2Army = savedArmies.find(a => a.id === p2ArmyId);

      const { data, error: dbErr } = await supabase
        .from("warhammer_games")
        .insert({
          name: gameName.trim(),
          game_system: "wh40k",
          host_id: user.id,
          player_mode: playerMode,
          game_state: {
            pointsLimit,
            playerMode,
            round: 1,
            phase: "command",
            p1Army: p1Army ? { id: p1Army.id, name: p1Army.name, faction: p1Army.faction, detachment: p1Army.detachment } : null,
            p2Army: p2Army ? { id: p2Army.id, name: p2Army.name, faction: p2Army.faction, detachment: p2Army.detachment } : null,
          },
        })
        .select("id")
        .single();

      if (dbErr) {
        console.error("Supabase insert error:", dbErr);
        throw new Error(dbErr.message);
      }

      router.push(`/warhammer/games/${data.id}`);
    } catch (err: unknown) {
      console.error("Game creation error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to create game: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const accentRed = "#dc2626";

  function ArmySelector({
    label,
    value,
    onChange,
    color,
  }: {
    label: string;
    value: string | null;
    onChange: (id: string | null) => void;
    color: string;
  }) {
    const selected = savedArmies.find(a => a.id === value);
    return (
      <div>
        <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
        {armiesLoading ? (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Loading armies…</div>
        ) : savedArmies.length === 0 ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}
          >
            No saved armies.{" "}
            <a href="/warhammer/army-builder" className="underline" style={{ color }}>
              Build one first →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => onChange(null)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-left transition-all"
              style={
                value === null
                  ? { backgroundColor: `${color}18`, border: `1px solid ${color}50`, color }
                  : { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }
              }
            >
              None (choose later)
            </button>
            {savedArmies.map(army => (
              <button
                key={army.id}
                onClick={() => onChange(army.id)}
                className="w-full px-4 py-3 rounded-xl text-left transition-all"
                style={
                  value === army.id
                    ? { backgroundColor: `${color}18`, border: `1px solid ${color}50` }
                    : { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: value === army.id ? color : "var(--text-primary)" }}>
                      {army.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {army.faction}
                      {army.detachment && ` · ${army.detachment}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: value === army.id ? color : "var(--text-muted)" }}>
                    {army.total_points}pts
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            Selected: <strong style={{ color }}>{selected.name}</strong> · {selected.faction} · {selected.total_points}/{selected.points_limit}pts
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,38,38,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-14 pb-20">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <Shield size={20} style={{ color: accentRed }} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: accentRed }}>
                Warhammer 40,000
              </p>
              <h1 className="font-cinzel text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                New Battle
              </h1>
            </div>
          </div>

          <div className="space-y-7">
            {/* Battle Name */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
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
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(220,38,38,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-card)")}
              />
            </div>

            {/* Play Mode */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                Play Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlayerMode("multiplayer")}
                  className="rounded-xl p-4 text-left transition-all"
                  style={
                    playerMode === "multiplayer"
                      ? { backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.45)" }
                      : { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }
                  }
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users size={16} style={{ color: playerMode === "multiplayer" ? accentRed : "var(--text-muted)" }} />
                    <span className="text-sm font-semibold" style={{ color: playerMode === "multiplayer" ? accentRed : "var(--text-primary)" }}>
                      1v1 Multiplayer
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Share invite code with your opponent
                  </p>
                </button>

                <button
                  onClick={() => setPlayerMode("solo")}
                  className="rounded-xl p-4 text-left transition-all"
                  style={
                    playerMode === "solo"
                      ? { backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.45)" }
                      : { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }
                  }
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <User size={16} style={{ color: playerMode === "solo" ? accentRed : "var(--text-muted)" }} />
                    <span className="text-sm font-semibold" style={{ color: playerMode === "solo" ? accentRed : "var(--text-primary)" }}>
                      Solo Play
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Control both sides yourself
                  </p>
                </button>
              </div>
            </div>

            {/* Points Limit */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
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
                        ? { backgroundColor: "rgba(220,38,38,0.18)", border: "1px solid rgba(220,38,38,0.5)", color: accentRed }
                        : { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }
                    }
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>

            {/* Army Selection */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <BookOpen size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Army Selection (optional)
                </span>
              </div>

              <ArmySelector
                label={playerMode === "solo" ? "Player 1 Army (Blue)" : "Your Army (Player 1)"}
                value={p1ArmyId}
                onChange={setP1ArmyId}
                color="#3b82f6"
              />

              <ArmySelector
                label={playerMode === "solo" ? "Player 2 Army (Red)" : "Opponent Army (Player 2)"}
                value={p2ArmyId}
                onChange={setP2ArmyId}
                color="#ef4444"
              />
            </div>

            {/* Game System tag */}
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(217,119,6,0.25)" }}
            >
              <Target size={18} style={{ color: "#d97706" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Warhammer 40,000 — 10th Edition</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Battle-forged · Command Points · 5 Rounds</p>
              </div>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(217,119,6,0.18)", color: "#d97706" }}>
                Selected
              </span>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#ef4444" }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !gameName.trim()}
              className="w-full py-3.5 rounded-xl font-cinzel font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: "rgba(220,38,38,0.18)", border: "1px solid rgba(220,38,38,0.45)", color: accentRed }}
              onMouseEnter={(e) => { if (!loading && gameName.trim()) e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.28)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.18)"; }}
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
