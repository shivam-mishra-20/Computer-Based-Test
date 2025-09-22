"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-amber-600";
    return "text-red-500";
  };

  const getScoreBackground = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-emerald-50 border-emerald-200";
    if (percentage >= 60) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <Protected requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30 p-6">
        <div className="max-w-8xl mx-auto space-y-2">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center p-2">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Published Results
              </h1>
              <p className="text-slate-600">
                View your exam scores and detailed feedback
              </p>
            </div>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
            >
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-red-700">{error}</span>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-lg border border-slate-200 p-8 text-center"
            >
              <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-slate-600">Loading your results...</p>
            </motion.div>
          )}

          {/* Results List */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm"
            >
              {attempts.length > 0 ? (
                // choose mobile or desktop rendering
                isMobile ? (
                  <div className="space-y-4 p-4">
                    {attempts.map((attempt, idx) => (
                      <motion.div
                        key={attempt._id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">
                              {attempt.examTitle}
                            </h3>
                            <div className="mt-2 text-sm text-slate-600 space-y-1">
                              {attempt.submittedAt && (
                                <div>
                                  Submitted {formatDate(attempt.submittedAt)}
                                </div>
                              )}
                              <div>
                                {attempt.resultPublished ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                                    Published
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            {attempt.totalScore !== undefined &&
                              attempt.maxScore !== undefined && (
                                <div
                                  className={`px-3 py-2 rounded-lg border text-center ${getScoreBackground(
                                    attempt.totalScore,
                                    attempt.maxScore
                                  )}`}
                                >
                                  <div
                                    className={`text-lg font-bold ${getScoreColor(
                                      attempt.totalScore,
                                      attempt.maxScore
                                    )}`}
                                  >
                                    {attempt.totalScore}/{attempt.maxScore}
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {Math.round(
                                      (attempt.totalScore / attempt.maxScore) *
                                        100
                                    )}
                                    %
                                  </div>
                                </div>
                              )}
                            <div>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => openAttempt(attempt._id)}
                                className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                View
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  // Desktop / table-like view
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 font-medium text-slate-700">
                            Exam
                          </th>
                          <th className="px-6 py-3 font-medium text-slate-700">
                            Submitted
                          </th>
                          <th className="px-6 py-3 font-medium text-slate-700">
                            Status
                          </th>
                          <th className="px-6 py-3 font-medium text-slate-700">
                            Score
                          </th>
                          <th className="px-6 py-3 font-medium text-slate-700">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attempts.map((attempt) => (
                          <tr
                            key={attempt._id}
                            className="border-b last:border-b-0 hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 align-top">
                              <div className="font-semibold text-slate-900">
                                {attempt.examTitle}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top text-slate-600">
                              {attempt.submittedAt
                                ? formatDate(attempt.submittedAt)
                                : "—"}
                            </td>
                            <td className="px-6 py-4 align-top">
                              {attempt.resultPublished ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                                  Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 align-top">
                              {attempt.totalScore !== undefined &&
                              attempt.maxScore !== undefined ? (
                                <div
                                  className={`inline-flex flex-col items-start ${getScoreBackground(
                                    attempt.totalScore,
                                    attempt.maxScore
                                  )} px-3 py-2 rounded-lg`}
                                >
                                  <div
                                    className={`text-base font-bold ${getScoreColor(
                                      attempt.totalScore,
                                      attempt.maxScore
                                    )}`}
                                  >
                                    {attempt.totalScore}/{attempt.maxScore}
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {Math.round(
                                      (attempt.totalScore / attempt.maxScore) *
                                        100
                                    )}
                                    %
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 align-top">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => openAttempt(attempt._id)}
                                className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                View Details
                              </motion.button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No results available
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Your published exam results will appear here once available.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => load()}
                    className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* Detail Modal */}
          <AnimatePresence>
            {viewing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setViewing(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {viewing.examTitle}
                      </h2>
                      <p className="text-slate-600">
                        Detailed Results & Feedback
                      </p>
                    </div>
                    <button
                      onClick={() => setViewing(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mr-3"></div>
                        <span className="text-slate-600">
                          Loading detailed results...
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(viewing.answers || []).map((answer, index) => (
                          <motion.div
                            key={answer.questionId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium text-slate-900">
                                Question {index + 1}
                              </h4>
                              {typeof answer.scoreAwarded === "number" && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700">
                                    Score: {answer.scoreAwarded}
                                  </span>
                                  {typeof answer.rubricScore === "number" && (
                                    <span className="text-xs text-slate-500">
                                      (AI: {answer.rubricScore})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {typeof answer.response !== "undefined" && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-slate-700">
                                  Your Answer:
                                </span>
                                <div className="mt-1 p-2 bg-white rounded border text-sm text-slate-900">
                                  {Array.isArray(answer.response)
                                    ? answer.response.join(", ")
                                    : String(answer.response)}
                                </div>
                              </div>
                            )}

                            {answer.aiFeedback && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <div className="flex items-start gap-2">
                                  <svg
                                    className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <div>
                                    <span className="text-sm font-medium text-blue-900">
                                      AI Feedback:
                                    </span>
                                    <p className="text-sm text-blue-800 mt-1">
                                      {answer.aiFeedback}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Protected>
  );
}
