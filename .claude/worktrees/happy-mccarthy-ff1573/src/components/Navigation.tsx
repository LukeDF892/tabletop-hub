"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Shield, User, LogOut, LogIn, Ghost } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";

type Crumb = { label: string; href: string };

const BREADCRUMBS: Record<string, Crumb[]> = {
  "/dnd": [{ label: "D&D", href: "/dnd" }],
  "/warhammer": [{ label: "Warhammer", href: "/warhammer" }],
  "/dnd/characters": [
    { label: "D&D", href: "/dnd" },
    { label: "Characters", href: "/dnd/characters" },
  ],
  "/dnd/games/new": [
    { label: "D&D", href: "/dnd" },
    { label: "New Game", href: "/dnd/games/new" },
  ],
  "/join": [{ label: "Join Game", href: "/join" }],
};

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  const crumbs =
    BREADCRUMBS[pathname] ??
    (pathname.startsWith("/dnd/games/")
      ? [
          { label: "D&D", href: "/dnd" },
          { label: "Game Room", href: pathname },
        ]
      : pathname.startsWith("/dnd/characters/") && pathname !== "/dnd/characters/new" && pathname !== "/dnd/characters/import"
      ? [
          { label: "D&D", href: "/dnd" },
          { label: "Characters", href: "/dnd/characters" },
          { label: "Sheet", href: pathname },
        ]
      : []);
  const isHome = pathname === "/";

  useEffect(() => {
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
                <span
                  className="font-cinzel tracking-wide"
                  style={{ color: "var(--gold)" }}
                >
                  {c.label}
                </span>
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
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/dnd"
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: "rgba(217,119,6,0.1)",
                  border: "1px solid rgba(217,119,6,0.25)",
                  color: "var(--gold)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(217,119,6,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(217,119,6,0.1)";
                }}
              >
                <Ghost size={13} />
                Play as Guest
              </Link>
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
                  e.currentTarget.style.borderColor =
                    "rgba(124, 58, 237, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(124, 58, 237, 0.15)";
                  e.currentTarget.style.borderColor =
                    "rgba(124, 58, 237, 0.3)";
                }}
              >
                <LogIn size={15} />
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
