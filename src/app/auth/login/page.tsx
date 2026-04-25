"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Mail, Lock, Sparkles } from "lucide-react";
import { signIn, signInWithMagicLink } from "../actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (magicMode) {
      const result = await signInWithMagicLink(email);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setMagicSent(true);
        setLoading(false);
      }
    } else {
      const result = await signIn(email, password);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
      // On success redirect() fires in the server action
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Shield size={28} style={{ color: "var(--purple-light)" }} />
          <span
            className="font-cinzel font-semibold text-xl tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Tabletop Hub
          </span>
        </div>

        <div
          className="rounded-xl border p-8"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card)",
          }}
        >
          <h1
            className="font-cinzel text-2xl font-bold mb-2 text-center"
            style={{ color: "var(--text-primary)" }}
          >
            {magicSent ? "Check your email" : "Welcome back"}
          </h1>
          <p
            className="text-sm text-center mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            {magicSent
              ? "A magic link has been sent to " + email
              : "Sign in to continue your adventure"}
          </p>

          {magicSent ? (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(124, 58, 237, 0.15)" }}
              >
                <Mail size={28} style={{ color: "var(--purple-light)" }} />
              </div>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--text-muted)" }}
              >
                Click the link in your email to sign in. You can close this tab.
              </p>
              <button
                onClick={() => {
                  setMagicSent(false);
                  setMagicMode(false);
                  setEmail("");
                }}
                className="text-sm transition-colors"
                style={{ color: "var(--purple-light)" }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--purple)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--border-subtle)")
                    }
                  />
                </div>
              </div>

              {/* Password (hidden in magic link mode) */}
              {!magicMode && (
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "var(--purple)")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor =
                          "var(--border-subtle)")
                      }
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <p
                  className="text-sm rounded-lg px-3 py-2"
                  style={{
                    color: "var(--crimson-light)",
                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                  }}
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: loading
                    ? "rgba(124, 58, 237, 0.5)"
                    : "var(--purple)",
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    e.currentTarget.style.backgroundColor = "var(--purple-light)";
                }}
                onMouseLeave={(e) => {
                  if (!loading)
                    e.currentTarget.style.backgroundColor = "var(--purple)";
                }}
              >
                {loading
                  ? "Signing in…"
                  : magicMode
                    ? "Send magic link"
                    : "Sign in"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-2">
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "var(--border-subtle)" }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  or
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "var(--border-subtle)" }}
                />
              </div>

              {/* Toggle magic link */}
              <button
                type="button"
                onClick={() => {
                  setMagicMode(!magicMode);
                  setError("");
                }}
                className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--purple)";
                  e.currentTarget.style.color = "var(--purple-light)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <Sparkles size={15} />
                {magicMode ? "Use password instead" : "Sign in with magic link"}
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        {!magicSent && (
          <p
            className="text-sm text-center mt-6"
            style={{ color: "var(--text-muted)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="transition-colors"
              style={{ color: "var(--purple-light)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--gold-light)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--purple-light)")
              }
            >
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
