"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Key,
  ArrowRight,
  Loader2,
  Swords,
  Crosshair,
  Users,
  Eye,
  LogIn,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

interface GamePreview {
  id: string;
  name: string;
  type: "dnd" | "warhammer";
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  invite_code: string;
}

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [code, setCode] = useState(
    (searchParams.get("code") ?? "").toUpperCase()
  );
  const [preview, setPreview] = useState<GamePreview | null>(null);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user ?? null));
  }, []);

  const lookupCode = useCallback(
    async (c: string) => {
      if (c.length < 6) return;
      setSearching(true);
      setError("");
      setNotFound(false);
      setPreview(null);

      const supabase = createClient();

      const [{ data: dndGame }, { data: warGame }] = await Promise.all([
        supabase
          .from("dnd_games")
          .select("id, name, dm_id, game_state, invite_code")
          .eq("invite_code", c)
          .eq("is_active", true)
          .single(),
        supabase
          .from("warhammer_games")
          .select("id, name, host_id, game_state, invite_code")
          .eq("invite_code", c)
          .eq("is_active", true)
          .single(),
      ]);

      setSearching(false);

      if (!dndGame && !warGame) {
        setNotFound(true);
        return;
      }

      if (dndGame) {
        const { data: dm } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", dndGame.dm_id)
          .single();
        const { count } = await supabase
          .from("dnd_game_players")
          .select("*", { count: "exact", head: true })
          .eq("game_id", dndGame.id);
        setPreview({
          id: dndGame.id,
          name: dndGame.name,
          type: "dnd",
          hostName: dm?.username ?? "Unknown",
          playerCount: count ?? 0,
          maxPlayers: (dndGame.game_state?.maxPlayers as number) ?? 6,
          invite_code: dndGame.invite_code,
        });
      } else if (warGame) {
        const { data: host } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", warGame.host_id)
          .single();
        const { count } = await supabase
          .from("warhammer_game_players")
          .select("*", { count: "exact", head: true })
          .eq("game_id", warGame.id);
        setPreview({
          id: warGame.id,
          name: warGame.name,
          type: "warhammer",
          hostName: host?.username ?? "Unknown",
          playerCount: count ?? 0,
          maxPlayers: 2,
          invite_code: warGame.invite_code,
        });
      }
    },
    []
  );

  useEffect(() => {
    if (code.length >= 6) lookupCode(code);
    else {
      setPreview(null);
      setNotFound(false);
    }
  }, [code, lookupCode]);

  async function handleJoin() {
    if (!preview) return;
    if (!user) {
      router.push(
        `/auth/login?next=/join?code=${preview.invite_code}`
      );
      return;
    }
    setJoining(true);
    setError("");
    const supabase = createClient();

    if (preview.type === "dnd") {
      const { error: e } = await supabase
        .from("dnd_game_players")
        .upsert({
          game_id: preview.id,
          player_id: user.id,
          role: "player",
        });
      if (e) { setError(e.message); setJoining(false); return; }
      router.push(`/dnd/games/${preview.id}`);
    } else {
      const { error: e } = await supabase
        .from("warhammer_game_players")
        .upsert({
          game_id: preview.id,
          player_id: user.id,
        });
      if (e) { setError(e.message); setJoining(false); return; }
      router.push(`/warhammer/games/${preview.id}`);
    }
  }

  function handleObserve() {
    if (!preview) return;
    if (preview.type === "dnd") {
      router.push(`/dnd/games/${preview.id}?observe=true`);
    } else {
      router.push(`/warhammer/games/${preview.id}?observe=true`);
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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,119,6,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 flex items-start justify-center px-6 py-16">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: "rgba(217,119,6,0.12)",
                  border: "1px solid rgba(217,119,6,0.35)",
                }}
              >
                <Key size={28} style={{ color: "#d97706" }} />
              </div>
              <h1
                className="font-cinzel text-3xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Join a Game
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Enter the invite code from your game host
              </p>
            </div>

            {/* Code Input */}
            <div className="flex gap-2 mb-6">
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="XXXXXXXX"
                maxLength={8}
                className="flex-1 rounded-xl px-5 py-4 text-2xl font-mono font-bold tracking-[0.3em] text-center outline-none transition-all"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: `1px solid ${
                    preview
                      ? "rgba(16,185,129,0.4)"
                      : notFound
                      ? "rgba(220,38,38,0.4)"
                      : "rgba(217,119,6,0.3)"
                  }`,
                  color: preview
                    ? "#10b981"
                    : notFound
                    ? "var(--crimson-light)"
                    : "#d97706",
                }}
                onFocus={(e) => {
                  if (!preview && !notFound)
                    e.currentTarget.style.borderColor =
                      "rgba(217,119,6,0.6)";
                }}
                onBlur={(e) => {
                  if (!preview && !notFound)
                    e.currentTarget.style.borderColor =
                      "rgba(217,119,6,0.3)";
                }}
              />
              {searching && (
                <div className="flex items-center px-4">
                  <Loader2
                    size={20}
                    className="animate-spin"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              )}
              {!searching && code.length >= 6 && !preview && !notFound && (
                <button
                  onClick={() => lookupCode(code)}
                  className="px-4 rounded-xl transition-all"
                  style={{
                    backgroundColor: "rgba(217,119,6,0.15)",
                    border: "1px solid rgba(217,119,6,0.3)",
                    color: "#d97706",
                  }}
                >
                  <Search size={18} />
                </button>
              )}
            </div>

            {notFound && (
              <p
                className="text-sm text-center mb-6"
                style={{ color: "var(--crimson-light)" }}
              >
                No active game found with that code.
              </p>
            )}

            {/* Game Preview */}
            {preview && (
              <div
                className="rounded-xl p-5 mb-5 flex flex-col gap-4"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: `1px solid ${
                    preview.type === "dnd"
                      ? "rgba(220,38,38,0.3)"
                      : "rgba(217,119,6,0.3)"
                  }`,
                  background: `linear-gradient(135deg, ${
                    preview.type === "dnd"
                      ? "rgba(220,38,38,0.06)"
                      : "rgba(217,119,6,0.06)"
                  } 0%, var(--bg-card) 60%)`,
                }}
              >
                {/* Game type badge */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        preview.type === "dnd"
                          ? "rgba(220,38,38,0.12)"
                          : "rgba(217,119,6,0.12)",
                      border: `1px solid ${
                        preview.type === "dnd"
                          ? "rgba(220,38,38,0.3)"
                          : "rgba(217,119,6,0.3)"
                      }`,
                    }}
                  >
                    {preview.type === "dnd" ? (
                      <Swords
                        size={18}
                        style={{ color: "#dc2626" }}
                      />
                    ) : (
                      <Crosshair
                        size={18}
                        style={{ color: "#d97706" }}
                      />
                    )}
                  </div>
                  <div>
                    <span
                      className="text-xs font-medium uppercase tracking-widest"
                      style={{
                        color:
                          preview.type === "dnd" ? "#dc2626" : "#d97706",
                      }}
                    >
                      {preview.type === "dnd"
                        ? "D&D 5e"
                        : "Warhammer 40K"}
                    </span>
                    <h2
                      className="font-cinzel text-lg font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {preview.name}
                    </h2>
                  </div>
                </div>

                <div
                  className="h-px"
                  style={{
                    background: `linear-gradient(to right, ${
                      preview.type === "dnd"
                        ? "rgba(220,38,38,0.3)"
                        : "rgba(217,119,6,0.3)"
                    }, transparent)`,
                  }}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Host
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {preview.hostName}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Players
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Users
                        size={13}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {preview.playerCount} / {preview.maxPlayers}
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <p
                    className="text-xs rounded-md px-3 py-2"
                    style={{
                      backgroundColor: "rgba(220,38,38,0.1)",
                      border: "1px solid rgba(220,38,38,0.3)",
                      color: "var(--crimson-light)",
                    }}
                  >
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex-1 py-3 rounded-xl font-cinzel font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      backgroundColor:
                        preview.type === "dnd"
                          ? "rgba(220,38,38,0.2)"
                          : "rgba(217,119,6,0.2)",
                      border: `1px solid ${
                        preview.type === "dnd"
                          ? "rgba(220,38,38,0.45)"
                          : "rgba(217,119,6,0.45)"
                      }`,
                      color:
                        preview.type === "dnd" ? "#ef4444" : "#d97706",
                      boxShadow: `0 0 20px ${
                        preview.type === "dnd"
                          ? "rgba(220,38,38,0.12)"
                          : "rgba(217,119,6,0.12)"
                      }`,
                    }}
                  >
                    {joining ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : user ? (
                      <ArrowRight size={14} />
                    ) : (
                      <LogIn size={14} />
                    )}
                    {joining ? "Joining..." : user ? "Join Game" : "Sign in to Join"}
                  </button>
                  <button
                    onClick={handleObserve}
                    className="px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--text-muted)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "var(--text-muted)";
                    }}
                  >
                    <Eye size={14} />
                    Observe
                  </button>
                </div>
              </div>
            )}

            {/* Sign in prompt if not logged in */}
            {!user && !preview && (
              <p
                className="text-xs text-center"
                style={{ color: "var(--text-muted)" }}
              >
                <Link
                  href="/auth/login"
                  style={{ color: "var(--purple-light)" }}
                  className="underline underline-offset-2"
                >
                  Sign in
                </Link>{" "}
                to save your progress and join as a full player
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinPageContent />
    </Suspense>
  );
}
