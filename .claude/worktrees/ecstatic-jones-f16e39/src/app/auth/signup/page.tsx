"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Mail, Lock, User, CheckSquare, Square } from "lucide-react";
import { signUp } from "../actions";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("You must accept the terms to continue.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await signUp(email, password, username);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
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
            {success ? "Almost there!" : "Join the table"}
          </h1>
          <p
            className="text-sm text-center mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            {success
              ? "Check your email to confirm your account"
              : "Create your free account to get started"}
          </p>

          {success ? (
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
                We sent a confirmation link to{" "}
                <span style={{ color: "var(--text-primary)" }}>{email}</span>.
                Click it to activate your account.
              </p>
              <Link
                href="/auth/login"
                className="text-sm transition-colors"
                style={{ color: "var(--purple-light)" }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Username
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={30}
                    placeholder="DungeonMaster99"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
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
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
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

              {/* Password */}
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
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
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

              {/* Terms */}
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className="flex items-start gap-2.5 text-sm text-left w-full"
                style={{ color: "var(--text-muted)" }}
              >
                {agreed ? (
                  <CheckSquare
                    size={17}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--purple-light)" }}
                  />
                ) : (
                  <Square
                    size={17}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  />
                )}
                <span>
                  I agree to the{" "}
                  <span style={{ color: "var(--purple-light)" }}>
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span style={{ color: "var(--purple-light)" }}>
                    Privacy Policy
                  </span>
                </span>
              </button>

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
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-all mt-2"
                style={{
                  backgroundColor: loading
                    ? "rgba(124, 58, 237, 0.5)"
                    : "var(--purple)",
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    e.currentTarget.style.backgroundColor =
                      "var(--purple-light)";
                }}
                onMouseLeave={(e) => {
                  if (!loading)
                    e.currentTarget.style.backgroundColor = "var(--purple)";
                }}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        {!success && (
          <p
            className="text-sm text-center mt-6"
            style={{ color: "var(--text-muted)" }}
          >
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="transition-colors"
              style={{ color: "var(--purple-light)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--gold-light)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--purple-light)")
              }
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
