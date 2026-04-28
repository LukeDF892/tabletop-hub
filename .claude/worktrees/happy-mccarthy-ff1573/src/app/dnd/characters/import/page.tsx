"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import {
  importFromDndBeyond,
  saveImportedCharacter,
} from "@/app/dnd/characters/actions";
import {
  Download,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface Preview {
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
}

interface CharacterData {
  dnd_beyond_url?: string;
  [key: string]: unknown;
}

export default function ImportPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);
    setCharacterData(null);

    const result = await importFromDndBeyond(url.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setPreview(result.preview ?? null);
    setCharacterData({ ...(result.character as CharacterData ?? {}), dnd_beyond_url: url.trim() });
  }

  async function handleSave() {
    if (!characterData) return;
    setSaving(true);
    setError("");
    const result = await saveImportedCharacter(characterData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/dnd/characters/${result.id}`);
  }

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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,119,6,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 flex items-start justify-center px-6 py-16">
          <div className="w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(217,119,6,0.12)",
                  border: "1px solid rgba(217,119,6,0.35)",
                }}
              >
                <Download size={22} style={{ color: "#d97706" }} />
              </div>
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-widest"
                  style={{ color: "#d97706" }}
                >
                  D&amp;D Beyond
                </p>
                <h1
                  className="font-cinzel text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Import Character
                </h1>
              </div>
            </div>

            {/* Info Box */}
            <div
              className="rounded-xl p-4 mb-6 flex gap-3"
              style={{
                backgroundColor: "rgba(14,165,233,0.06)",
                border: "1px solid rgba(14,165,233,0.2)",
              }}
            >
              <AlertTriangle
                size={16}
                style={{ color: "#0ea5e9", flexShrink: 0, marginTop: 2 }}
              />
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                <p>
                  Character must be set to{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    public
                  </strong>{" "}
                  in D&amp;D Beyond. To make it public: open your character →
                  Settings → Sharing → set to &quot;Public&quot;.
                </p>
              </div>
            </div>

            {/* URL Form */}
            <form onSubmit={handleImport} className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Character URL
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.dndbeyond.com/characters/12345678"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
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
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Example:{" "}
                  <span
                    className="font-mono"
                    style={{ color: "var(--text-primary)" }}
                  >
                    https://www.dndbeyond.com/characters/12345678
                  </span>
                </p>
              </div>

              {error && (
                <div
                  className="rounded-lg px-4 py-3 flex gap-2 text-sm"
                  style={{
                    backgroundColor: "rgba(220,38,38,0.1)",
                    border: "1px solid rgba(220,38,38,0.3)",
                    color: "var(--crimson-light)",
                  }}
                >
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-cinzel font-semibold text-sm tracking-wide transition-all disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(217,119,6,0.2)",
                  border: "1px solid rgba(217,119,6,0.45)",
                  color: "#d97706",
                  boxShadow: "0 0 20px rgba(217,119,6,0.12)",
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    e.currentTarget.style.backgroundColor =
                      "rgba(217,119,6,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(217,119,6,0.2)";
                }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ExternalLink size={16} />
                )}
                {loading ? "Fetching character..." : "Fetch Character"}
              </button>
            </form>

            {/* Preview Card */}
            {preview && (
              <div
                className="rounded-xl p-5 flex flex-col gap-4"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  background:
                    "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, var(--bg-card) 60%)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-cinzel font-bold text-xl"
                    style={{
                      backgroundColor: "rgba(217,119,6,0.12)",
                      border: "2px solid rgba(217,119,6,0.35)",
                      color: "#d97706",
                    }}
                  >
                    {preview.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2
                      className="font-cinzel text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {preview.name}
                    </h2>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {preview.race} · {preview.class} · Level {preview.level}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Level", value: preview.level },
                    { label: "Max HP", value: preview.hp },
                    { label: "Class", value: preview.class },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="text-center rounded-lg py-2"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p
                        className="text-xs uppercase tracking-wider mb-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="font-cinzel font-bold text-lg"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-cinzel font-semibold text-sm tracking-wide transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: "rgba(16,185,129,0.2)",
                    border: "1px solid rgba(16,185,129,0.45)",
                    color: "#10b981",
                    boxShadow: "0 0 20px rgba(16,185,129,0.12)",
                  }}
                  onMouseEnter={(e) => {
                    if (!saving)
                      e.currentTarget.style.backgroundColor =
                        "rgba(16,185,129,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(16,185,129,0.2)";
                  }}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {saving ? "Saving..." : "Import to Tabletop Hub"}
                </button>

                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                  Basic stats imported. Full spell and equipment details can be
                  edited on the character sheet.
                </p>
              </div>
            )}

            {/* Already have a character link */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/dnd/characters")}
                className="inline-flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                <ArrowRight size={13} />
                Back to my characters
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
