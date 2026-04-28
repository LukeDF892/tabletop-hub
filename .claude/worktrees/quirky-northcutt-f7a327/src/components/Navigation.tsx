"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Shield, User, LogOut, LogIn, Ghost } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import { isGuestMode, getGuestName, exitGuestMode } from "@/lib/guest";

type Crumb = { label: string; href: string };

const BREADCRUMBS: Record<string, Crumb[]> = {
  "/dnd": [{ label: "D&D", href: "/dnd" }],
  "/dnd/characters": [
    { label: "D&D", href: "/dnd" },
    { label: "Characters", href: "/dnd/characters" },
  ],
  "/dnd/characters/create": [
    { label: "D&D", href: "/dnd" },
    { label: "Characters", href: "/dnd/characters" },
    { label: "New Character", href: "/dnd/characters/create" },
  ],
  "/dnd/characters/import": [
    { label: "D&D", href: "/dnd" },
    { label: "Characters", href: "/dnd/characters" },
    { label: "Import", href: "/dnd/characters/import" },
  ],
  "/dnd/games/create": [
    { label: "D&D", href: "/dnd" },
    { label: "Create Game", href: "/dnd/games/create" },
  ],
  "/warhammer": [{ label: "Warhammer", href: "/warhammer" }],
  "/warhammer/wh40k": [
    { label: "Warhammer", href: "/warhammer" },
    { label: "40,000", href: "/warhammer/wh40k" },
  ],
  "/warhammer/age_of_sigmar": [
    { label: "Warhammer", href: "/warhammer" },
    { label: "Age of Sigmar", href: "/warhammer/age_of_sigmar" },
  ],
  "/join": [{ label: "Join Game", href: "/join" }],
};

function getBreadcrumbs(pathname: string): Crumb[] {
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
  // Dynamic routes
  const characterMatch = pathname.match(/^\/dnd\/characters\/([^/]+)$/);
  if (characterMatch && characterMatch[1] !== "create" && characterMatch[1] !== "import") {
    return [
      { label: "D&D", href: "/dnd" },
      { label: "Characters", href: "/dnd/characters" },
      { label: "Character Sheet", href: pathname },
    ];
  }
  const armyMatch = pathname.match(/^\/warhammer\/(wh40k|age_of_sigmar)\/armies\/([^/]+)$/);
  if (armyMatch) {
    const sys = armyMatch[1] === "wh40k" ? "40,000" : "Age of Sigmar";
    return [
      { label: "Warhammer", href: "/warhammer" },
      { label: sys, href: `/warhammer/${armyMatch[1]}` },
      { label: "Army", href: pathname },
    ];
  }
  return [];
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState("");

  const crumbs = getBreadcrumbs(pathname);
  const isHome = pathname === "/";

  useEffect(() => {
    setGuestMode(isGuestMode());
    setGuestName(getGuestName());

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) loadUsername(supabase, data.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUsername(supabase, session.user.id);
      else setProfileUsername(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUsername(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    userId: string
  ) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (data?.username) setProfileUsername(data.username);
  }

  async function handleSignOut() {
    await signOut();
    exitGuestMode();
    router.push("/auth/login");
  }

  const displayName =
    profileUsername ?? user?.email?.split("@")[0] ?? "Adventurer";

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "rgba(10, 10, 15, 0.85)",
        backdropFilter: "blur(12px)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
        {/* Back button */}
        {!isHome && (
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--purple-light)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            <ChevronLeft size={16} />
            <span>Home</span>
          </Link>
        )}

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 ml-auto md:ml-0">
          <Shield
            size={22}
            style={{ color: "var(--purple-light)" }}
            className="shrink-0"
          />
          <span
            className="font-cinzel font-semibold text-base tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Tabletop Hub
          </span>
        </Link>

        {/* Breadcrumbs */}
        {crumbs.length > 0 && (
          <nav className="hidden md:flex items-center gap-2 text-sm">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-2">
                {i > 0 && (
                  <span style={{ color: "var(--border-card)" }}>/</span>
                )}
                <Link
                  href={c.href}
                  className="font-cinzel tracking-wide transition-colors"
                  style={{ color: i === crumbs.length - 1 ? "var(--gold)" : "var(--text-muted)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--gold-light)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color =
                      i === crumbs.length - 1 ? "var(--gold)" : "var(--text-muted)")
                  }
                >
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>
        )}

        {/* Auth area */}
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                  style={{
                    backgroundColor: "rgba(124, 58, 237, 0.25)",
                    color: "var(--purple-light)",
                    border: "1px solid rgba(124, 58, 237, 0.4)",
                  }}
                >
                  {displayName[0].toUpperCase()}
                </div>
                <span className="hidden sm:block">{displayName}</span>
                <User size={14} className="sm:hidden" />
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--crimson-light)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
                title="Sign out"
              >
                <LogOut size={15} />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </>
          ) : guestMode ? (
            <>
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <Ghost size={15} style={{ color: "var(--purple-light)" }} />
                <span className="hidden sm:block">{guestName}</span>
              </div>
              <Link
                href="/auth/signup"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: "rgba(124, 58, 237, 0.15)",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  color: "var(--purple-light)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.15)";
                }}
              >
                Save Progress
              </Link>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: "rgba(124, 58, 237, 0.15)",
                border: "1px solid rgba(124, 58, 237, 0.3)",
                color: "var(--purple-light)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(124, 58, 237, 0.25)";
                e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(124, 58, 237, 0.15)";
                e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.3)";
              }}
            >
              <LogIn size={15} />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
