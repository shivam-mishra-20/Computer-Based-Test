"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export default function TeacherDashboardHome() {
  const [counts, setCounts] = useState<{
    questions: number;
    exams: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = (await apiFetch(`/api/exams/questions?limit=1`)) as {
        total?: number;
      };
      const ex = (await apiFetch(`/api/exams?limit=1`)) as { total?: number };
      setCounts({ questions: qs.total || 0, exams: ex.total || 0 });
    } catch {
      setCounts({ questions: 0, exams: 0 });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Overview</h2>
      <p className="text-sm text-gray-600">Quick stats and recent activity.</p>
      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <Card header={<span className="text-sm">Questions</span>}>
          {loading ? (
            <Skeleton className="h-6 w-12" />
          ) : (
            <div className="text-2xl font-semibold">
              {counts?.questions ?? "-"}
            </div>
          )}
        </Card>
        <Card header={<span className="text-sm">Exams</span>}>
          {loading ? (
            <Skeleton className="h-6 w-12" />
          ) : (
            <div className="text-2xl font-semibold">{counts?.exams ?? "-"}</div>
          )}
        </Card>
        <Card header={<span className="text-sm">AI Generated (Session)</span>}>
          <div className="text-xs text-gray-500">
            Use AI Tools tab to generate
          </div>
        </Card>
      </div>
    </div>
  );
}
