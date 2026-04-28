"use client";

import Navigation from "@/components/Navigation";
import HubCard from "@/components/HubCard";
import { Swords, Users, PlusCircle, UserCheck } from "lucide-react";

const sections = [
  {
    title: "Create Game",
    description:
      "Start a new campaign as Dungeon Master. Set the scene, invite your players, and build a world your party will never forget.",
    icon: PlusCircle,
    accentColor: "#7c3aed",
    borderColor: "rgba(124, 58, 237, 0.3)",
    glowColor: "rgba(124, 58, 237, 0.2)",
    tagColor: "rgba(124, 58, 237, 0.12)",
    badge: "Dungeon Master",
    comingSoon: true,
  },
  {
    title: "Join Game",
    description:
      "Got an invite from your DM? Jump into an existing campaign with your party and continue the adventure.",
    icon: Users,
    accentColor: "#d97706",
    borderColor: "rgba(217, 119, 6, 0.3)",
    glowColor: "rgba(217, 119, 6, 0.2)",
    tagColor: "rgba(217, 119, 6, 0.12)",
    badge: "Player",
    comingSoon: true,
  },
  {
    title: "My Characters",
    description:
      "View, edit, and manage all your D&D characters. Track stats, spells, equipment, and backstory in one place.",
    icon: UserCheck,
    accentColor: "#dc2626",
    borderColor: "rgba(220, 38, 38, 0.3)",
    glowColor: "rgba(220, 38, 38, 0.2)",
    tagColor: "rgba(220, 38, 38, 0.12)",
    badge: "Characters",
    comingSoon: true,
  },
];

export default function DndPage() {
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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,38,38,0.07) 0%, transparent 70%)",
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
                  backgroundColor: "rgba(220, 38, 38, 0.12)",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                }}
              >
                <Swords size={28} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: "#dc2626" }}
                >
                  Tabletop Hub
                </p>
                <h1
                  className="font-cinzel text-3xl md:text-4xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Dungeons & Dragons
                </h1>
              </div>
            </div>

            <p
              className="text-base leading-relaxed max-w-2xl"
              style={{ color: "var(--text-muted)" }}
            >
              Your complete D&D companion. Create worlds, build characters, and
              manage your campaigns — all in one place.
            </p>

            <div
              className="mt-6 h-px"
              style={{
                background:
                  "linear-gradient(to right, rgba(220,38,38,0.4), transparent)",
              }}
            />
          </section>

          {/* Cards */}
          <section className="max-w-6xl mx-auto w-full px-6 pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
