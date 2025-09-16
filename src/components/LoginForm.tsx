"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../lib/auth";

type Role = "student" | "teacher" | "admin" | "";

export default function LoginForm({ role = "" }: { role?: Role }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login({ email, password });
      // after login, token is stored; perform a hard navigation so Navbar and other
      // client components re-render with the authenticated state immediately.
      if (typeof window !== "undefined") {
        // full page load to /dashboard
        window.location.href = "/dashboard";
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      let message = "Login failed";
      if (err && typeof err === "object") {
        const rec = err as Record<string, unknown>;
        if ("message" in rec) message = String(rec["message"]);
      }
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-live="polite">
      <div className="mb-3">
        <label className="block text-sm font-medium text-accent">Email</label>
        <input
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          aria-label="email"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-accent">
          Password
        </label>
        <input
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          aria-label="password"
        />
      </div>

      {err && (
        <div className="mb-3 text-sm text-red-600" role="alert">
          {err}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          className={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            role === "teacher"
              ? "bg-cta hover:bg-cta/90"
              : role === "admin"
              ? "bg-white text-accent border"
              : "bg-primary hover:bg-primary/90"
          }`}
          style={role === "admin" ? { borderColor: "var(--beige-sand)" } : {}}
          disabled={loading}
          aria-label={role ? `Login as ${role}` : "Login"}
        >
          {loading ? "Signing in..." : `Login${role ? ` as ${role}` : ""}`}
        </button>
      </div>
    </form>
  );
}
