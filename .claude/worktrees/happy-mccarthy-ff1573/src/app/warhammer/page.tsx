"use client";

import Navigation from "@/components/Navigation";
import GuestBanner from "@/components/GuestBanner";
import { Crosshair, Rocket, BookOpen, ArrowRight, Swords } from "lucide-react";
import Link from "next/link";

export default function WarhammerPage() {
  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Ambient glow */}
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
        <GuestBanner />

        <main className="flex-1 flex flex-col">
          {/* Hero */}
          <section className="max-w-6xl mx-auto w-full px-6 pt-16 pb-12">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
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
                  Warhammer
                </h1>
              </div>
            </div>

            <p
              className="text-base leading-relaxed max-w-2xl"
              style={{ color: "var(--text-muted)" }}
            >
              The 41st Millennium awaits. Build your army, command the stars, and wage eternal war.
            </p>

            <div
              className="mt-6 h-px"
              style={{
                background:
                  "linear-gradient(to right, rgba(217,119,6,0.4), transparent)",
              }}
            />
          </section>

          {/* Cards */}
          <section className="max-w-6xl mx-auto w-full px-6 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Warhammer 40K — LIVE */}
              <Link
                href="/warhammer/army-builder"
                className="group rounded-xl p-6 flex flex-col gap-4 transition-all cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(217,119,6,0.3)",
                  background:
                    "linear-gradient(135deg, rgba(217,119,6,0.07) 0%, rgba(15,15,22,1) 60%)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.6)";
                  e.currentTarget.style.boxShadow =
                    "0 0 32px rgba(217,119,6,0.14)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(217,119,6,0.12)",
                      border: "1px solid rgba(217,119,6,0.3)",
                    }}
                  >
                    <Rocket size={22} style={{ color: "#d97706" }} />
                  </div>
                  <div className="flex gap-2">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: "rgba(217,119,6,0.12)",
                        color: "#f59e0b",
                        border: "1px solid rgba(217,119,6,0.25)",
                      }}
                    >
                      10th Edition
                    </span>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: "rgba(16,185,129,0.1)",
                        color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.25)",
                      }}
                    >
                      Live
                    </span>
                  </div>
                </div>
                <div>
                  <h3
                    className="font-cinzel text-xl font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Warhammer 40,000
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Build and manage your 40K armies. Full unit data for Space Marines
                    (including Dark Angels), Necrons, and Tyranids — with complete
                    10th edition stat blocks, detachments, and stratagems.
                  </p>
                </div>

                {/* Faction previews */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { name: "Space Marines", color: "#3b82f6" },
                    { name: "Dark Angels", color: "#16a34a" },
                    { name: "Necrons", color: "#22d3ee" },
                    { name: "Tyranids", color: "#a855f7" },
                  ].map((f) => (
                    <span
                      key={f.name}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: `${f.color}15`,
                        border: `1px solid ${f.color}30`,
                        color: f.color,
                      }}
                    >
                      {f.name}
                    </span>
                  ))}
                </div>

                <div
                  className="mt-auto flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "#d97706" }}
                >
                  Build Army
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>

              {/* Age of Sigmar — Coming Soon */}
              <div
                className="rounded-xl p-6 flex flex-col gap-4 opacity-60"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(15,15,22,1) 60%)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(124,58,237,0.1)",
                      border: "1px solid rgba(124,58,237,0.2)",
                    }}
                  >
                    <Swords size={22} style={{ color: "var(--purple-light)" }} />
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "var(--text-muted)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Coming Soon
                  </span>
                </div>
                <div>
                  <h3
                    className="font-cinzel text-xl font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Age of Sigmar
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Battle across the eight Mortal Realms. Stormcast Eternals, Nighthaunt,
                    and the full AoS roster — coming in a future update.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                  <BookOpen size={13} />
                  In development
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
