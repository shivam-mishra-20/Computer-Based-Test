"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import { Modal } from "../ui/modal";
import { notify } from "../ui/toast";
import { InlineLoader } from "../ElegantLoader";
import SchedulePublishPanel from "./SchedulePublishPanel";
import ExamStatusBadge, { type ExamStatus } from "./ExamStatusBadge";
import QuickCreateExamForm from "./QuickCreateExamForm";

interface ExamSectionDraft {
  title: string;
  questionIds: string[];
  sectionDurationMins?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

interface Exam {
  _id: string;
  title: string;
  description?: string;
  isPublished?: boolean;
  totalDurationMins?: number;
  sections?: ExamSectionDraft[];
  classLevel?: string;
  batch?: string;
  schedule?: { startAt?: string; endAt?: string; timezone?: string };
  instructions?: string;
  antiCheat?: boolean;
  lateEntryMins?: number;
  status?: ExamStatus;
}

// Prefer the server-derived status; the isPublished fallback only covers a
// response from an older backend that predates deriveExamStatus().
const statusOf = (exam: Exam): ExamStatus =>
  exam.status || (exam.isPublished ? "live" : "draft");

export default function TeacherExams() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [schedulingExam, setSchedulingExam] = useState<Exam | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = (await apiFetch("/exams")) as { items?: Exam[] };
      setExams(Array.isArray(data.items) ? data.items : []);
    } catch {
      setExams([]);
      notify.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openBuilder(ex: Exam) {
    router.push(`/dashboard/teacher/exams/${ex._id}/build`);
  }

  function examQuestionCount(ex: Exam) {
    return ex.sections?.reduce((sum, s) => sum + s.questionIds.length, 0) || 0;
  }

  function handlePublished(updated: Exam) {
    setSchedulingExam(null);
    setExams((prev) => prev.map((e) => (e._id === updated._id ? { ...e, ...updated } : e)));
    load();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
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
              <h1 className="text-2xl font-bold text-slate-900">
                Exam Management
              </h1>
              <p className="text-slate-600">
                Create and manage your teaching exams
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
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
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => load()}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              title="Refresh exams"
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
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="hidden sm:inline">Create Exam</span>
              <span className="sm:hidden">Create</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Exams</p>
                <p className="text-2xl font-bold text-blue-900">
                  {exams.length}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 text-sm font-medium">Live</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {exams.filter((e) => statusOf(e) === "live").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-600 text-sm font-medium">Drafts</p>
                <p className="text-2xl font-bold text-amber-900">
                  {exams.filter((e) => statusOf(e) === "draft").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
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
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">
                  Total Sections
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {exams.reduce((sum, e) => sum + (e.sections?.length || 0), 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Create New Exam
                  </h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-slate-500"
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
                <QuickCreateExamForm
                  onCreated={(id) => router.push(`/dashboard/teacher/exams/${id}/build`)}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
          >
            <div className="flex items-center justify-center gap-3">
              <InlineLoader />
              <span className="text-slate-600 font-medium">
                Loading exams...
              </span>
            </div>
          </motion.div>
        )}

        {/* Exams Display */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {exams.map((exam, index) => (
                    <motion.div
                      key={exam._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                            {exam.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
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
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                              {exam.sections?.length || 0} sections
                            </span>
                            <span className="flex items-center gap-1">
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
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {exam.totalDurationMins || 0}m
                            </span>
                          </div>
                        </div>
                        <ExamStatusBadge status={statusOf(exam)} />
                      </div>

                      {exam.classLevel || exam.batch ? (
                        <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
                          {exam.classLevel && (
                            <div className="flex items-center gap-1">
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
                                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                              </svg>
                              <span>Class {exam.classLevel}</span>
                            </div>
                          )}
                          {exam.batch && (
                            <div className="flex items-center gap-1">
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
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <span>{exam.batch}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mb-4">
                          No class or batch assigned
                        </div>
                      )}

                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openBuilder(exam)}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all"
                        >
                          Build Exam
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSchedulingExam(exam)}
                          className="px-4 py-2 text-sm font-medium rounded-lg transition-all bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200"
                        >
                          {exam.isPublished ? "Manage Schedule" : "Schedule & Publish"}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Exam Title
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                            Sections
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-36">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {exams.map((exam) => (
                          <tr
                            key={exam._id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 line-clamp-1">
                                    {exam.title}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {exam.classLevel && exam.batch
                                      ? `Class ${exam.classLevel} • ${exam.batch}`
                                      : "No assignment"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 text-center text-sm text-slate-600 py-4">
                              {exam.sections?.length || 0}
                            </td>
                            <td className="px-6 text-center text-sm text-slate-600 py-4">
                              {exam.totalDurationMins || 0} min
                            </td>
                            <td className="px-6 text-center py-4">
                              <ExamStatusBadge status={statusOf(exam)} />
                            </td>
                            <td className="px-6 text-right py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openBuilder(exam)}
                                  className="px-3 py-1.5 text-xs rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
                                >
                                  Build
                                </button>
                                <button
                                  onClick={() => setSchedulingExam(exam)}
                                  className="px-3 py-1.5 text-xs rounded-lg transition border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                >
                                  {exam.isPublished ? "Manage Schedule" : "Schedule & Publish"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && exams.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No exams found
            </h3>
            <p className="text-slate-600 mb-6">
              Get started by creating your first teaching exam.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
            >
              Create First Exam
            </motion.button>
          </motion.div>
        )}

        {/* Schedule & Publish Modal */}
        <Modal
          title="Schedule & Publish"
          open={!!schedulingExam}
          onOpenChange={(open) => !open && setSchedulingExam(null)}
        >
          {schedulingExam && (
            <SchedulePublishPanel
              exam={schedulingExam}
              totalQuestions={examQuestionCount(schedulingExam)}
              onPublished={handlePublished}
              onCancel={() => setSchedulingExam(null)}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}

