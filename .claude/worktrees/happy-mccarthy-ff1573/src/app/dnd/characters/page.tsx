import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  Download,
  UserCheck,
  Swords,
  Heart,
  ArrowRight,
} from "lucide-react";

function mod(score: number) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function hpColor(current: number, max: number) {
  const pct = current / max;
  if (pct > 0.5) return "#10b981";
  if (pct > 0.25) return "#f59e0b";
  return "#dc2626";
}

export default async function CharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dnd/characters");

  const { data: characters } = await supabase
    .from("dnd_characters")
    .select(
      "id, name, race, class, subclass, level, current_hp, max_hp, strength, dexterity, constitution, intelligence, wisdom, charisma, portrait_url, background, alignment"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,38,38,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col flex-1">
        <Navigation />

        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(220,38,38,0.12)",
                  border: "1px solid rgba(220,38,38,0.3)",
                }}
              >
                <UserCheck size={20} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <h1
                  className="font-cinzel text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  My Characters
                </h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {characters?.length ?? 0} character
                  {(characters?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dnd/characters/import"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: "rgba(217,119,6,0.1)",
                  border: "1px solid rgba(217,119,6,0.25)",
                  color: "#d97706",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(217,119,6,0.18)")
                }
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(217,119,6,0.1)")
                }
              >
                <Download size={15} />
                Import from D&amp;D Beyond
              </Link>
              <Link
                href="/dnd/characters/new"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.35)",
                  color: "#ef4444",
                  boxShadow: "0 0 16px rgba(220,38,38,0.1)",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(220,38,38,0.25)")
                }
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(220,38,38,0.15)")
                }
              >
                <PlusCircle size={15} />
                Create Character
              </Link>
            </div>
          </div>

          {/* Characters Grid */}
          {!characters || characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.2)",
                }}
              >
                <Swords size={32} style={{ color: "rgba(220,38,38,0.5)" }} />
              </div>
              <div className="text-center">
                <h2
                  className="font-cinzel text-xl font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  No characters yet
                </h2>
                <p
                  className="text-sm max-w-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  Your adventures await. Create your first character or import
                  one from D&amp;D Beyond.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/dnd/characters/import"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: "rgba(217,119,6,0.12)",
                    border: "1px solid rgba(217,119,6,0.3)",
                    color: "#d97706",
                  }}
                >
                  <Download size={15} />
                  Import from D&amp;D Beyond
                </Link>
                <Link
                  href="/dnd/characters/new"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: "rgba(220,38,38,0.15)",
                    border: "1px solid rgba(220,38,38,0.35)",
                    color: "#ef4444",
                  }}
                >
                  <PlusCircle size={15} />
                  Create Character
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {characters.map((char) => {
                const primaryStat = Math.max(
                  char.strength,
                  char.dexterity,
                  char.intelligence,
                  char.wisdom,
                  char.charisma
                );
                const hpPct = Math.max(
                  0,
                  Math.min(1, char.current_hp / char.max_hp)
                );

                return (
                  <Link
                    key={char.id}
                    href={`/dnd/characters/${char.id}`}
                    className="group rounded-xl p-5 flex flex-col gap-4 transition-all"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid rgba(220,38,38,0.2)",
                      background:
                        "linear-gradient(135deg, rgba(220,38,38,0.05) 0%, var(--bg-card) 50%)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(220,38,38,0.45)";
                      e.currentTarget.style.boxShadow =
                        "0 0 24px rgba(220,38,38,0.1)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(220,38,38,0.2)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Character header */}
                    <div className="flex items-start gap-3">
                      {char.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={char.portrait_url}
                          alt={char.name}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                          style={{
                            border: "2px solid rgba(220,38,38,0.3)",
                          }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center font-cinzel font-bold text-lg shrink-0"
                          style={{
                            backgroundColor: "rgba(220,38,38,0.12)",
                            border: "2px solid rgba(220,38,38,0.3)",
                            color: "#ef4444",
                          }}
                        >
                          {char.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-cinzel font-bold text-base truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {char.name}
                        </h3>
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {char.race} · {char.class}
                          {char.subclass ? ` (${char.subclass})` : ""} · Level{" "}
                          {char.level}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: "rgba(220,38,38,0.1)",
                          border: "1px solid rgba(220,38,38,0.25)",
                          color: "#ef4444",
                        }}
                      >
                        Lvl {char.level}
                      </span>
                    </div>

                    {/* HP Bar */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Heart
                            size={13}
                            style={{
                              color: hpColor(char.current_hp, char.max_hp),
                            }}
                          />
                          <span
                            className="text-xs font-medium font-mono"
                            style={{
                              color: hpColor(char.current_hp, char.max_hp),
                            }}
                          >
                            {char.current_hp} / {char.max_hp} HP
                          </span>
                        </div>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.08)",
                        }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${hpPct * 100}%`,
                            backgroundColor: hpColor(
                              char.current_hp,
                              char.max_hp
                            ),
                          }}
                        />
                      </div>
                    </div>

                    {/* Ability scores row */}
                    <div className="grid grid-cols-6 gap-1">
                      {[
                        { label: "STR", value: char.strength },
                        { label: "DEX", value: char.dexterity },
                        { label: "CON", value: char.constitution },
                        { label: "INT", value: char.intelligence },
                        { label: "WIS", value: char.wisdom },
                        { label: "CHA", value: char.charisma },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex flex-col items-center rounded-md py-1.5"
                          style={{
                            backgroundColor:
                              value === primaryStat
                                ? "rgba(220,38,38,0.12)"
                                : "rgba(255,255,255,0.03)",
                            border: `1px solid ${
                              value === primaryStat
                                ? "rgba(220,38,38,0.25)"
                                : "rgba(255,255,255,0.06)"
                            }`,
                          }}
                        >
                          <span
                            className="text-xs font-mono font-bold"
                            style={{
                              color:
                                value === primaryStat
                                  ? "#ef4444"
                                  : "var(--text-primary)",
                              fontSize: "11px",
                            }}
                          >
                            {mod(value)}
                          </span>
                          <span
                            className="uppercase tracking-wider"
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "9px",
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {char.background && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {char.background} · {char.alignment}
                      </p>
                    )}

                    <div
                      className="mt-auto flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: "#ef4444" }}
                    >
                      Open Sheet
                      <ArrowRight
                        size={12}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
