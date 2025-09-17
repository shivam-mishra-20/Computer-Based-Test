"use client";
import React, { useEffect, useState } from "react";
import { getAdminStats } from "../../lib/auth";

interface Stats {
  admins: number;
  teachers: number;
  students: number;
}
interface DashboardResp {
  stats: Stats;
}
function isResp(x: unknown): x is DashboardResp {
  if (!x || typeof x !== "object" || !("stats" in x)) return false;
  const stats = (x as { stats: Partial<Stats> }).stats;
  return (
    typeof stats.admins === "number" &&
    typeof stats.teachers === "number" &&
    typeof stats.students === "number"
  );
}

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminStats()
      .then((d: unknown) => {
        if (isResp(d)) setStats(d.stats);
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Overview</h2>
      {loading && <div className="text-sm text-muted">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              {
                label: "Admins",
                value: stats.admins,
                color: "from-emerald-500 to-green-600",
              },
              {
                label: "Teachers",
                value: stats.teachers,
                color: "from-sky-500 to-blue-600",
              },
              {
                label: "Students",
                value: stats.students,
                color: "from-amber-500 to-orange-600",
              },
            ] as const
          ).map((c) => (
            <div
              key={c.label}
              className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm flex flex-col"
            >
              <span className="text-sm text-gray-500">{c.label}</span>
              <span
                className={`mt-1 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${c.color}`}
              >
                {c.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {!loading && !stats && !error && (
        <div className="text-sm text-muted">No data.</div>
      )}
    </div>
  );
}
