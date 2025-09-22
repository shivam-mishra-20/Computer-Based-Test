"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Protected from "../Protected";
import { apiFetch } from "../../lib/api";
import { Skeleton } from "../ui/skeleton";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredExams, setFilteredExams] = useState<ExamLite[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
        setFilteredExams(examData as ExamLite[]);
      } else {
        setExams([]);
        setFilteredExams([]);
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
      const msg = e instanceof Error ? e.message : "Failed to load exams";
      setError(msg);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 600);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredExams(exams);
      return;
    }
    const now = Date.now();
    const filtered = exams.filter((ex) => {
      const start = ex.schedule?.startAt
        ? new Date(ex.schedule.startAt).getTime()
        : undefined;
      const end = ex.schedule?.endAt
        ? new Date(ex.schedule.endAt).getTime()
        : undefined;
      const windowState =
        start && end
          ? now < start
            ? "upcoming"
            : now > end
            ? "closed"
            : "open"
          : "open";
      return windowState === statusFilter;
    });
    setFilteredExams(filtered);
  }, [statusFilter, exams]);

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
      alert("Failed to start attempt");
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
  };

  function renderAction(ex: ExamLite) {
    const a = attemptMap[ex._id];
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
          ? "upcoming"
          : now > end
          ? "closed"
          : "open"
        : "open";

    if (windowState === "closed" && !a) {
      return (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2.5 text-sm font-medium bg-slate-100 text-slate-500 rounded-xl border border-slate-200 cursor-not-allowed"
          disabled
        >
          <svg
            className="w-4 h-4 mr-2 inline-block"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Closed
        </motion.button>
      );
    }

    if (windowState === "upcoming" && !a) {
      return (
        <motion.div
          className="flex flex-col items-end space-y-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            Starts Soon
          </div>
          <div className="text-xs text-slate-600">
            {start ? formatDate(ex.schedule?.startAt || "") : "TBD"}
          </div>
        </motion.div>
      );
    }

    if (a) {
      if (["submitted", "auto-submitted", "graded"].includes(a.status)) {
        return (
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              (window.location.href = `/dashboard/exam/${a._id}?review=1`)
            }
            className="px-4 py-2.5 text-sm font-semibold bg-emerald-50 text-emerald-700 rounded-xl border-2 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            View Results
          </motion.button>
        );
      }
      return (
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            (window.location.href = `/dashboard/exam/${a._id}?attempt=1`)
          }
          className="px-4 py-2.5 text-sm font-semibold bg-amber-50 text-amber-700 rounded-xl border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
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
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H9m3.5-4h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H12.5m-7-1.5h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H5v-4.5z"
            />
          </svg>
          Continue
        </motion.button>
      );
    }

    return (
      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => startAttempt(ex._id)}
        className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
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
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H9m3.5-4h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H12.5m-7-1.5h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H5v-4.5z"
          />
        </svg>
        Start Exam
      </motion.button>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { bg: string; text: string; border: string; icon: string }
    > = {
      open: {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-300",
        icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
      },
      upcoming: {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-300",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      closed: {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-300",
        icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
      },
    };

    const config = statusConfig[status] || statusConfig.open;

    return (
      <span
        className={`px-3 py-1.5 text-xs font-semibold rounded-full border-2 ${config.bg} ${config.text} ${config.border} flex items-center gap-1.5`}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={config.icon}
          />
        </svg>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <Protected requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/20 to-emerald-50/30">
        <div className="max-w-8xl mx-auto p-0 space-y-6">
          {/* Header Section */}
          <div className="flex justify-center items-center md:justify-between md:items-end flex-wrap gap-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg px-2">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    My Exams
                  </h1>
                  <p className="text-slate-600 text-base">
                    Track and manage your assigned examinations
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Filter Pills */}
            <motion.div
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {[
                { key: "all", label: "All", color: "emerald" },
                { key: "open", label: "Open", color: "emerald" },
                { key: "upcoming", label: "Upcoming", color: "emerald" },
                { key: "closed", label: "Closed", color: "emerald" },
              ].map((filter) => (
                <motion.button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    statusFilter === filter.key
                      ? `bg-${filter.color}-600 text-white shadow-lg scale-105`
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  whileHover={{
                    scale: statusFilter === filter.key ? 1.05 : 1.02,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {filter.label}
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">
                      Error Loading Exams
                    </h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors"
                  onClick={() => setError(null)}
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
            </motion.div>
          )}

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/20 shadow-xl overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-8 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center space-x-4">
                            <Skeleton className="h-6 w-1/2 rounded-xl" />
                            <Skeleton className="h-8 w-20 rounded-full" />
                          </div>
                          <div className="flex gap-4">
                            <Skeleton className="h-4 w-32 rounded-lg" />
                            <Skeleton className="h-4 w-28 rounded-lg" />
                            <Skeleton className="h-4 w-36 rounded-lg" />
                          </div>
                          <div className="flex gap-6">
                            <Skeleton className="h-4 w-40 rounded-lg" />
                            <Skeleton className="h-4 w-36 rounded-lg" />
                          </div>
                        </div>
                        <Skeleton className="h-12 w-32 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {filteredExams.length > 0 ? (
                  <motion.div
                    className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.1,
                        },
                      },
                    }}
                    initial="hidden"
                    animate="show"
                  >
                    {filteredExams.map((ex, index) => {
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
                            ? "upcoming"
                            : now > end
                            ? "closed"
                            : "open"
                          : "open";

                      return (
                        <motion.div
                          key={ex._id}
                          className={`p-8 border-b border-slate-100/50 last:border-b-0 hover:bg-emerald-50/30 transition-all duration-300 ${
                            index === 0 ? "rounded-t-3xl" : ""
                          } ${
                            index === filteredExams.length - 1
                              ? "rounded-b-3xl"
                              : ""
                          }`}
                          variants={{
                            hidden: { opacity: 0, y: 30 },
                            show: {
                              opacity: 1,
                              y: 0,
                              transition: {
                                type: "spring",
                                stiffness: 300,
                                damping: 24,
                              },
                            },
                          }}
                          whileHover={{
                            backgroundColor: "rgba(16, 185, 129, 0.05)",
                            scale: 1.01,
                          }}
                        >
                          <div className="flex items-start justify-between flex-wrap gap-6">
                            <div className="flex-1 min-w-[300px] space-y-4">
                              <div className="flex items-center gap-4 flex-wrap">
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                  {ex.title}
                                </h3>
                                {getStatusBadge(windowState)}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                {ex.classLevel && (
                                  <div className="flex items-center space-x-2 text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                    <svg
                                      className="w-4 h-4 text-emerald-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                      />
                                    </svg>
                                    <span className="font-medium">Class:</span>
                                    <span>{ex.classLevel}</span>
                                  </div>
                                )}
                                {ex.batch && (
                                  <div className="flex items-center space-x-2 text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                    <svg
                                      className="w-4 h-4 text-emerald-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                      />
                                    </svg>
                                    <span className="font-medium">Batch:</span>
                                    <span>{ex.batch}</span>
                                  </div>
                                )}
                                {ex.totalDurationMins && (
                                  <div className="flex items-center space-x-2 text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                    <svg
                                      className="w-4 h-4 text-emerald-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span className="font-medium">
                                      Duration:
                                    </span>
                                    <span>{ex.totalDurationMins} minutes</span>
                                  </div>
                                )}
                              </div>

                              {(ex.schedule?.startAt || ex.schedule?.endAt) && (
                                <div className="flex gap-6 text-sm pt-2">
                                  {ex.schedule?.startAt && (
                                    <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
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
                                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                      <span className="font-medium">
                                        Starts:
                                      </span>
                                      <span>
                                        {formatDate(ex.schedule.startAt)}
                                      </span>
                                    </div>
                                  )}
                                  {ex.schedule?.endAt && (
                                    <div className="flex items-center space-x-2 text-red-700 bg-red-50 rounded-lg px-3 py-2">
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
                                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                      <span className="font-medium">Ends:</span>
                                      <span>
                                        {formatDate(ex.schedule.endAt)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center">
                              {renderAction(ex)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/20 shadow-2xl p-12 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-100 to-green-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                      <svg
                        className="w-12 h-12 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      No {statusFilter !== "all" ? statusFilter : ""} exams
                      found
                    </h3>
                    <p className="text-slate-600 text-lg max-w-lg mx-auto mb-8">
                      {statusFilter === "all"
                        ? "No exams have been assigned to you yet. Check back later or contact your instructor."
                        : `You don't have any ${statusFilter} exams at the moment. Try switching to a different filter to see other exams.`}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => load()}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refresh Exams
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Protected>
  );
}
