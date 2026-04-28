"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import DiceRoller from "@/components/game/DiceRoller";
import PlayerPresence from "@/components/game/PlayerPresence";
import { useGameRoom } from "@/lib/realtime/useGameRoom";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  Loader2,
  Copy,
  Check,
  Clock,
  Swords,
  MessageSquare,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Game {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  dm_id: string;
  game_state: Record<string, unknown>;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
}

export default function GameRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [dmProfile, setDmProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const { players, broadcast, messages, isConnected } = useGameRoom({
    gameId: id,
    userId: user?.id ?? "",
    username: profile?.username ?? "Guest",
  });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();

      if (!u) {
        router.push(`/auth/login?next=/dnd/games/${id}`);
        return;
      }
      setUser(u);

      const [{ data: profileData }, { data: gameData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username")
          .eq("id", u.id)
          .single(),
        supabase
          .from("dnd_games")
          .select("id, name, description, invite_code, dm_id, game_state, created_at")
          .eq("id", id)
          .single(),
      ]);

      if (!gameData) {
        setError("Game not found.");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setGame(gameData);

      const { data: dm } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", gameData.dm_id)
        .single();
      setDmProfile(dm);

      setLoading(false);
    }

    load();
  }, [id, router]);

  function copyCode() {
    if (!game) return;
    navigator.clipboard.writeText(game.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--purple-light)" }} />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-lg" style={{ color: "var(--crimson-light)" }}>
            {error || "Game not found."}
          </p>
          <button
            onClick={() => router.push("/dnd")}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--purple-light)",
            }}
          >
            Back to D&D Hub
          </button>
        </div>
      </div>
    );
  }

  const playerCount = players.filter((p) => p.online).length;
  const maxPlayers = (game.game_state?.maxPlayers as number) ?? 6;
  const isWaiting = playerCount < 2;

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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
          {/* Game Header */}
          <div
            className="rounded-xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid rgba(124,58,237,0.2)",
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.07) 0%, var(--bg-card) 60%)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.35)",
              }}
            >
              <Swords size={22} style={{ color: "var(--purple-light)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="font-cinzel text-xl font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {game.name}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                DM: {dmProfile?.username ?? "Unknown"} ·{" "}
                {playerCount}/{maxPlayers} players
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection status */}
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isConnected ? "#10b981" : "#6b7280",
                    boxShadow: isConnected
                      ? "0 0 6px rgba(16,185,129,0.6)"
                      : "none",
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {isConnected ? "Live" : "Connecting..."}
                </span>
              </div>

              {/* Invite code */}
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                style={{
                  backgroundColor: copiedCode
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(217,119,6,0.12)",
                  border: `1px solid ${
                    copiedCode
                      ? "rgba(16,185,129,0.35)"
                      : "rgba(217,119,6,0.3)"
                  }`,
                  color: copiedCode ? "#10b981" : "#d97706",
                }}
              >
                {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                {game.invite_code}
              </button>
            </div>
          </div>

          {/* Waiting state */}
          {isWaiting && (
            <div
              className="rounded-xl p-5 mb-6 flex items-center gap-4"
              style={{
                backgroundColor: "rgba(217,119,6,0.06)",
                border: "1px solid rgba(217,119,6,0.2)",
              }}
            >
              <Clock size={20} style={{ color: "#d97706" }} className="shrink-0" />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Waiting for players...
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Share the code{" "}
                  <span
                    className="font-mono font-bold"
                    style={{ color: "#d97706" }}
                  >
                    {game.invite_code}
                  </span>{" "}
                  with your party to get started
                </p>
              </div>
            </div>
          )}

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Presence + Activity Feed */}
            <div className="flex flex-col gap-5">
              <PlayerPresence
                players={players}
                currentUserId={user?.id}
              />

              {/* Activity Feed */}
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} style={{ color: "var(--text-muted)" }} />
                  <h3
                    className="font-cinzel text-sm font-semibold tracking-wide uppercase"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Activity
                  </h3>
                </div>
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p
                      className="text-xs italic"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No activity yet...
                    </p>
                  ) : (
                    messages.slice(0, 30).map((msg) => (
                      <div
                        key={msg.id}
                        className="text-xs rounded-md px-2.5 py-1.5"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <span
                          className="font-medium"
                          style={{ color: "var(--purple-light)" }}
                        >
                          {msg.senderName}
                        </span>{" "}
                        {msg.event === "dice_roll" ? (
                          <span style={{ color: "var(--text-muted)" }}>
                            rolled{" "}
                            <span
                              className="font-mono font-bold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {msg.payload.total as number}
                            </span>{" "}
                            (d{msg.payload.sides as number})
                          </span>
                        ) : msg.event === "player_joined" ? (
                          <span style={{ color: "#10b981" }}>joined</span>
                        ) : msg.event === "player_left" ? (
                          <span style={{ color: "var(--text-muted)" }}>left</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>
                            {msg.event.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Dice Roller + Info */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <DiceRoller
                rollerName={profile?.username ?? "Guest"}
                onRoll={(event, payload) =>
                  broadcast(event as never, payload)
                }
              />

              {/* Game Info */}
              {game.description && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield
                      size={14}
                      style={{ color: "var(--text-muted)" }}
                    />
                    <h3
                      className="font-cinzel text-sm font-semibold tracking-wide uppercase"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Campaign Notes
                    </h3>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {game.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
