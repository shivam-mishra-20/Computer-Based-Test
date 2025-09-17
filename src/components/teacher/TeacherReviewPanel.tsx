"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";

interface PendingAttemptSummary {
  _id: string;
  examId: string;
  userId: string;
  submittedAt?: string;
  totalScore?: number;
  maxScore?: number;
  status: string;
  resultPublished?: boolean;
}
interface ReviewSection {
  _id: string;
  title: string;
  questionIds: string[];
}
interface ReviewQuestion {
  _id: string;
  text: string;
  options?: { _id: string; text: string }[];
  explanation?: string;
}
interface ReviewAnswer {
  questionId: string;
  textAnswer?: string;
  chosenOptionId?: string;
  rubricScore?: number;
  aiFeedback?: string;
  scoreAwarded?: number;
}
interface ReviewAttempt {
  _id: string;
  submittedAt?: string;
  totalScore?: number;
  maxScore?: number;
  status: string;
  answers: ReviewAnswer[];
}
interface ReviewView {
  attempt: ReviewAttempt;
  exam: { _id: string; title: string };
  sections: ReviewSection[];
  questions: Record<string, ReviewQuestion>;
}

export default function TeacherReviewPanel() {
  const [pending, setPending] = useState<PendingAttemptSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ReviewView | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/attempts/review/pending");
      if (Array.isArray(data)) setPending(data as PendingAttemptSummary[]);
      else setPending([]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load pending attempts"
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadPending();
  }, []);

  async function openAttempt(id: string) {
    try {
      const view = await apiFetch(`/api/attempts/${id}/review`);
      setActive(view as ReviewView);
    } catch {
      /* ignore */
    }
  }

  async function adjustScore(
    questionId: string,
    newScore: number,
    feedback?: string
  ) {
    if (!active) return;
    setSaving(true);
    try {
      await apiFetch(`/api/attempts/${active.attempt._id}/adjust`, {
        method: "PATCH",
        body: JSON.stringify({
          answerQuestionId: questionId,
          score: newScore,
          feedback,
        }),
      });
      // refresh view
      await openAttempt(active.attempt._id);
    } finally {
      setSaving(false);
    }
  }

  async function publishAttempt() {
    if (!active) return;
    if (!confirm("Publish result for this attempt?")) return;
    setPublishing(true);
    try {
      await apiFetch(`/api/attempts/${active.attempt._id}/publish`, {
        method: "POST",
        body: JSON.stringify({ publish: true }),
      });
      await loadPending();
      setActive(null);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Protected requiredRole="teacher">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Pending Attempt Reviews</h1>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="border rounded divide-y bg-white">
          {pending.map((p) => (
            <div
              key={p._id}
              className="p-3 flex items-center gap-4 text-sm flex-wrap"
            >
              <div className="flex-1 min-w-[240px]">
                <div className="font-medium">Attempt {p._id.slice(-6)}</div>
                <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                  {p.submittedAt && (
                    <span>
                      Submitted: {new Date(p.submittedAt).toLocaleString()}
                    </span>
                  )}
                  <span>
                    Score: {p.totalScore} / {p.maxScore}
                  </span>
                  <span>Status: {p.status}</span>
                </div>
              </div>
              <button
                onClick={() => openAttempt(p._id)}
                className="text-xs px-2 py-1 border rounded"
              >
                Review
              </button>
            </div>
          ))}
          {!loading && !pending.length && (
            <div className="p-4 text-xs text-gray-500">No pending attempts</div>
          )}
        </div>

        {active && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-auto p-6">
            <div className="bg-white rounded shadow-lg w-full max-w-5xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  Review Attempt {active.attempt._id.slice(-6)} —{" "}
                  {active.exam.title}
                </h2>
                <button
                  onClick={() => setActive(null)}
                  className="px-2 py-1 text-xs border rounded"
                >
                  Close
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4 max-h-[70vh] overflow-auto pr-2">
                  {active.sections
                    .flatMap((sec) => sec.questionIds)
                    .map((qid: string, idx: number) => {
                      const q = active.questions[qid];
                      const ans = active.attempt.answers.find(
                        (a) => a.questionId === qid
                      );
                      return (
                        <div
                          key={qid}
                          className="border rounded p-3 text-xs space-y-2"
                        >
                          <div className="font-medium text-sm">
                            Q{idx + 1}: {q.text}
                          </div>
                          {q.options && (
                            <ul className="list-disc ml-4 space-y-1">
                              {q.options.map((o) => (
                                <li key={o._id}>{o.text}</li>
                              ))}
                            </ul>
                          )}
                          {typeof ans?.textAnswer === "string" && (
                            <div>
                              <span className="font-semibold">Answer:</span>{" "}
                              {ans.textAnswer}
                            </div>
                          )}
                          {typeof ans?.rubricScore === "number" && (
                            <div>AI Rubric: {ans.rubricScore}</div>
                          )}
                          {ans?.aiFeedback && (
                            <div className="italic">
                              AI Feedback: {ans.aiFeedback}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-xs flex items-center gap-1">
                              Score:
                              <input
                                type="number"
                                defaultValue={ans?.scoreAwarded ?? 0}
                                min={0}
                                step={0.25}
                                className="border rounded px-1 py-0.5 w-20"
                                onBlur={(e) =>
                                  adjustScore(
                                    qid,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={saving}
                              />
                            </label>
                            <button
                              onClick={() =>
                                adjustScore(
                                  qid,
                                  (ans?.scoreAwarded || 0) + 0.25
                                )
                              }
                              className="px-2 py-0.5 text-xs border rounded"
                            >
                              +0.25
                            </button>
                            <button
                              onClick={() =>
                                adjustScore(
                                  qid,
                                  Math.max(0, (ans?.scoreAwarded || 0) - 0.25)
                                )
                              }
                              className="px-2 py-0.5 text-xs border rounded"
                            >
                              -0.25
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="space-y-4">
                  <div className="border rounded p-3 text-xs space-y-1 bg-gray-50">
                    <div>
                      <span className="font-semibold">Attempt ID:</span>{" "}
                      {active.attempt._id}
                    </div>
                    <div>
                      <span className="font-semibold">Submitted:</span>{" "}
                      {active.attempt.submittedAt
                        ? new Date(active.attempt.submittedAt).toLocaleString()
                        : "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Score:</span>{" "}
                      {active.attempt.totalScore} / {active.attempt.maxScore}
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>{" "}
                      {active.attempt.status}
                    </div>
                  </div>
                  <button
                    disabled={publishing}
                    onClick={publishAttempt}
                    className="w-full bg-primary text-white px-3 py-2 rounded text-sm"
                  >
                    {publishing ? "Publishing..." : "Publish Result"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
