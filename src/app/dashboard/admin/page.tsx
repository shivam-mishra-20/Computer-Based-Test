"use client";
import React, { useEffect, useState } from "react";
import { adminCreateUser, getAdminStats } from "../../../lib/auth";
import Protected from "../../../components/Protected";

type Role = "admin" | "teacher" | "student";

type DashboardResponse = {
  stats: { admins: number; teachers: number; students: number };
};

function isDashboardResponse(x: unknown): x is DashboardResponse {
  if (!x || typeof x !== "object") return false;
  const rec = x as Record<string, unknown>;
  const s = rec["stats"] as unknown;
  if (!s || typeof s !== "object") return false;
  const sr = s as Record<string, unknown>;
  return (
    typeof sr["admins"] === "number" &&
    typeof sr["teachers"] === "number" &&
    typeof sr["students"] === "number"
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    admins: number;
    teachers: number;
    students: number;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as Role,
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then((data: unknown) => {
        if (isDashboardResponse(data)) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await adminCreateUser(form);
      setMsg("User created");
      setForm({ name: "", email: "", password: "", role: "student" });
      // refresh stats
      const data: unknown = await getAdminStats();
      if (isDashboardResponse(data)) setStats(data.stats);
    } catch (err) {
      let message = "Failed to create user";
      if (err && typeof err === "object") {
        const rec = err as Record<string, unknown>;
        if ("message" in rec) message = String(rec["message"]);
      }
      setMsg(message);
    }
  }

  return (
    <Protected requiredRole="admin">
      <main className="min-h-screen p-6 bg-bg font-poppins">
        <h1 className="text-2xl font-semibold text-accent">Admin Dashboard</h1>
        <div className="mt-2 text-sm text-muted">
          Manage users and view stats.
        </div>

        {stats && (
          <div className="mt-4 flex gap-4">
            <div
              className="p-3 rounded-md bg-white shadow"
              style={{ border: "1px solid var(--beige-sand)" }}
            >
              <div className="text-sm">Admins</div>
              <div className="text-xl font-semibold">{stats.admins}</div>
            </div>
            <div
              className="p-3 rounded-md bg-white shadow"
              style={{ border: "1px solid var(--beige-sand)" }}
            >
              <div className="text-sm">Teachers</div>
              <div className="text-xl font-semibold">{stats.teachers}</div>
            </div>
            <div
              className="p-3 rounded-md bg-white shadow"
              style={{ border: "1px solid var(--beige-sand)" }}
            >
              <div className="text-sm">Students</div>
              <div className="text-xl font-semibold">{stats.students}</div>
            </div>
          </div>
        )}

        <section className="mt-8 max-w-lg">
          <h2 className="text-lg font-medium text-accent mb-2">
            Create New User
          </h2>
          <form
            onSubmit={onCreate}
            className="bg-white p-4 rounded-md shadow"
            style={{ border: "1px solid var(--beige-sand)" }}
          >
            <div className="mb-3">
              <label className="block text-sm">Name</label>
              <input
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm">Email</label>
              <input
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm">Password</label>
              <input
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm">Role</label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Role })
                }
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {msg && (
              <div
                className="mb-3 text-sm"
                style={{ color: msg.includes("create") ? "green" : "red" }}
              >
                {msg}
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-white"
            >
              Create User
            </button>
          </form>
        </section>
      </main>
    </Protected>
  );
}
