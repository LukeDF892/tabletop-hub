"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Target, ChevronRight } from "lucide-react";

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

export default function NewWarhammerGamePage() {
  const router = useRouter();
  const [gameName, setGameName] = useState("");
  const [gameSystem] = useState("wh40k");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [pointsLimit, setPointsLimit] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const { data, error: dbErr } = await supabase
        .from("warhammer_games")
        .insert({
          name: gameName.trim(),
          game_system: gameSystem,
          host_id: user.id,
          game_state: {
            pointsLimit,
            maxPlayers,
            round: 1,
            phase: "command",
            players: [],
          },
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

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

            {/* Max Players */}
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Players
              </label>
              <div className="flex gap-2">
                {[2].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={
                      maxPlayers === n
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
                    {n} Players
                  </button>
                ))}
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
