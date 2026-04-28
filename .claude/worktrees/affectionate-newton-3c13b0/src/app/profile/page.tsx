import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navigation from "@/components/Navigation";
import { User, Sword, Shield } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  const username =
    profile?.username ?? user.email?.split("@")[0] ?? "Adventurer";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <Navigation />

      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(124, 58, 237, 0.07) 0%, transparent 70%)",
        }}
      />

      <main className="max-w-2xl mx-auto px-6 py-16 relative z-10">
        {/* Avatar + name */}
        <div className="flex items-center gap-5 mb-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
            style={{
              backgroundColor: "rgba(124, 58, 237, 0.2)",
              border: "2px solid rgba(124, 58, 237, 0.5)",
              color: "var(--purple-light)",
            }}
          >
            {username[0].toUpperCase()}
          </div>
          <div>
            <h1
              className="font-cinzel text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {username}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Member since {memberSince}
            </p>
          </div>
        </div>

        {/* Details card */}
        <div
          className="rounded-xl border p-6 mb-8"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card)",
          }}
        >
          <h2
            className="text-xs font-medium uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Account details
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User size={15} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {username}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)", width: 15 }}
              >
                @
              </span>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {user.email}
              </span>
            </div>
          </div>
        </div>

        {/* Game links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dnd"
            className="rounded-xl border p-5 flex items-center gap-4 transition-all"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-card)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(220, 38, 38, 0.4)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(220, 38, 38, 0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border-card)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--bg-card)";
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(220, 38, 38, 0.15)" }}
            >
              <Sword size={20} style={{ color: "var(--crimson-light)" }} />
            </div>
            <div>
              <p
                className="font-medium text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                My D&amp;D Characters
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Manage your adventurers
              </p>
            </div>
          </Link>

          <Link
            href="/warhammer"
            className="rounded-xl border p-5 flex items-center gap-4 transition-all"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-card)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(217, 119, 6, 0.4)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(217, 119, 6, 0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border-card)";
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--bg-card)";
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(217, 119, 6, 0.15)" }}
            >
              <Shield size={20} style={{ color: "var(--gold-light)" }} />
            </div>
            <div>
              <p
                className="font-medium text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                My Warhammer Armies
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Build and manage your forces
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
