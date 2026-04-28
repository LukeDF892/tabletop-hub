"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import {
  PlusCircle,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  Users,
} from "lucide-react";

type Step = "form" | "success";

interface FormData {
  name: string;
  description: string;
  maxPlayers: number;
}

export default function NewDndGamePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdGame, setCreatedGame] = useState<{
    id: string;
    name: string;
    invite_code: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "",
    description: "",
    maxPlayers: 5,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login?next=/dnd/games/new");
      return;
    }

    const { data, error: dbError } = await supabase
      .from("dnd_games")
      .insert({
        dm_id: user.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        game_state: { maxPlayers: form.maxPlayers },
      })
      .select("id, name, invite_code")
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError(dbError?.message ?? "Failed to create game. Please try again.");
      return;
    }

    setCreatedGame(data);
    setStep("success");
  }

  function copyCode() {
    if (!createdGame) return;
    navigator.clipboard.writeText(createdGame.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${createdGame?.invite_code}`
      : "";

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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 flex items-start justify-center px-6 py-16">
          <div className="w-full max-w-lg">
            {step === "form" ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(124,58,237,0.12)",
                      border: "1px solid rgba(124,58,237,0.3)",
                    }}
                  >
                    <PlusCircle size={22} style={{ color: "#7c3aed" }} />
                  </div>
                  <div>
                    <p
                      className="text-xs font-medium uppercase tracking-widest"
                      style={{ color: "var(--purple-light)" }}
                    >
                      Dungeon Master
                    </p>
                    <h1
                      className="font-cinzel text-2xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Create New Game
                    </h1>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Game Name */}
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Game Name <span style={{ color: "var(--crimson)" }}>*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="The Lost Mines of Phandelver"
                      required
                      className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(124,58,237,0.25)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(124,58,237,0.6)")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(124,58,237,0.25)")
                      }
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Description{" "}
                      <span
                        className="text-xs font-normal"
                        style={{ color: "var(--text-muted)" }}
                      >
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="A classic adventure for new and experienced players alike..."
                      rows={3}
                      className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all resize-none"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(124,58,237,0.2)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(124,58,237,0.5)")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(124,58,237,0.2)")
                      }
                    />
                  </div>

                  {/* Max Players */}
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-sm font-medium flex items-center gap-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <Users size={14} />
                      Max Players
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, maxPlayers: n }))
                          }
                          className="flex-1 py-2.5 rounded-lg text-sm font-mono font-bold transition-all"
                          style={{
                            backgroundColor:
                              form.maxPlayers === n
                                ? "rgba(124,58,237,0.25)"
                                : "rgba(255,255,255,0.04)",
                            border: `1px solid ${
                              form.maxPlayers === n
                                ? "rgba(124,58,237,0.5)"
                                : "rgba(255,255,255,0.08)"
                            }`,
                            color:
                              form.maxPlayers === n
                                ? "var(--purple-light)"
                                : "var(--text-muted)",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p
                      className="text-sm rounded-lg px-4 py-3"
                      style={{
                        backgroundColor: "rgba(220,38,38,0.1)",
                        border: "1px solid rgba(220,38,38,0.3)",
                        color: "var(--crimson-light)",
                      }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !form.name.trim()}
                    className="w-full py-3.5 rounded-xl font-cinzel font-semibold tracking-wide text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      backgroundColor: "rgba(124,58,237,0.25)",
                      border: "1px solid rgba(124,58,237,0.5)",
                      color: "var(--purple-light)",
                      boxShadow: "0 0 24px rgba(124,58,237,0.15)",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading)
                        e.currentTarget.style.backgroundColor =
                          "rgba(124,58,237,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(124,58,237,0.25)";
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <PlusCircle size={16} />
                    )}
                    {loading ? "Creating..." : "Create Campaign"}
                  </button>
                </form>
              </>
            ) : (
              /* Success Screen */
              <div className="text-center flex flex-col items-center gap-6">
                <div>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      backgroundColor: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.4)",
                    }}
                  >
                    <Check size={28} style={{ color: "#10b981" }} />
                  </div>
                  <h2
                    className="font-cinzel text-2xl font-bold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Campaign Created!
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Share this code with your players
                  </p>
                </div>

                {/* Game Code */}
                <div
                  className="w-full rounded-2xl p-6"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid rgba(217,119,6,0.3)",
                    background:
                      "linear-gradient(135deg, rgba(217,119,6,0.08) 0%, var(--bg-card) 60%)",
                  }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-widest mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Invite Code
                  </p>
                  <p
                    className="font-mono font-black text-5xl tracking-[0.3em] mb-4"
                    style={{ color: "#d97706" }}
                  >
                    {createdGame?.invite_code}
                  </p>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: copied
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(217,119,6,0.15)",
                      border: `1px solid ${
                        copied
                          ? "rgba(16,185,129,0.4)"
                          : "rgba(217,119,6,0.4)"
                      }`,
                      color: copied ? "#10b981" : "#d97706",
                    }}
                  >
                    {copied ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copied ? "Copied!" : "Copy Code"}
                  </button>
                </div>

                {/* QR Code */}
                {joinUrl && (
                  <div
                    className="rounded-xl p-4 flex flex-col items-center gap-3"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <p
                      className="text-xs font-medium uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Scan to Join
                    </p>
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: "#ffffff" }}
                    >
                      <QRCodeSVG
                        value={joinUrl}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#0a0a0f"
                        level="M"
                      />
                    </div>
                  </div>
                )}

                {/* Go to Game Room */}
                <button
                  onClick={() =>
                    router.push(`/dnd/games/${createdGame?.id}`)
                  }
                  className="w-full py-3.5 rounded-xl font-cinzel font-semibold tracking-wide text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "rgba(124,58,237,0.25)",
                    border: "1px solid rgba(124,58,237,0.5)",
                    color: "var(--purple-light)",
                    boxShadow: "0 0 24px rgba(124,58,237,0.15)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(124,58,237,0.35)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(124,58,237,0.25)")
                  }
                >
                  Go to Game Room
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
