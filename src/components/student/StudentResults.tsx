"use client";
import React, { useEffect, useState } from "react";
import Protected from "../Protected";
import { apiFetch } from "../../lib/api";

interface AttemptSummary {
  _id: string;
  examTitle: string;
  submittedAt?: string;
  totalScore?: number;
  maxScore?: number;
  resultPublished?: boolean;
  status: string;
}
interface RawAnswer {
  questionId: string | { toString(): string };
  textAnswer?: string;
  chosenOptionId?: string | { toString(): string };
  selectedOptionIds?: (string | { toString(): string })[];
  aiFeedback?: string;
  rubricScore?: number;
  scoreAwarded?: number;
}
interface RawAttempt {
  _id: string;
  examTitle?: string;
  submittedAt?: string;
  totalScore?: number;
  maxScore?: number;
  status: string;
  resultPublished?: boolean;
  answers: RawAnswer[];
}
interface QuestionOption {
  _id: string;
  text?: string;
  label?: string;
  value?: string;
}
interface QuestionEntry {
  _id: string;
  options?: QuestionOption[];
}
interface AttemptViewResponse {
  attempt: RawAttempt;
  exam?: { title?: string };
  questions?: Record<string, QuestionEntry>;
}
interface AttemptDetail extends AttemptSummary {
  answers: {
    questionId: string;
    response?: string | number | string[];
    aiFeedback?: string;
    rubricScore?: number;
    scoreAwarded?: number;
  }[];
}

export default function StudentResults() {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch("/api/attempts/mine?published=1");
      if (Array.isArray(resp)) setAttempts(resp as AttemptSummary[]);
      else setAttempts([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function openAttempt(id: string) {
    setDetailLoading(true);
    try {
      const data = (await apiFetch(
        `/api/attempts/${id}`
      )) as unknown as AttemptViewResponse;
      // Backend shape: { attempt, exam, sections, questions }
      const attempt = data?.attempt;
      if (!attempt) throw new Error("Malformed attempt view");
      const questionsDict = data?.questions || {};
      const answers = Array.isArray(attempt.answers)
        ? attempt.answers.map((ans: RawAnswer) => {
            const qid =
              typeof ans.questionId === "string"
                ? ans.questionId
                : ans.questionId.toString();
            let response: string | string[] | number | undefined;
            if (ans.textAnswer) {
              response = ans.textAnswer;
            } else if (ans.chosenOptionId) {
              const q = questionsDict[qid];
              if (q?.options) {
                const chosen =
                  typeof ans.chosenOptionId === "string"
                    ? ans.chosenOptionId
                    : ans.chosenOptionId.toString();
                const opt = q.options.find((o) => o._id.toString() === chosen);
                const fallbackChosen =
                  typeof ans.chosenOptionId === "string"
                    ? ans.chosenOptionId
                    : ans.chosenOptionId.toString();
                response =
                  opt?.text || opt?.label || opt?.value || fallbackChosen;
              } else {
                response =
                  typeof ans.chosenOptionId === "string"
                    ? ans.chosenOptionId
                    : ans.chosenOptionId.toString();
              }
            } else if (Array.isArray(ans.selectedOptionIds)) {
              // potential multi-select future support
              response = ans.selectedOptionIds.map((oid) =>
                typeof oid === "string" ? oid : oid.toString()
              );
            }
            return {
              questionId: qid,
              response,
              aiFeedback: ans.aiFeedback,
              rubricScore: ans.rubricScore,
              scoreAwarded: ans.scoreAwarded,
            };
          })
        : [];
      const detail: AttemptDetail = {
        _id: attempt._id,
        examTitle: data?.exam?.title || attempt.examTitle || "Exam",
        submittedAt: attempt.submittedAt,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        status: attempt.status,
        resultPublished: attempt.resultPublished,
        answers,
      };
      setViewing(detail);
    } catch (e) {
      console.error("Failed to load attempt detail", e);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <Protected requiredRole="student">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Published Results</h2>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="border rounded divide-y bg-white">
          {attempts.map((a) => (
            <div
              key={a._id}
              className="p-3 flex flex-wrap gap-3 items-center text-sm"
            >
              <div className="flex-1 min-w-[240px]">
                <div className="font-medium">{a.examTitle}</div>
                <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                  {a.submittedAt && (
                    <span>
                      Submitted: {new Date(a.submittedAt).toLocaleString()}
                    </span>
                  )}
                  <span>
                    Score: {a.totalScore} / {a.maxScore}
                  </span>
                  {a.resultPublished ? (
                    <span className="text-green-600">Published</span>
                  ) : (
                    <span className="text-amber-600">Pending</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => openAttempt(a._id)}
                className="text-xs px-2 py-1 border rounded"
              >
                View
              </button>
            </div>
          ))}
          {!loading && !attempts.length && (
            <div className="p-4 text-xs text-gray-500">
              No published results yet.
            </div>
          )}
        </div>

        {viewing && (
          <div className="fixed inset-0 bg-black/30 flex items-start justify-center overflow-auto p-6 z-50">
            <div className="bg-white rounded shadow-lg w-full max-w-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {viewing.examTitle} — Detailed Answers
                </h3>
                <button
                  onClick={() => setViewing(null)}
                  className="text-sm px-2 py-1 border rounded"
                >
                  Close
                </button>
              </div>
              {detailLoading && (
                <div className="text-xs text-gray-500">Loading details...</div>
              )}
              <div className="space-y-4 max-h-[65vh] overflow-auto pr-2">
                {(viewing.answers || []).map((ans, i) => (
                  <div
                    key={ans.questionId}
                    className="border rounded p-3 text-xs space-y-1 bg-gray-50"
                  >
                    <div className="font-medium text-sm">Q{i + 1}</div>
                    {typeof ans.response !== "undefined" && (
                      <div>
                        <span className="font-semibold">Your Answer:</span>{" "}
                        {Array.isArray(ans.response)
                          ? ans.response.join(", ")
                          : String(ans.response)}
                      </div>
                    )}
                    {typeof ans.scoreAwarded === "number" && (
                      <div>
                        Score: {ans.scoreAwarded}
                        {typeof ans.rubricScore === "number"
                          ? ` (AI rubric: ${ans.rubricScore})`
                          : ""}
                      </div>
                    )}
                    {ans.aiFeedback && (
                      <div className="mt-1 italic">
                        AI Feedback: {ans.aiFeedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
