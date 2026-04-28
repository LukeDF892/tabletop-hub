"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Plus, Edit2, Swords, Trash2, Calendar, Loader2 } from "lucide-react";

interface WarhammerArmy {
  id: string;
  name: string;
  faction: string;
  subfaction: string | null;
  points_limit: number;
  total_points: number;
  created_at: string;
}

const FACTION_COLORS: Record<string, string> = {
  "Space Marines": "#1e40af",
  "Dark Angels": "#166534",
  "Tyranids": "#7c3aed",
  "Necrons": "#15803d",
};

function getAccentColor(faction: string): string {
  return FACTION_COLORS[faction] ?? "#d97706";
}

function ConfirmDialog({
  armyName,
  onConfirm,
  onCancel,
}: {
  armyName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid rgba(220,38,38,0.4)",
          boxShadow: "0 0 40px rgba(220,38,38,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="font-cinzel text-lg font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Delete Army?
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Are you sure you want to delete{" "}
          <span style={{ color: "var(--text-primary)" }}>{armyName}</span>? This
          cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: "rgba(220,38,38,0.18)",
              border: "1px solid rgba(220,38,38,0.45)",
              color: "#ef4444",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyArmiesPage() {
  const router = useRouter();
  const [armies, setArmies] = useState<WarhammerArmy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<WarhammerArmy | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("warhammer_armies")
        .select("id, name, faction, subfaction, points_limit, total_points, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setArmies(data as WarhammerArmy[]);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleDelete(army: WarhammerArmy) {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("warhammer_armies").delete().eq("id", army.id);
    setArmies((prev) => prev.filter((a) => a.id !== army.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,119,6,0.07) 0%, transparent 70%)",
        }}
      />

      {deleteTarget && (
        <ConfirmDialog
          armyName={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-14 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "rgba(217,119,6,0.12)",
                  border: "1px solid rgba(217,119,6,0.3)",
                }}
              >
                <Shield size={22} style={{ color: "#d97706" }} />
              </div>
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-widest mb-0.5"
                  style={{ color: "#d97706" }}
                >
                  Warhammer 40,000
                </p>
                <h1
                  className="font-cinzel text-2xl md:text-3xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  My Armies
                </h1>
              </div>
            </div>

            <Link
              href="/warhammer/army-builder"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: "rgba(217,119,6,0.15)",
                border: "1px solid rgba(217,119,6,0.4)",
                color: "#d97706",
              }}
            >
              <Plus size={16} />
              Build New Army
            </Link>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={28} className="animate-spin" style={{ color: "#d97706" }} />
            </div>
          ) : armies.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid rgba(217,119,6,0.2)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: "rgba(217,119,6,0.1)",
                  border: "1px solid rgba(217,119,6,0.25)",
                }}
              >
                <Swords size={28} style={{ color: "#d97706" }} />
              </div>
              <h2
                className="font-cinzel text-xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                No Armies Yet
              </h2>
              <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
                Forge your first force. Choose a faction, pick a detachment, and
                build your army list.
              </p>
              <Link
                href="/warhammer/army-builder"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-cinzel font-semibold transition-all"
                style={{
                  backgroundColor: "rgba(217,119,6,0.18)",
                  border: "1px solid rgba(217,119,6,0.45)",
                  color: "#d97706",
                }}
              >
                <Plus size={16} />
                Build Your First Army
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {armies.map((army) => {
                const accent = getAccentColor(army.faction);
                const ptsPercent = Math.min(
                  ((army.total_points ?? 0) / (army.points_limit ?? 2000)) * 100,
                  100
                );
                const ptsColor =
                  (army.total_points ?? 0) > (army.points_limit ?? 2000)
                    ? "#ef4444"
                    : (army.total_points ?? 0) > (army.points_limit ?? 2000) * 0.9
                    ? "#f59e0b"
                    : accent;

                return (
                  <div
                    key={army.id}
                    className="rounded-xl p-5 flex flex-col gap-4"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: `1px solid ${accent}30`,
                    }}
                  >
                    {/* Top row: name + faction badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2
                          className="font-cinzel font-bold text-base leading-tight truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {army.name}
                        </h2>
                        {army.subfaction && (
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {army.subfaction}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                        style={{
                          backgroundColor: `${accent}18`,
                          border: `1px solid ${accent}40`,
                          color: accent,
                        }}
                      >
                        {army.faction}
                      </span>
                    </div>

                    {/* Points progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Points
                        </span>
                        <span className="text-xs font-bold" style={{ color: ptsColor }}>
                          {army.total_points ?? 0} / {army.points_limit ?? 2000}
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${ptsPercent}%`,
                            backgroundColor: ptsColor,
                          }}
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatDate(army.created_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-1">
                      <Link
                        href={`/warhammer/army-builder?armyId=${army.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Edit2 size={12} />
                        Edit
                      </Link>
                      <Link
                        href={`/warhammer/games/new?armyId=${army.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: `${accent}15`,
                          border: `1px solid ${accent}35`,
                          color: accent,
                        }}
                      >
                        <Swords size={12} />
                        Play
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(army)}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: "rgba(220,38,38,0.08)",
                          border: "1px solid rgba(220,38,38,0.2)",
                          color: "#ef4444",
                        }}
                        disabled={deleting}
                      >
                        <Trash2 size={12} />
                      </button>
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
