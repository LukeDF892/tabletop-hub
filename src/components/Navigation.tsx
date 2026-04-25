"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Shield } from "lucide-react";

type Crumb = { label: string; href: string };

const BREADCRUMBS: Record<string, Crumb[]> = {
  "/dnd": [{ label: "D&D", href: "/dnd" }],
  "/warhammer": [{ label: "Warhammer", href: "/warhammer" }],
};

export default function Navigation() {
  const pathname = usePathname();

  const crumbs = BREADCRUMBS[pathname] ?? [];
  const isHome = pathname === "/";

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
      </div>
    </header>
  );
}
