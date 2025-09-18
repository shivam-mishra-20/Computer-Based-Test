"use client";
import React, { useEffect, useState } from "react";
import Protected from "../Protected";
import { apiFetch } from "../../lib/api";

interface ExamLite {
  _id: string;
  title: string;
  totalDurationMins?: number;
  schedule?: { startAt?: string; endAt?: string };
  classLevel?: string;
  batch?: string;
}
interface AttemptLite {
  _id: string;
  examId: string;
  status: string;
  startedAt?: string;
  submittedAt?: string;
  totalScore?: number;
  maxScore?: number;
  resultPublished?: boolean;
}
interface MyAttemptDto extends AttemptLite {
  examTitle?: string;
}

export default function StudentAssignedExams() {
  const [exams, setExams] = useState<ExamLite[]>([]);
  const [attemptMap, setAttemptMap] = useState<Record<string, AttemptLite>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [examData, myAttempts] = await Promise.all([
        apiFetch("/api/attempts/assigned"),
        apiFetch("/api/attempts/mine"),
      ]);
      if (Array.isArray(examData)) {
        setExams(examData as ExamLite[]);
      } else {
        setExams([]);
      }
      if (Array.isArray(myAttempts)) {
        const map: Record<string, AttemptLite> = {};
        for (const a of myAttempts as MyAttemptDto[]) {
          const examId = a.examId;
          if (examId) map[examId] = a;
        }
        setAttemptMap(map);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function startAttempt(examId: string) {
    try {
      const attemptResp = await apiFetch(`/api/attempts/${examId}/start`, {
        method: "POST",
      });
      const attempt = attemptResp as AttemptLite;
      setAttemptMap(
        (m) => ({ ...m, [examId]: attempt } as Record<string, AttemptLite>)
      );
      if (attempt && attempt._id) {
        window.location.href = `/dashboard/exam/${attempt._id}?attempt=1`;
      }
    } catch {
      // replace with toast util if available
      alert("Failed to start attempt");
    }
  }

  function renderAction(ex: ExamLite) {
    const a = attemptMap[ex._id];
    if (a) {
      if (["submitted", "auto-submitted", "graded"].includes(a.status)) {
        return (
          <button
            onClick={() =>
              (window.location.href = `/dashboard/exam/${a._id}?review=1`)
            }
            className="text-xs px-2 py-1 border rounded"
          >
            View
          </button>
        );
      }
      return (
        <button
          onClick={() =>
            (window.location.href = `/dashboard/exam/${a._id}?attempt=1`)
          }
          className="text-xs px-2 py-1 border rounded"
        >
          Resume
        </button>
      );
    }
    return (
      <button
        onClick={() => startAttempt(ex._id)}
        className="text-xs px-2 py-1 border rounded bg-primary text-white"
      >
        Start
      </button>
    );
  }

  return (
    <Protected requiredRole="student">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Assigned / Open Exams</h1>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="border rounded-md divide-y bg-white">
          {exams.map((ex) => {
            const now = Date.now();
            const start = ex.schedule?.startAt
              ? new Date(ex.schedule.startAt).getTime()
              : undefined;
            const end = ex.schedule?.endAt
              ? new Date(ex.schedule.endAt).getTime()
              : undefined;
            const windowState =
              start && end
                ? now < start
                  ? "Upcoming"
                  : now > end
                  ? "Closed"
                  : "Open"
                : "Open";
            return (
              <div
                key={ex._id}
                className="p-3 flex flex-wrap gap-3 items-center text-sm"
              >
                <div className="flex-1 min-w-[240px]">
                  <div className="font-medium">{ex.title}</div>
                  <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                    {ex.classLevel && <span>Class: {ex.classLevel}</span>}
                    {ex.batch && <span>Batch: {ex.batch}</span>}
                    {ex.totalDurationMins && (
                      <span>Duration: {ex.totalDurationMins}m</span>
                    )}
                    {ex.schedule?.startAt && (
                      <span>
                        Start: {new Date(ex.schedule.startAt).toLocaleString()}
                      </span>
                    )}
                    {ex.schedule?.endAt && (
                      <span>
                        End: {new Date(ex.schedule.endAt).toLocaleString()}
                      </span>
                    )}
                    <span>Status: {windowState}</span>
                  </div>
                </div>
                {renderAction(ex)}
              </div>
            );
          })}
          {!loading && !exams.length && (
            <div className="p-4 text-xs text-gray-500">No exams available</div>
          )}
        </div>
      </div>
    </Protected>
  );
}
