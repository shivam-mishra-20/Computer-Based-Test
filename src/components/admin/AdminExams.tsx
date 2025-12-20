"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { notify } from "../ui/toast";
import { InlineLoader } from "../ElegantLoader";

interface Exam {
  _id: string;
  title: string;
  isPublished?: boolean;
  description?: string;
  totalDurationMins?: number;
  sections?: {
    title: string;
    questionIds: string[];
    sectionDurationMins?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  }[];
  classLevel?: string;
  batch?: string;
}

export default function AdminExams() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = (await apiFetch("/api/exams")) as { items?: Exam[] };
      setExams(Array.isArray(data.items) ? data.items : []);
      setRefreshKey((prev) => prev + 1);
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
    router.push(`/dashboard/admin/exams/${ex._id}/build`);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: "",
          totalDurationMins: 60,
          sections: [],
          isPublished: false,
        }),
      });
      setTitle("");
      setShowCreateForm(false);
      notify.success("Exam created successfully");
      await load();
    } catch (e) {
      notify.error((e as Error).message || "Failed to create exam");
    } finally {
      setCreating(false);
    }
  }

  async function renameExam(exam: Exam) {
    const newTitle = prompt("New title", exam.title);
    if (!newTitle || newTitle.trim() === exam.title) return;
    try {
      const upd = (await apiFetch(`/api/exams/${exam._id}`, {
        method: "PUT",
        body: JSON.stringify({ title: newTitle.trim() }),
      })) as Partial<Exam>;
      setExams((arr) =>
        arr.map((e) =>
          e._id === exam._id ? { ...e, title: upd.title || newTitle.trim() } : e
        )
      );
      notify.success("Exam renamed successfully");
    } catch (e) {
      notify.error((e as Error).message || "Failed to rename exam");
    }
  }

  async function togglePublish(exam: Exam) {
    try {
      const upd = (await apiFetch(`/api/exams/${exam._id}`, {
        method: "PUT",
        body: JSON.stringify({ isPublished: !exam.isPublished }),
      })) as Partial<Exam>;
      setExams((arr) =>
        arr.map((e) =>
          e._id === exam._id
            ? { ...e, isPublished: upd.isPublished ?? !exam.isPublished }
            : e
        )
      );
      notify.success(
        `Exam ${exam.isPublished ? "unpublished" : "published"} successfully`
      );
    } catch (e) {
      notify.error((e as Error).message || "Failed to update publish status");
    }
  }

  async function deleteExam(exam: Exam) {
    if (!confirm(`Delete exam "${exam.title}"? This action cannot be undone.`))
      return;
    try {
      await apiFetch(`/api/exams/${exam._id}`, { method: "DELETE" });
      setExams((arr) => arr.filter((e) => e._id !== exam._id));
      notify.success("Exam deleted successfully");
    } catch (e) {
      notify.error((e as Error).message || "Failed to delete exam");
    }
  }

  const getStatusColor = (isPublished?: boolean) => {
    return isPublished
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 lg:p-6">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
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
                Create, configure, and manage exams
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
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
                <form
                  onSubmit={onCreate}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter exam title..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                    required
                  />
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={creating || !title.trim()}
                      className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {creating ? (
                        <span className="flex items-center gap-2">
                          <InlineLoader />
                          Creating...
                        </span>
                      ) : (
                        "Create Exam"
                      )}
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
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

        {/* Exams List */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {exams.length > 0 ? (
              <motion.div
                key={refreshKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-3"
              >
                {exams.map((exam, index) => (
                  <motion.div
                    key={exam._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-slate-900 truncate">
                                {exam.title}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(
                                    exam.isPublished
                                  )}`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      exam.isPublished
                                        ? "bg-emerald-500"
                                        : "bg-amber-500"
                                    }`}
                                  ></div>
                                  {exam.isPublished ? "Published" : "Draft"}
                                </span>
                                {exam.totalDurationMins && (
                                  <span className="text-sm text-slate-600">
                                    {exam.totalDurationMins} minutes
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {exam.classLevel || exam.batch ? (
                            <div className="flex items-center gap-3 text-sm text-slate-600 mb-3">
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
                            <div className="text-sm text-slate-500 mb-3">
                              No class or batch assigned
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-sm text-slate-600">
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
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                              <span>{exam.sections?.length || 0} sections</span>
                            </div>
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
                                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>
                                {exam.sections?.reduce(
                                  (total, section) =>
                                    total + section.questionIds.length,
                                  0
                                ) || 0}{" "}
                                questions
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openBuilder(exam)}
                            className="px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium flex items-center gap-1"
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
                                d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1z"
                              />
                            </svg>
                            Build
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => renameExam(exam)}
                            className="px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
                          >
                            Rename
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => togglePublish(exam)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                              exam.isPublished
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {exam.isPublished ? "Unpublish" : "Publish"}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => deleteExam(exam)}
                            className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                          >
                            Delete
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
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
                  Create your first exam to get started with assessments.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Create First Exam
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
