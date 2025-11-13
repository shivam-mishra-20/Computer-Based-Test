"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeInOut } from "framer-motion";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";
import { MathText } from "../ui/MathText";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easeInOut,
    },
  },
};

const cardVariants = {
  hover: {
    y: -4,
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: {
      duration: 0.3,
      ease: easeInOut, // Use imported easing function
    },
  },
};

// Interfaces
interface UserInfo {
  _id: string;
  name?: string;
  email?: string;
  classLevel?: string;
  batch?: string;
  firebaseUid?: string;
}

interface ExamInfo {
  _id: string;
  title: string;
}

interface PendingAttemptSummary {
  _id: string;
  examId: string | ExamInfo;
  userId: string | UserInfo;
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
  userId: string | UserInfo;
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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");

  // All original functions remain the same
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
      await openAttempt(active.attempt._id);
    } finally {
      setSaving(false);
    }
  }

  async function publishAttempt() {
    if (!active) return;
    if (
      !confirm(
        "Are you sure you want to publish this result? This action cannot be undone."
      )
    )
      return;
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "reviewed":
        return "bg-green-100 text-green-700 border-green-200";
      case "published":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getScorePercentage = (score: number, maxScore: number) => {
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  return (
    <Protected requiredRole="teacher">
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Review Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Grade and publish student exam attempts
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as "all" | "pending" | "reviewed")
              }
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Attempts</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                List View
              </button>
            </div>

            {/* Refresh Button */}
            <motion.button
              onClick={loadPending}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:shadow-lg transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Refreshing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </div>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={itemVariants}
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">
                  Total Attempts
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {pending.length}
                </p>
              </div>
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">
                  Pending Reviews
                </p>
                <p className="text-2xl font-bold text-yellow-900">
                  {pending.filter((p) => !p.resultPublished).length}
                </p>
              </div>
              <div className="p-2 bg-yellow-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Published</p>
                <p className="text-2xl font-bold text-green-900">
                  {pending.filter((p) => p.resultPublished).length}
                </p>
              </div>
              <div className="p-2 bg-green-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Avg Score</p>
                <p className="text-2xl font-bold text-purple-900">
                  {pending.length > 0
                    ? Math.round(
                        pending.reduce(
                          (sum, p) =>
                            sum +
                            getScorePercentage(
                              p.totalScore || 0,
                              p.maxScore || 1
                            ),
                          0
                        ) / pending.length
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="p-2 bg-purple-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-2xl p-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-red-900">
                    Error Loading Attempts
                  </h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attempts Display */}
        <motion.div variants={itemVariants}>
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-6 border border-gray-200"
                  >
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {!loading && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {pending.map((attempt, index) => {
                        const scorePercentage = getScorePercentage(
                          attempt.totalScore || 0,
                          attempt.maxScore || 1
                        );
                        const user =
                          typeof attempt.userId === "object"
                            ? attempt.userId
                            : null;
                        const exam =
                          typeof attempt.examId === "object"
                            ? attempt.examId
                            : null;

                        return (
                          <motion.div
                            key={attempt._id}
                            className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-200 transition-all shadow-sm"
                            variants={cardVariants}
                            whileHover="hover"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="space-y-4">
                              {/* Header with Status */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {user?.name?.charAt(0).toUpperCase() || "S"}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">
                                      {user?.name || "Student"}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      #{attempt._id.slice(-6)}
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                    attempt.status
                                  )}`}
                                >
                                  {attempt.resultPublished
                                    ? "Published"
                                    : "Pending"}
                                </div>
                              </div>

                              {/* Student Details */}
                              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                                {exam?.title && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <svg
                                      className="w-4 h-4 text-gray-400"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <span className="text-gray-700 font-medium">
                                      {exam.title}
                                    </span>
                                  </div>
                                )}
                                {user?.classLevel && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <svg
                                      className="w-4 h-4 text-gray-400"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                      />
                                    </svg>
                                    <span className="text-gray-600">
                                      Class:
                                    </span>
                                    <span className="text-gray-900 font-medium">
                                      {user.classLevel}
                                    </span>
                                  </div>
                                )}
                                {user?.batch && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <svg
                                      className="w-4 h-4 text-gray-400"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                      />
                                    </svg>
                                    <span className="text-gray-600">
                                      Batch:
                                    </span>
                                    <span className="text-gray-900 font-medium">
                                      {user.batch}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Score Visualization */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Score</span>
                                  <span className="font-semibold text-gray-900">
                                    {attempt.totalScore || 0} /{" "}
                                    {attempt.maxScore || 0}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <motion.div
                                    className={`h-2 rounded-full ${
                                      scorePercentage >= 80
                                        ? "bg-green-500"
                                        : scorePercentage >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${scorePercentage}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                  />
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium text-gray-700">
                                    {scorePercentage}%
                                  </span>
                                </div>
                              </div>

                              {/* Details */}
                              {attempt.submittedAt && (
                                <div className="text-xs text-gray-500">
                                  Submitted:{" "}
                                  {new Date(
                                    attempt.submittedAt
                                  ).toLocaleString()}
                                </div>
                              )}

                              {/* Action Button */}
                              <motion.button
                                onClick={() => openAttempt(attempt._id)}
                                className={`w-full px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                                  attempt.resultPublished
                                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg"
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {attempt.resultPublished
                                  ? "View Review"
                                  : "Start Review"}
                              </motion.button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-6 py-4 font-semibold text-gray-900">
                              Student
                            </th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-900">
                              Exam
                            </th>
                            <th className="text-center px-6 py-4 font-semibold text-gray-900">
                              Class/Batch
                            </th>
                            <th className="text-center px-6 py-4 font-semibold text-gray-900">
                              Score
                            </th>
                            <th className="text-center px-6 py-4 font-semibold text-gray-900">
                              Status
                            </th>
                            <th className="text-right px-6 py-4 font-semibold text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pending.map((attempt) => {
                            const scorePercentage = getScorePercentage(
                              attempt.totalScore || 0,
                              attempt.maxScore || 1
                            );
                            const user =
                              typeof attempt.userId === "object"
                                ? attempt.userId
                                : null;
                            const exam =
                              typeof attempt.examId === "object"
                                ? attempt.examId
                                : null;

                            return (
                              <tr
                                key={attempt._id}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                      {user?.name?.charAt(0).toUpperCase() ||
                                        "S"}
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {user?.name || "Student"}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        #{attempt._id.slice(-6)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-gray-900 font-medium">
                                    {exam?.title || "Exam"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="text-sm">
                                    {user?.classLevel && (
                                      <div className="text-gray-900 font-medium">
                                        {user.classLevel}
                                      </div>
                                    )}
                                    {user?.batch && (
                                      <div className="text-gray-600 text-xs">
                                        {user.batch}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {attempt.totalScore || 0}/
                                      {attempt.maxScore || 0}
                                    </span>
                                    <span
                                      className={`text-sm font-medium ${
                                        scorePercentage >= 80
                                          ? "text-green-600"
                                          : scorePercentage >= 60
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ({scorePercentage}%)
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span
                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                      attempt.status
                                    )}`}
                                  >
                                    {attempt.resultPublished
                                      ? "Published"
                                      : attempt.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-600">
                                  {attempt.submittedAt
                                    ? new Date(
                                        attempt.submittedAt
                                      ).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => openAttempt(attempt._id)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                      attempt.resultPublished
                                        ? "text-gray-600 hover:bg-gray-100"
                                        : "text-indigo-600 hover:bg-indigo-50"
                                    }`}
                                  >
                                    {attempt.resultPublished
                                      ? "View"
                                      : "Review"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && pending.length === 0 && (
            <motion.div
              className="text-center py-12 bg-white rounded-2xl border border-gray-200"
              variants={itemVariants}
            >
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No attempts to review
              </h3>
              <p className="text-gray-600 mb-4">
                All exam attempts have been processed and published.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Enhanced Review Modal */}
        <AnimatePresence>
          {active && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border-2 border-white/30">
                        {typeof active.attempt.userId === "object" &&
                        active.attempt.userId.name
                          ? active.attempt.userId.name.charAt(0).toUpperCase()
                          : "S"}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">
                          {active.exam.title}
                        </h2>
                        <div className="flex items-center gap-3 text-indigo-100 text-sm mt-1">
                          {typeof active.attempt.userId === "object" &&
                            active.attempt.userId.name && (
                              <>
                                <span className="font-medium">
                                  {active.attempt.userId.name}
                                </span>
                                {active.attempt.userId.classLevel && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      Class {active.attempt.userId.classLevel}
                                    </span>
                                  </>
                                )}
                                {active.attempt.userId.batch && (
                                  <>
                                    <span>•</span>
                                    <span>{active.attempt.userId.batch}</span>
                                  </>
                                )}
                              </>
                            )}
                          <span>•</span>
                          <span>#{active.attempt._id.slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                        <div className="text-xs text-indigo-100 font-medium">
                          Score
                        </div>
                        <div className="text-2xl font-bold">
                          {active.attempt.totalScore}{" "}
                          <span className="text-lg opacity-75">
                            / {active.attempt.maxScore}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => setActive(null)}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
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
                </div>

                {/* Modal Content */}
                <div className="flex h-full max-h-[calc(90vh-80px)]">
                  {/* Questions Section */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="space-y-6">
                      {active.sections
                        .flatMap((sec) => sec.questionIds)
                        .map((qid: string, idx: number) => {
                          const question = active.questions[qid];
                          const answer = active.attempt.answers.find(
                            (a) => a.questionId === qid
                          );
                          const scorePercentage = answer?.scoreAwarded
                            ? (answer.scoreAwarded / 5) * 100
                            : 0; // Assuming max 5 points per question

                          return (
                            <motion.div
                              key={qid}
                              className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                            >
                              {/* Question Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white text-sm font-bold rounded-lg">
                                      {idx + 1}
                                    </span>
                                    <h4 className="font-semibold text-gray-900">
                                      Question {idx + 1}
                                    </h4>
                                  </div>
                                  <div className="text-gray-800 leading-relaxed pl-11">
                                    <MathText text={question.text} />
                                  </div>
                                </div>
                              </div>

                              {/* Multiple Choice Options */}
                              {question.options && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-gray-700 mb-2 pl-11">
                                    Options:
                                  </p>
                                  <div className="grid gap-2 pl-11">
                                    {question.options.map((option, optIdx) => (
                                      <div
                                        key={option._id}
                                        className={`p-3 rounded-lg border text-sm transition-colors ${
                                          answer?.chosenOptionId === option._id
                                            ? "bg-blue-50 border-blue-300 text-blue-900 shadow-sm"
                                            : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className="font-bold text-gray-700 min-w-[20px]">
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          <div className="flex-1">
                                            <MathText
                                              text={option.text}
                                              inline
                                            />
                                          </div>
                                          {answer?.chosenOptionId ===
                                            option._id && (
                                            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium whitespace-nowrap">
                                              Selected
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Text Answer */}
                              {answer?.textAnswer && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Student Answer:
                                  </p>
                                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                      {answer.textAnswer}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* AI Analysis */}
                              {(answer?.rubricScore !== undefined ||
                                answer?.aiFeedback) && (
                                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                  <p className="text-sm font-medium text-purple-700 mb-2">
                                    🤖 AI Analysis
                                  </p>
                                  {answer.rubricScore !== undefined && (
                                    <p className="text-sm text-purple-600 mb-1">
                                      AI Rubric Score:{" "}
                                      <span className="font-bold">
                                        {answer.rubricScore}
                                      </span>
                                    </p>
                                  )}
                                  {answer.aiFeedback && (
                                    <p className="text-sm text-purple-600 italic">
                                      {answer.aiFeedback}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Scoring Interface */}
                              <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      Score:
                                    </label>
                                    <input
                                      type="number"
                                      defaultValue={answer?.scoreAwarded ?? 0}
                                      min={0}
                                      max={5}
                                      step={0.25}
                                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      onBlur={(e) =>
                                        adjustScore(
                                          qid,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      disabled={saving}
                                    />
                                    <span className="text-sm text-gray-500">
                                      / 5
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    <motion.button
                                      onClick={() =>
                                        adjustScore(
                                          qid,
                                          Math.min(
                                            5,
                                            (answer?.scoreAwarded || 0) + 0.25
                                          )
                                        )
                                      }
                                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      disabled={saving}
                                    >
                                      +0.25
                                    </motion.button>
                                    <motion.button
                                      onClick={() =>
                                        adjustScore(
                                          qid,
                                          Math.max(
                                            0,
                                            (answer?.scoreAwarded || 0) - 0.25
                                          )
                                        )
                                      }
                                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      disabled={saving}
                                    >
                                      -0.25
                                    </motion.button>
                                  </div>

                                  {/* Score Visualization */}
                                  <div className="flex-1 min-w-32">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <motion.div
                                        className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${scorePercentage}%`,
                                        }}
                                        transition={{ duration: 0.5 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Sidebar with Summary and Actions */}
                  <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Student Info Card */}
                      {typeof active.attempt.userId === "object" &&
                        active.attempt.userId.name && (
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg
                                className="w-5 h-5 text-indigo-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              Student Details
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div>
                                <div className="text-gray-600 text-xs mb-1">
                                  Name
                                </div>
                                <div className="font-semibold text-gray-900">
                                  {active.attempt.userId.name}
                                </div>
                              </div>
                              {active.attempt.userId.email && (
                                <div>
                                  <div className="text-gray-600 text-xs mb-1">
                                    Email
                                  </div>
                                  <div className="text-gray-900 truncate">
                                    {active.attempt.userId.email}
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2 pt-2">
                                {active.attempt.userId.classLevel && (
                                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                    <div className="text-gray-600 text-xs mb-1">
                                      Class
                                    </div>
                                    <div className="font-semibold text-indigo-700">
                                      {active.attempt.userId.classLevel}
                                    </div>
                                  </div>
                                )}
                                {active.attempt.userId.batch && (
                                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                                    <div className="text-gray-600 text-xs mb-1">
                                      Batch
                                    </div>
                                    <div className="font-semibold text-purple-700">
                                      {active.attempt.userId.batch}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Attempt Summary */}
                      <div className="bg-white rounded-2xl p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Attempt Info
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-gray-900">
                              #{active.attempt._id.slice(-6)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Submitted:</span>
                            <span className="text-gray-900">
                              {active.attempt.submittedAt
                                ? new Date(
                                    active.attempt.submittedAt
                                  ).toLocaleDateString()
                                : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                active.attempt.status
                              )}`}
                            >
                              {active.attempt.status}
                            </span>
                          </div>
                          <div className="border-t pt-2 mt-3">
                            <div className="flex justify-between font-semibold">
                              <span className="text-gray-700">
                                Total Score:
                              </span>
                              <span className="text-gray-900">
                                {active.attempt.totalScore} /{" "}
                                {active.attempt.maxScore}
                              </span>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-gray-600">Percentage:</span>
                              <span className="text-gray-900 font-medium">
                                {getScorePercentage(
                                  active.attempt.totalScore || 0,
                                  active.attempt.maxScore || 1
                                )}
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="bg-white rounded-2xl p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          Review Progress
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Questions Reviewed
                            </span>
                            <span className="text-gray-900">
                              {
                                active.attempt.answers.filter(
                                  (a) => a.scoreAwarded !== undefined
                                ).length
                              }{" "}
                              / {active.attempt.answers.length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className="h-2 bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${
                                  (active.attempt.answers.filter(
                                    (a) => a.scoreAwarded !== undefined
                                  ).length /
                                    active.attempt.answers.length) *
                                  100
                                }%`,
                              }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <motion.button
                          disabled={publishing}
                          onClick={publishAttempt}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50 hover:shadow-lg transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {publishing ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Publishing...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                              </svg>
                              Publish Result
                            </div>
                          )}
                        </motion.button>

                        <motion.button
                          onClick={() => setActive(null)}
                          className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Save & Close
                        </motion.button>
                      </div>

                      {/* Keyboard Shortcuts */}
                      <div className="bg-gray-100 rounded-xl p-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">
                          Keyboard Shortcuts
                        </h4>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Save & Close</span>
                            <kbd className="bg-gray-200 px-1 rounded">Esc</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span>Publish</span>
                            <kbd className="bg-gray-200 px-1 rounded">
                              Ctrl+P
                            </kbd>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Protected>
  );
}
