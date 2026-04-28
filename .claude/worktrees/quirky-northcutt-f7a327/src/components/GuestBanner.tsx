"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { isGuestMode, exitGuestMode, getGuestName } from "@/lib/guest";

export default function GuestBanner() {
  const [visible, setVisible] = useState(false);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    if (isGuestMode()) {
      setVisible(true);
      setGuestName(getGuestName());
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="relative z-40 flex items-center justify-center gap-3 px-4 py-2 text-sm"
      style={{
        backgroundColor: "rgba(124, 58, 237, 0.12)",
        borderBottom: "1px solid rgba(124, 58, 237, 0.25)",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>
        Playing as guest{" "}
        <span
          className="font-medium"
          style={{ color: "var(--purple-light)" }}
        >
          {guestName}
        </span>{" "}
        — your progress won&apos;t be saved.
      </span>
      <Link
        href="/auth/signup"
        onClick={exitGuestMode}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
        style={{
          backgroundColor: "rgba(124, 58, 237, 0.25)",
          border: "1px solid rgba(124, 58, 237, 0.5)",
          color: "var(--purple-light)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.25)";
        }}
      >
        <UserPlus size={12} />
        Create Account
      </Link>
      <button
        onClick={() => {
          exitGuestMode();
          setVisible(false);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
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
  );
}
