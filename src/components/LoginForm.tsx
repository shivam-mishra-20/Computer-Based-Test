"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { login } from "../lib/auth";
import { InlineLoader } from "./ElegantLoader";

type Role = "student" | "teacher" | "admin" | "";

export default function LoginForm({ role = "" }: { role?: Role }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      await login({ email, password });
      toast.success("Login successful! Redirecting...", {
        description: "Welcome back to your dashboard",
        duration: 2000,
      });
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
      toast.error("Login Failed", {
        description: message,
        duration: 4000,
      });
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  // Determine button styling based on role
  const getButtonStyle = () => {
    switch (role) {
      case "teacher":
        return "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md shadow-purple-200/40";
      case "admin":
        return "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-md shadow-slate-200/40";
      default:
        return "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-200/40";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <form onSubmit={handleSubmit} aria-live="polite" className="space-y-5">
        <motion.div
          className="space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="email"
          >
            Email
          </label>
          <motion.div
            className={`relative rounded-md shadow-sm ${
              focused === "email" ? "ring-2 ring-slate-300 ring-opacity-50" : ""
            }`}
            whileTap={{ scale: 0.995 }}
          >
            <input
              id="email"
              className={`block w-full px-4 py-2.5 text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none transition duration-200 ease-in-out text-sm ${
                err ? "border-red-300" : "focus:border-slate-300"
              }`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              type="email"
              required
              aria-label="email"
              placeholder="you@example.com"
            />
            <motion.div
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: email ? 1 : 0 }}
            >
              <svg
                className="h-4 w-4 text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          className="space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="password"
          >
            Password
          </label>
          <motion.div
            className={`relative rounded-md shadow-sm ${
              focused === "password"
                ? "ring-2 ring-slate-300 ring-opacity-50"
                : ""
            }`}
            whileTap={{ scale: 0.995 }}
          >
            <input
              id="password"
              className={`block w-full px-4 py-2.5 text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none transition duration-200 ease-in-out text-sm ${
                err ? "border-red-300" : "focus:border-slate-300"
              }`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              type="password"
              required
              aria-label="password"
              placeholder="••••••••"
            />
            <motion.div
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: password ? 1 : 0 }}
            >
              <svg
                className="h-4 w-4 text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {err && (
            <motion.div
              className="flex items-center p-2.5 rounded-md bg-red-50 border border-red-100"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              role="alert"
            >
              <svg
                className="h-4 w-4 text-red-500 mr-2 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs text-red-600">{err}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="pt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            type="submit"
            className={`w-full px-4 py-2.5 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-1 text-sm font-medium transition-all ${getButtonStyle()}`}
            disabled={loading}
            aria-label={role ? `Login as ${role}` : "Login"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <InlineLoader />
                <span className="ml-2">Signing in...</span>
              </div>
            ) : (
              `Login${role ? ` as ${role}` : ""}`
            )}
          </motion.button>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700 mt-4"
            whileHover={{ scale: 1.05 }}
          >
            Forgot your password?
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
}
