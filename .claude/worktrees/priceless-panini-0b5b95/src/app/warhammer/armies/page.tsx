"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Plus, Edit2, Trash2, Play, BookOpen } from "lucide-react";

interface Army {
  id: string;
  name: string;
  faction: string;
  detachment: string | null;
  total_points: number;
  points_limit: number;
  created_at: string;
  updated_at: string;
}

const FACTION_COLORS: Record<string, string> = {
  "Space Marines": "#1e40af",
  "Dark Angels": "#166534",
  "Tyranids": "#7c3aed",
  "Necrons": "#15803d",
};

function factionColor(faction: string) {
  return FACTION_COLORS[faction] ?? "#d97706";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ArmiesPage() {
  const router = useRouter();
  const [armies, setArmies] = useState<Army[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Army | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      const { data } = await supabase
        .from("warhammer_armies")
        .select("id, name, faction, detachment, total_points, points_limit, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setArmies(data ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function deleteArmy(id: string) {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("warhammer_armies").delete().eq("id", id);
    setArmies((prev) => prev.filter((a) => a.id !== id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  const accentRed = "#dc2626";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,119,6,0.07) 0%, transparent 70%)",
        }}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(220,38,38,0.4)" }}
          >
            <h2 className="font-cinzel text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Delete Army?
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--text-primary)" }}>{deleteTarget.name}</strong> will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteArmy(deleteTarget.id)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)", color: accentRed }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-14 pb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)" }}
              >
                <Shield size={20} style={{ color: "#d97706" }} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#d97706" }}>
                  Warhammer 40,000
                </p>
                <h1 className="font-cinzel text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  My Armies
                </h1>
              </div>
            </div>
            <Link
              href="/warhammer/army-builder"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.35)", color: "#d97706" }}
            >
              <Plus size={15} />
              New Army
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl animate-pulse"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                />
              ))}
            </div>
          ) : armies.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}
            >
              <BookOpen size={40} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
              <h2 className="font-cinzel text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                No armies yet
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                Head to the Army Builder to craft your first force.
              </p>
              <Link
                href="/warhammer/army-builder"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.4)", color: "#d97706" }}
              >
                <Plus size={15} />
                Build an Army
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {armies.map((army) => {
                const color = factionColor(army.faction);
                const ptsPercent = Math.min((army.total_points / army.points_limit) * 100, 100);
                const isOver = army.total_points > army.points_limit;
                return (
                  <div
                    key={army.id}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${color}30` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h2 className="font-cinzel font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                            {army.name}
                          </h2>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                          >
                            {army.faction}
                          </span>
                        </div>
                        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                          {army.detachment ?? "No detachment"} · Updated {timeAgo(army.updated_at)}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${ptsPercent}%`, backgroundColor: isOver ? "#ef4444" : color }}
                            />
                          </div>
                          <span className="text-xs font-bold shrink-0" style={{ color: isOver ? "#ef4444" : color }}>
                            {army.total_points}/{army.points_limit}pts
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/warhammer/games/new?army=${army.id}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
                          title="Play with this army"
                        >
                          <Play size={14} />
                        </Link>
                        <Link
                          href={`/warhammer/army-builder?armyId=${army.id}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: `${color}12`, border: `1px solid ${color}30`, color }}
                          title="Edit army"
                        >
                          <Edit2 size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(army)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: accentRed }}
                          title="Delete army"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
