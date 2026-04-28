"use client";

import Navigation from "@/components/Navigation";
import HubCard from "@/components/HubCard";
import { Crosshair, Rocket, Zap } from "lucide-react";

const sections = [
  {
    title: "Warhammer 40,000",
    description:
      "The 41st Millennium awaits. Manage your 40K armies, track your collection, and prepare your forces for the eternal war.",
    icon: Rocket,
    accentColor: "#d97706",
    borderColor: "rgba(217, 119, 6, 0.35)",
    glowColor: "rgba(217, 119, 6, 0.22)",
    tagColor: "rgba(217, 119, 6, 0.12)",
    badge: "Warhammer 40K",
    gradient:
      "linear-gradient(135deg, rgba(217,119,6,0.07) 0%, rgba(180,83,9,0.03) 50%, transparent 100%)",
    comingSoon: true,
  },
  {
    title: "Age of Sigmar",
    description:
      "Battle across the eight Mortal Realms. Build your Stormcast Eternals, Nighthaunt, or any of the mighty armies of AoS.",
    icon: Zap,
    accentColor: "#7c3aed",
    borderColor: "rgba(124, 58, 237, 0.35)",
    glowColor: "rgba(124, 58, 237, 0.22)",
    tagColor: "rgba(124, 58, 237, 0.12)",
    badge: "Age of Sigmar",
    gradient:
      "linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(109,40,217,0.03) 50%, transparent 100%)",
    comingSoon: true,
  },
];

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
              Choose your battlefield. Whether you fight across the stars of the
              41st Millennium or the magical Mortal Realms, your armies await.
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
              {sections.map((section) => (
                <HubCard key={section.title} {...section} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
