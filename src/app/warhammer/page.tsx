"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Crosshair, Swords, Target, BookOpen, Shield, Users, Loader2 } from "lucide-react";

const tiles = [
  {
    title: "Army Builder",
    description:
      "Craft your perfect force. Browse units, pick a detachment, and build an army list across Space Marines, Dark Angels, Tyranids, and Necrons.",
    icon: BookOpen,
    href: "/warhammer/army-builder",
    accentColor: "#d97706",
    borderColor: "rgba(217, 119, 6, 0.35)",
    glowColor: "rgba(217, 119, 6, 0.18)",
    badge: "Build",
    comingSoon: false,
  },
  {
    title: "My Armies",
    description:
      "View and manage your saved army lists. Edit existing forces, track points, and launch straight into battle from your collection.",
    icon: Shield,
    href: "/warhammer/armies",
    accentColor: "#a855f7",
    borderColor: "rgba(168, 85, 247, 0.35)",
    glowColor: "rgba(168, 85, 247, 0.18)",
    badge: "Collection",
    comingSoon: false,
  },
  {
    title: "Play a Game",
    description:
      "Launch a 40K game room. Track CP, VPs, objectives, and stratagems in real time with your opponent — complete with a full battle map.",
    icon: Target,
    href: "/warhammer/games/new",
    accentColor: "#dc2626",
    borderColor: "rgba(220, 38, 38, 0.35)",
    glowColor: "rgba(220, 38, 38, 0.18)",
    badge: "Play",
    comingSoon: false,
  },
  {
    title: "Age of Sigmar",
    description:
      "Battle across the eight Mortal Realms. Build your Stormcast Eternals, Nighthaunt, or any of the mighty armies of AoS.",
    icon: Swords,
    href: "#",
    accentColor: "#7c3aed",
    borderColor: "rgba(124, 58, 237, 0.35)",
    glowColor: "rgba(124, 58, 237, 0.18)",
    badge: "Age of Sigmar",
    comingSoon: true,
  },
];

function JoinGameSection() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      setError("Enter the full 6–8 character game code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/warhammer/games/lookup?code=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? "Game not found. Check the code and try again.");
        return;
      }
      const game = await res.json() as { id: string; p2_user_id: string | null; current_phase: string };
      if (game.current_phase === "finished") {
        setError("That game has already ended.");
        return;
      }
      router.push(`/warhammer/games/${game.id}`);
    } catch {
      setError("Failed to look up game. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto w-full px-6 pb-12">
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid rgba(124,58,237,0.3)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)" }}
          >
            <Users size={18} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#a78bfa" }}>
              Join a Battle
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Enter your opponent&apos;s game code to join their session
            </p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            placeholder="Game code (e.g. A3F9B2)"
            maxLength={8}
            className="flex-1 min-w-48 px-4 py-2.5 rounded-lg text-sm font-mono tracking-widest outline-none transition-all"
            style={{
              backgroundColor: "var(--bg-primary)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--text-primary)",
              letterSpacing: "0.15em",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.7)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)")}
          />
          <button
            type="submit"
            disabled={loading || code.trim().length < 4}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            style={{
              backgroundColor: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(124,58,237,0.45)",
              color: "#a78bfa",
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? "Joining…" : "Join Game"}
          </button>
        </form>

        {error && (
          <p className="mt-2 text-xs" style={{ color: "#f87171" }}>{error}</p>
        )}
      </div>
    </section>
  );
}

export default function WarhammerPage() {
  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,119,6,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 flex flex-col">
          {/* Hero */}
          <section className="max-w-6xl mx-auto w-full px-6 pt-16 pb-12">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "rgba(217, 119, 6, 0.12)",
                  border: "1px solid rgba(217, 119, 6, 0.3)",
                }}
              >
                <Crosshair size={28} style={{ color: "#d97706" }} />
              </div>
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: "#d97706" }}
                >
                  Tabletop Hub
                </p>
                <h1
                  className="font-cinzel text-3xl md:text-4xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Warhammer 40,000
                </h1>
              </div>
            </div>

            <p
              className="text-base leading-relaxed max-w-2xl"
              style={{ color: "var(--text-muted)" }}
            >
              The 41st Millennium awaits. Build your armies, track your
              collection, and wage war across the stars.
            </p>

            <div
              className="mt-6 h-px"
              style={{
                background:
                  "linear-gradient(to right, rgba(217,119,6,0.4), transparent)",
              }}
            />
          </section>

          {/* Factions strip */}
          <section className="max-w-6xl mx-auto w-full px-6 pb-8">
            <p
              className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Available Factions
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Space Marines", color: "#1e40af" },
                { name: "Dark Angels", color: "#166534" },
                { name: "Tyranids", color: "#7c3aed" },
                { name: "Necrons", color: "#15803d" },
              ].map((f) => (
                <span
                  key={f.name}
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: `${f.color}22`,
                    border: `1px solid ${f.color}55`,
                    color: f.color,
                  }}
                >
                  {f.name}
                </span>
              ))}
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-muted)",
                }}
              >
                +8 coming soon
              </span>
            </div>
          </section>

          {/* Join Game */}
          <JoinGameSection />

          {/* Tiles */}
          <section className="max-w-6xl mx-auto w-full px-6 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <Link
                    key={tile.title}
                    href={tile.comingSoon ? "#" : tile.href}
                    className={`group rounded-xl p-6 flex flex-col gap-4 transition-all duration-200 ${tile.comingSoon ? "cursor-default" : "cursor-pointer"}`}
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: `1px solid ${tile.borderColor}`,
                      boxShadow: `0 0 0 transparent`,
                    }}
                    onMouseEnter={(e) => {
                      if (!tile.comingSoon) {
                        e.currentTarget.style.boxShadow = `0 0 24px ${tile.glowColor}`;
                        e.currentTarget.style.borderColor = tile.accentColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 0 0 transparent";
                      e.currentTarget.style.borderColor = tile.borderColor;
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${tile.accentColor}18`,
                          border: `1px solid ${tile.accentColor}40`,
                        }}
                      >
                        <Icon size={22} style={{ color: tile.accentColor }} />
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: tile.comingSoon
                            ? "rgba(255,255,255,0.06)"
                            : `${tile.accentColor}18`,
                          border: `1px solid ${tile.comingSoon ? "rgba(255,255,255,0.1)" : `${tile.accentColor}40`}`,
                          color: tile.comingSoon
                            ? "var(--text-muted)"
                            : tile.accentColor,
                        }}
                      >
                        {tile.comingSoon ? "Coming Soon" : tile.badge}
                      </span>
                    </div>

                    <div>
                      <h2
                        className="font-cinzel font-semibold text-lg mb-2 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tile.title}
                      </h2>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {tile.description}
                      </p>
                    </div>

                    {!tile.comingSoon && (
                      <div
                        className="mt-auto flex items-center gap-1.5 text-sm font-medium"
                        style={{ color: tile.accentColor }}
                      >
                        <span>Open</span>
                        <span className="transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
