"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Protected from "../Protected";
import { apiFetch } from "../../lib/api";
import { MathText } from "../ui/MathText";

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
  isCorrect?: boolean;
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
  isCorrect?: boolean;
}

interface QuestionEntry {
  _id: string;
  text?: string;
  type?: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  assertionText?: string;
  reasonText?: string;
  assertionIsTrue?: boolean;
  reasonIsTrue?: boolean;
  reasonExplainsAssertion?: boolean;
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
    isCorrect?: boolean;
  }[];
  questions?: Record<string, QuestionEntry>;
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
      const resp = await apiFetch("/attempts/mine?published=1");
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
        `/attempts/${id}`
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
              isCorrect: ans.isCorrect,
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
        questions: questionsDict,
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
                  <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">
                            {viewing.examTitle}
                          </h2>
                          <p className="text-emerald-100 text-sm">
                            Detailed Results & Answer Key
                          </p>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => setViewing(null)}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <svg
                          className="w-6 h-6"
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
                      </motion.button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mr-3"></div>
                        <span className="text-slate-600">
                          Loading detailed results...
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Score Summary Card */}
                        {viewing.totalScore !== undefined &&
                          viewing.maxScore !== undefined && (
                            <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-medium text-slate-700 mb-1">
                                    Your Final Score
                                  </h3>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-emerald-700">
                                      {viewing.totalScore}
                                    </span>
                                    <span className="text-xl text-slate-500">
                                      / {viewing.maxScore}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-slate-700 mb-1">
                                    Percentage
                                  </div>
                                  <div
                                    className={`text-3xl font-bold ${getScoreColor(
                                      viewing.totalScore,
                                      viewing.maxScore
                                    )}`}
                                  >
                                    {Math.round(
                                      (viewing.totalScore / viewing.maxScore) *
                                        100
                                    )}
                                    %
                                  </div>
                                </div>
                              </div>
                              {viewing.submittedAt && (
                                <div className="mt-3 pt-3 border-t border-emerald-200 text-sm text-slate-600">
                                  Submitted: {formatDate(viewing.submittedAt)}
                                </div>
                              )}
                            </div>
                          )}

                        {/* Questions List */}
                        <div className="p-6 space-y-6">
                          {(viewing.answers || []).map((answer, index) => {
                            const question =
                              viewing.questions?.[answer.questionId];
                            const isCorrect =
                              answer.isCorrect ||
                              (answer.scoreAwarded && answer.scoreAwarded > 0);

                            return (
                              <motion.div
                                key={answer.questionId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden"
                              >
                                {/* Question Header */}
                                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-200">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-slate-900">
                                          Question {index + 1}
                                        </h4>
                                        {question?.type && (
                                          <span className="text-xs text-slate-500 capitalize">
                                            {question.type.replace(/_/g, " ")}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {typeof answer.scoreAwarded ===
                                        "number" && (
                                        <div className="text-right">
                                          <div className="text-xs text-slate-600">
                                            Score
                                          </div>
                                          <div
                                            className={`text-lg font-bold ${
                                              isCorrect
                                                ? "text-emerald-600"
                                                : "text-red-500"
                                            }`}
                                          >
                                            {answer.scoreAwarded}
                                          </div>
                                        </div>
                                      )}
                                      <div
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          isCorrect
                                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                            : "bg-red-100 text-red-700 border border-red-200"
                                        }`}
                                      >
                                        {isCorrect
                                          ? "✓ Correct"
                                          : "✗ Incorrect"}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Question Content */}
                                <div className="p-5 space-y-4">
                                  {/* Question Text */}
                                  {question?.text && (
                                    <div>
                                      <div className="text-sm font-medium text-slate-700 mb-2">
                                        Question:
                                      </div>
                                      <div className="text-slate-900 leading-relaxed">
                                        <MathText text={question.text} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Assertion-Reason Type */}
                                  {question?.type === "assertion_reason" && (
                                    <div className="space-y-3">
                                      {question.assertionText && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                          <div className="text-sm font-medium text-blue-900 mb-1">
                                            Assertion:
                                          </div>
                                          <div className="text-blue-800">
                                            <MathText
                                              text={question.assertionText}
                                            />
                                          </div>
                                        </div>
                                      )}
                                      {question.reasonText && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                          <div className="text-sm font-medium text-purple-900 mb-1">
                                            Reason:
                                          </div>
                                          <div className="text-purple-800">
                                            <MathText
                                              text={question.reasonText}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* MCQ Options */}
                                  {question?.options &&
                                    question.options.length > 0 && (
                                      <div>
                                        <div className="text-sm font-medium text-slate-700 mb-2">
                                          Options:
                                        </div>
                                        <div className="grid gap-2">
                                          {question.options.map(
                                            (option, optIdx) => {
                                              const isSelected =
                                                typeof answer.response ===
                                                "string"
                                                  ? answer.response ===
                                                      option.text ||
                                                    answer.response ===
                                                      option._id
                                                  : false;
                                              const isCorrectOption =
                                                option.isCorrect;
                                              const isWrong =
                                                isSelected && !isCorrectOption;

                                              return (
                                                <div
                                                  key={option._id}
                                                  className={`p-3 rounded-lg border-2 transition-all ${
                                                    isCorrectOption
                                                      ? "bg-green-50 border-green-300 shadow-sm"
                                                      : isWrong
                                                      ? "bg-red-50 border-red-300 shadow-sm"
                                                      : isSelected
                                                      ? "bg-blue-50 border-blue-300"
                                                      : "bg-slate-50 border-slate-200"
                                                  }`}
                                                >
                                                  <div className="flex items-start gap-3">
                                                    <div
                                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                                                        isCorrectOption
                                                          ? "bg-green-600 text-white border-green-600"
                                                          : isWrong
                                                          ? "bg-red-600 text-white border-red-600"
                                                          : isSelected
                                                          ? "bg-blue-600 text-white border-blue-600"
                                                          : "bg-white text-slate-700 border-slate-300"
                                                      }`}
                                                    >
                                                      {String.fromCharCode(
                                                        65 + optIdx
                                                      )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <MathText
                                                        text={
                                                          option.text ||
                                                          option.label ||
                                                          option.value ||
                                                          ""
                                                        }
                                                        inline
                                                      />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                      {isCorrectOption && (
                                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-600 text-white flex items-center gap-1">
                                                          <svg
                                                            className="w-3 h-3"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                          >
                                                            <path
                                                              fillRule="evenodd"
                                                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                              clipRule="evenodd"
                                                            />
                                                          </svg>
                                                          Correct
                                                        </span>
                                                      )}
                                                      {isSelected && (
                                                        <span
                                                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                            isWrong
                                                              ? "bg-red-600 text-white"
                                                              : "bg-blue-600 text-white"
                                                          }`}
                                                        >
                                                          Your Answer
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            }
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {/* Text Answer (Subjective) */}
                                  {typeof answer.response === "string" &&
                                    !question?.options && (
                                      <div>
                                        <div className="text-sm font-medium text-slate-700 mb-2">
                                          Your Answer:
                                        </div>
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                          <p className="text-slate-900 whitespace-pre-wrap">
                                            {answer.response}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                  {/* AI Feedback */}
                                  {answer.aiFeedback && (
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                          <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                            />
                                          </svg>
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-sm font-semibold text-purple-900 mb-1">
                                            AI Feedback
                                          </div>
                                          <p className="text-sm text-purple-800 leading-relaxed">
                                            {answer.aiFeedback}
                                          </p>
                                          {typeof answer.rubricScore ===
                                            "number" && (
                                            <div className="mt-2 text-xs text-purple-700">
                                              AI Rubric Score:{" "}
                                              <span className="font-bold">
                                                {answer.rubricScore}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Explanation */}
                                  {question?.explanation && (
                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                                      <div className="flex items-start gap-3">
                                        <svg
                                          className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                          />
                                        </svg>
                                        <div className="flex-1">
                                          <div className="text-sm font-semibold text-amber-900 mb-1">
                                            Explanation
                                          </div>
                                          <div className="text-sm text-amber-800 leading-relaxed">
                                            <MathText
                                              text={question.explanation}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </>
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
