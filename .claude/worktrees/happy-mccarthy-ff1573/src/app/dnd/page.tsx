"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import GuestBanner from "@/components/GuestBanner";
import { Swords, Users, PlusCircle, UserCheck, Key, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DndPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      router.push(`/join?code=${joinCode.trim().toUpperCase()}`);
    }
  }

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
        <GuestBanner />

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
                  Dungeons &amp; Dragons
                </h1>
              </div>
            </div>

            <p
              className="text-base leading-relaxed max-w-2xl"
              style={{ color: "var(--text-muted)" }}
            >
              Your complete D&amp;D companion. Create worlds, build characters, and
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

          {/* Join Game Quick Bar */}
          <section className="max-w-6xl mx-auto w-full px-6 pb-8">
            <div
              className="rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid rgba(217,119,6,0.2)",
                background:
                  "linear-gradient(135deg, rgba(217,119,6,0.06) 0%, rgba(15,15,22,1) 60%)",
              }}
            >
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(217,119,6,0.12)",
                    border: "1px solid rgba(217,119,6,0.3)",
                  }}
                >
                  <Key size={18} style={{ color: "#d97706" }} />
                </div>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Got an invite?
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Enter your game code to jump in
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleJoin}
                className="flex gap-2 flex-1 sm:max-w-sm"
              >
                <input
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.toUpperCase().slice(0, 8))
                  }
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest outline-none transition-all"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(217,119,6,0.25)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(217,119,6,0.6)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(217,119,6,0.25)")
                  }
                />
                <button
                  type="submit"
                  disabled={joinCode.length < 6}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-40"
                  style={{
                    backgroundColor: "rgba(217,119,6,0.2)",
                    border: "1px solid rgba(217,119,6,0.4)",
                    color: "#d97706",
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.backgroundColor =
                        "rgba(217,119,6,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(217,119,6,0.2)";
                  }}
                >
                  Join
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </section>

          {/* Main Cards */}
          <section className="max-w-6xl mx-auto w-full px-6 pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Create Game */}
              <Link
                href="/dnd/games/new"
                className="group rounded-xl p-6 flex flex-col gap-4 transition-all cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(15,15,22,1) 60%)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "rgba(124,58,237,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 0 24px rgba(124,58,237,0.12)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    "rgba(124,58,237,0.25)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(124,58,237,0.12)",
                      border: "1px solid rgba(124,58,237,0.3)",
                    }}
                  >
                    <PlusCircle size={22} style={{ color: "#7c3aed" }} />
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "rgba(124,58,237,0.12)",
                      color: "var(--purple-light)",
                      border: "1px solid rgba(124,58,237,0.2)",
                    }}
                  >
                    Dungeon Master
                  </span>
                </div>
                <div>
                  <h3
                    className="font-cinzel text-lg font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Create Game
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Start a new campaign as Dungeon Master. Set the scene,
                    invite your players, and build a world they&apos;ll never
                    forget.
                  </p>
                </div>
                <div
                  className="mt-auto flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "var(--purple-light)" }}
                >
                  Create campaign
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>

              {/* Join Game */}
              <Link
                href="/join"
                className="group rounded-xl p-6 flex flex-col gap-4 transition-all cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(217,119,6,0.25)",
                  background:
                    "linear-gradient(135deg, rgba(217,119,6,0.07) 0%, rgba(15,15,22,1) 60%)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 0 24px rgba(217,119,6,0.12)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.25)";
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
                    <Users size={22} style={{ color: "#d97706" }} />
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "rgba(217,119,6,0.12)",
                      color: "#f59e0b",
                      border: "1px solid rgba(217,119,6,0.2)",
                    }}
                  >
                    Player
                  </span>
                </div>
                <div>
                  <h3
                    className="font-cinzel text-lg font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Join Game
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Got an invite from your DM? Jump into an existing campaign
                    with your party and continue the adventure.
                  </p>
                </div>
                <div
                  className="mt-auto flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "#f59e0b" }}
                >
                  Enter game code
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>

              {/* My Characters */}
              <Link
                href="/dnd/characters"
                className="group rounded-xl p-6 flex flex-col gap-4 transition-all cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(220,38,38,0.25)",
                  background:
                    "linear-gradient(135deg, rgba(220,38,38,0.07) 0%, rgba(15,15,22,1) 60%)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(220,38,38,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 0 24px rgba(220,38,38,0.12)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(220,38,38,0.25)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(220,38,38,0.12)",
                      border: "1px solid rgba(220,38,38,0.3)",
                    }}
                  >
                    <UserCheck size={22} style={{ color: "#dc2626" }} />
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "rgba(220,38,38,0.12)",
                      color: "#ef4444",
                      border: "1px solid rgba(220,38,38,0.2)",
                    }}
                  >
                    Characters
                  </span>
                </div>
                <div>
                  <h3
                    className="font-cinzel text-lg font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    My Characters
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    View, edit, and manage all your D&amp;D characters. Track
                    stats, spells, equipment, and backstory in one place.
                  </p>
                </div>
                <div
                  className="mt-auto flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "#ef4444" }}
                >
                  View characters
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
