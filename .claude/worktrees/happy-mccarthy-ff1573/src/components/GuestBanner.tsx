"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Scroll } from "lucide-react";

export default function GuestBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className="relative"
      style={{
        background:
          "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(217,119,6,0.08) 100%)",
        borderBottom: "1px solid rgba(124,58,237,0.2)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
        <Scroll size={15} style={{ color: "var(--gold)", flexShrink: 0 }} />
        <p className="text-sm flex-1" style={{ color: "var(--text-muted)" }}>
          You&apos;re browsing as a guest. Create a free account to save
          characters and join games.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/auth/signup"
            className="text-xs font-medium px-3 py-1 rounded-md transition-all"
            style={{
              backgroundColor: "rgba(124,58,237,0.2)",
              border: "1px solid rgba(124,58,237,0.4)",
              color: "var(--purple-light)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(124,58,237,0.32)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(124,58,237,0.2)";
            }}
          >
            Sign Up
          </Link>
          <Link
            href="/auth/login"
            className="text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            Sign In
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded transition-colors shrink-0"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
