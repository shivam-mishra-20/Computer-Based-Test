"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";

interface ProgressPoint {
  date: string;
  avgScore: number;
  examsTaken: number;
}

export default function StudentProgress() {
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const resp = (await apiFetch("/api/analytics/me/progress")) as unknown;
      if (
        typeof resp === "object" &&
        resp !== null &&
        Array.isArray((resp as { points?: unknown }).points)
      ) {
        setData((resp as { points: ProgressPoint[] }).points);
      } else if (Array.isArray(resp)) {
        setData(resp as ProgressPoint[]);
      } else setData([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <Protected requiredRole="student">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Progress Over Time</h2>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !data.length && (
          <div className="text-xs text-gray-500">No progress data yet.</div>
        )}
        {data.length > 0 && (
          <div className="border rounded p-4 bg-white">
            <div className="text-xs text-gray-500 mb-2">
              (Simple preview — integrate chart library later)
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-auto">
              {data.map((p) => (
                <div key={p.date} className="flex justify-between text-sm">
                  <span>
                    {p.date ? new Date(p.date).toLocaleDateString() : "N/A"}
                  </span>
                  <span className="font-mono">
                    Avg:{" "}
                    {typeof p.avgScore === "number"
                      ? p.avgScore.toFixed(1)
                      : "N/A"}{" "}
                    | Exams:{" "}
                    {typeof p.examsTaken === "number" ? p.examsTaken : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
