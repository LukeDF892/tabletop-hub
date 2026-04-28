"use client";

import { Shield, Swords, Crosshair, Ghost } from "lucide-react";
import GameCard from "@/components/GameCard";
import GuestBanner from "@/components/GuestBanner";
import { enterGuestMode } from "@/lib/guest";
import { useRouter } from "next/navigation";

const games = [
  {
    href: "/dnd",
    title: "Dungeons & Dragons",
    subtitle: "Forge your legend",
    description:
      "Create characters, manage campaigns, and bring your adventures to life. Whether you're a dungeon master or a first-time player, your story starts here.",
    icon: Swords,
    accentColor: "#dc2626",
    glowColor: "rgba(220, 38, 38, 0.25)",
    borderColor: "rgba(220, 38, 38, 0.3)",
    tagColor: "rgba(220, 38, 38, 0.12)",
    tagText: "#ef4444",
    badge: "D&D 5e",
    gradient:
      "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(185,28,28,0.04) 50%, transparent 100%)",
  },
  {
    href: "/warhammer",
    title: "Warhammer",
    subtitle: "For the Emperor",
    description:
      "Command your armies across the 41st Millennium or the Mortal Realms. Manage your collection, plan your battles, and crush your enemies.",
    icon: Crosshair,
    accentColor: "#d97706",
    glowColor: "rgba(217, 119, 6, 0.25)",
    borderColor: "rgba(217, 119, 6, 0.3)",
    tagColor: "rgba(217, 119, 6, 0.12)",
    tagText: "#f59e0b",
    badge: "40K & AoS",
    gradient:
      "linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(180,83,9,0.04) 50%, transparent 100%)",
  },
];

export default function HomePage() {
  const router = useRouter();

  function handlePlayAsGuest() {
    enterGuestMode();
    router.push("/dnd");
  }

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.10) 0%, transparent 70%)",
        }}
      />

      <GuestBanner />

      {/* Header */}
      <header
        className="relative z-10 border-b"
        style={{
          backgroundColor: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
          <Shield size={22} style={{ color: "var(--purple-light)" }} />
          <span
            className="font-cinzel font-semibold text-base tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Tabletop Hub
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
          <div className="relative z-10 max-w-3xl">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 border"
              style={{
                backgroundColor: "rgba(124, 58, 237, 0.1)",
                borderColor: "rgba(124, 58, 237, 0.3)",
                color: "var(--purple-light)",
              }}
            >
              <Shield size={12} />
              Your tabletop companion
            </div>

            <h1
              className="font-cinzel text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              One Hub.{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, var(--purple-light), var(--gold-light))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Every Table.
              </span>
            </h1>

            <p
              className="text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10"
              style={{ color: "var(--text-muted)" }}
            >
              Manage your characters, campaigns, and armies all in one place.
              Built for players who live and breathe tabletop.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, var(--purple), var(--purple-light))",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 28px rgba(124, 58, 237, 0.55)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(124, 58, 237, 0.4)";
                }}
              >
                <Shield size={16} />
                Create Account
              </a>
              <button
                onClick={handlePlayAsGuest}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <Ghost size={16} />
                Play as Guest
              </button>
            </div>
          </div>
        </section>

        {/* Game Cards */}
        <section className="max-w-5xl mx-auto w-full px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.map((game) => (
              <GameCard key={game.href} {...game} />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 border-t py-8 text-center"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-xs">
          Built with{" "}
          <span style={{ color: "var(--purple-light)" }}>Tabletop Hub</span> ·
          Roll for initiative.
        </p>
      </footer>
    </div>
  );
}
