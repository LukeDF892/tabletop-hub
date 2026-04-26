"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Crosshair, Swords, Target, BookOpen, Shield } from "lucide-react";

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
