"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Shield, User, LogOut, LogIn, Eye, Menu, X } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";

type Crumb = { label: string; href: string };

const BREADCRUMBS: Record<string, Crumb[]> = {
  "/dnd": [{ label: "D&D", href: "/dnd" }],
  "/warhammer": [{ label: "Warhammer", href: "/warhammer" }],
};

const NAV_LINKS = [
  { label: "D&D", href: "/dnd" },
  { label: "Warhammer", href: "/warhammer" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const crumbs = BREADCRUMBS[pathname] ?? [];
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        {/* Back button — desktop only */}
        {!isHome && (
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-sm transition-colors"
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
        <Link href="/" className="flex items-center gap-2">
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

        {/* Breadcrumbs — desktop only */}
        {crumbs.length > 0 && (
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <span style={{ color: "var(--border-card)" }}>/</span>
            {crumbs.map((c) => (
              <span
                key={c.href}
                className="font-cinzel tracking-wide"
                style={{ color: "var(--gold)" }}
              >
                {c.label}
              </span>
            ))}
          </nav>
        )}

        {/* Auth area — desktop */}
        <div className="ml-auto hidden sm:flex items-center gap-3">
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
                <span>{displayName}</span>
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
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/warhammer"
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                <Eye size={14} />
                Browse as Guest
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
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="ml-auto sm:hidden p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="sm:hidden border-t px-4 py-4 space-y-2"
          style={{
            backgroundColor: "rgba(10, 10, 15, 0.97)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {!isHome && (
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronLeft size={15} />
              Home
            </Link>
          )}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: pathname.startsWith(link.href)
                  ? "var(--gold)"
                  : "var(--text-muted)",
                backgroundColor: pathname.startsWith(link.href)
                  ? "rgba(217,119,6,0.08)"
                  : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
          <div
            className="h-px my-2"
            style={{ backgroundColor: "var(--border-subtle)" }}
          />
          {user ? (
            <>
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                <User size={15} />
                {displayName}
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm w-full text-left"
                style={{ color: "var(--crimson-light)" }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/warhammer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                <Eye size={15} />
                Browse as Guest
              </Link>
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: "rgba(124, 58, 237, 0.15)",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  color: "var(--purple-light)",
                }}
              >
                <LogIn size={15} />
                Sign in
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
