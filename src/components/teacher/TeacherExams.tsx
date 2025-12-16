"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import { Modal } from "../ui/modal";
import { notify } from "../ui/toast";
import { InlineLoader } from "../ElegantLoader";
import { MathText } from "../ui/MathText";

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
}

export default function TeacherExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<ExamSectionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [classLevel, setClassLevel] = useState<string>("");
  const [batch, setBatch] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [examClassForQuestions, setExamClassForQuestions] =
    useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const data = (await apiFetch("/api/exams")) as { items?: Exam[] };
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
      await load();
      notify.success("Exam created successfully");
    } catch (e) {
      notify.error((e as Error).message || "Failed to create exam");
    } finally {
      setCreating(false);
    }
  }

  function openBuilder(ex: Exam) {
    setEditingExam(ex);
    setSectionDrafts(ex.sections || []);
    setClassLevel(ex.classLevel || "");
    setBatch(ex.batch || "");
    setExamClassForQuestions(ex.classLevel || "");
    setBuilderOpen(true);
  }

  function addSection() {
    setSectionDrafts((s) => [
      ...s,
      {
        title: `Section ${s.length + 1}`,
        questionIds: [],
        sectionDurationMins: 30,
        shuffleQuestions: true,
        shuffleOptions: true,
      },
    ]);
  }

  function updateSection(idx: number, patch: Partial<ExamSectionDraft>) {
    setSectionDrafts((s) =>
      s.map((sec, i) => (i === idx ? { ...sec, ...patch } : sec))
    );
  }

  function removeSection(idx: number) {
    if (!confirm("Remove this section?")) return;
    setSectionDrafts((s) => s.filter((_, i) => i !== idx));
  }

  async function saveExamStructure() {
    if (!editingExam) return;
    setSaving(true);
    try {
      await apiFetch(`/api/exams/${editingExam._id}`, {
        method: "PUT",
        body: JSON.stringify({
          sections: sectionDrafts,
          totalDurationMins: sectionDrafts.reduce(
            (sum, s) => sum + (s.sectionDurationMins || 0),
            0
          ),
        }),
      });
      notify.success("Exam structure updated successfully");
      setBuilderOpen(false);
      await load();
    } catch (e) {
      notify.error((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(ex: Exam) {
    try {
      await apiFetch(`/api/exams/${ex._id}`, {
        method: "PUT",
        body: JSON.stringify({ isPublished: !ex.isPublished }),
      });
      notify.success(
        `Exam ${!ex.isPublished ? "published" : "unpublished"} successfully`
      );
      await load();
    } catch (e) {
      notify.error((e as Error).message || "Toggle failed");
    }
  }

  async function assignToClassBatch() {
    if (!editingExam) return;
    if (!classLevel || !batch) {
      notify.error("Select both Class and Batch");
      return;
    }
    try {
      const batchValue = batch === "All Batches" ? "All Batches" : batch;
      await apiFetch(`/api/exams/${editingExam._id}`, {
        method: "PUT",
        body: JSON.stringify({
          classLevel,
          batch: batchValue,
          isPublished: true,
        }),
      });

      // If "All Batches" is selected, assign to all possible batches
      const groups =
        batch === "All Batches"
          ? [classLevel, "Lakshya", "Aadharshilla", "Basic", "Commerce"]
          : [classLevel, batch];

      await apiFetch(`/api/exams/${editingExam._id}/assign`, {
        method: "POST",
        body: JSON.stringify({ groups }),
      });
      notify.success(
        batch === "All Batches"
          ? "Assigned to entire class successfully"
          : "Assigned to class/batch successfully"
      );
      await load();
    } catch (e) {
      notify.error((e as Error).message || "Assignment failed");
    }
  }

  const getStatusColor = (isPublished?: boolean) => {
    return isPublished
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  };

  const totalQuestions = sectionDrafts.reduce(
    (sum, s) => sum + s.questionIds.length,
    0
  );
  const totalDuration = sectionDrafts.reduce(
    (sum, s) => sum + (s.sectionDurationMins || 0),
    0
  );

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
                <p className="text-emerald-600 text-sm font-medium">
                  Published
                </p>
                <p className="text-2xl font-bold text-emerald-900">
                  {exams.filter((e) => e.isPublished).length}
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
                  {exams.filter((e) => !e.isPublished).length}
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
                <form
                  onSubmit={onCreate}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter exam title..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                    required
                  />
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={creating || !title.trim()}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            exam.isPublished
                          )}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full inline-block mr-1 ${
                              exam.isPublished
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}
                          ></div>
                          {exam.isPublished ? "Published" : "Draft"}
                        </span>
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
                          onClick={() => togglePublish(exam)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            exam.isPublished
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200"
                          }`}
                        >
                          {exam.isPublished ? "Unpublish" : "Publish"}
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
                              <span
                                className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  exam.isPublished
                                )}`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full mr-1 ${
                                    exam.isPublished
                                      ? "bg-emerald-500"
                                      : "bg-amber-500"
                                  }`}
                                ></div>
                                {exam.isPublished ? "Published" : "Draft"}
                              </span>
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
                                  onClick={() => togglePublish(exam)}
                                  className={`px-3 py-1.5 text-xs rounded-lg transition border ${
                                    exam.isPublished
                                      ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  }`}
                                >
                                  {exam.isPublished ? "Unpublish" : "Publish"}
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

        {/* Enhanced Modal for Exam Builder */}
        <Modal
          title={
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
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
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {editingExam ? `Build: ${editingExam.title}` : "Exam Builder"}
                </h3>
                <p className="text-sm text-slate-600">
                  Configure exam sections and questions
                </p>
              </div>
            </div>
          }
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          wide
          footer={
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
              <div className="flex items-center gap-4 text-sm text-slate-600">
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
                  <span>{sectionDrafts.length} sections</span>
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
                  <span>{totalQuestions} questions</span>
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{totalDuration} minutes</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setBuilderOpen(false)}
                  className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                  onClick={saveExamStructure}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg disabled:opacity-50 hover:shadow-lg transition-all font-medium"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <InlineLoader />
                      Saving...
                    </span>
                  ) : (
                    "Save Structure"
                  )}
                </motion.button>
              </div>
            </div>
          }
        >
          {!editingExam ? (
            <div className="text-center py-12 text-slate-500">
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
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-900 mb-2">
                Select an exam to configure
              </p>
              <p>
                Choose an exam from the list to set up its structure and
                sections.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Class Selection for Question Filtering */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <svg
                    className="w-5 h-5 text-blue-600"
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
                  <h4 className="font-semibold text-blue-900">
                    Select Class for Questions
                  </h4>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Choose a class to load questions from that class&apos;s
                  question bank
                </p>
                <select
                  value={examClassForQuestions}
                  onChange={(e) => setExamClassForQuestions(e.target.value)}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
                >
                  <option value="">Select Class (6-12)</option>
                  {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Management */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    Exam Sections
                  </h4>
                  <p className="text-sm text-slate-600">
                    Add and configure sections for your exam
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addSection}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
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
                  Add Section
                </motion.button>
              </div>

              {/* Sections List */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <AnimatePresence>
                  {sectionDrafts.map((section, index) => (
                    <motion.div
                      key={index}
                      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      layout
                    >
                      <div className="space-y-4">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <input
                            value={section.title}
                            onChange={(e) =>
                              updateSection(index, { title: e.target.value })
                            }
                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                            placeholder="Section title"
                          />
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-slate-600 font-medium">
                                Duration:
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={section.sectionDurationMins || 0}
                                onChange={(e) =>
                                  updateSection(index, {
                                    sectionDurationMins: Number(e.target.value),
                                  })
                                }
                                className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                              />
                              <span className="text-sm text-slate-600">
                                min
                              </span>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => removeSection(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove section"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </motion.button>
                          </div>
                        </div>

                        {/* Section Options */}
                        <div className="flex flex-wrap gap-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={section.shuffleQuestions}
                              onChange={(e) =>
                                updateSection(index, {
                                  shuffleQuestions: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-slate-700 font-medium">
                              Shuffle Questions
                            </span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={section.shuffleOptions}
                              onChange={(e) =>
                                updateSection(index, {
                                  shuffleOptions: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-slate-700 font-medium">
                              Shuffle Options
                            </span>
                          </label>
                        </div>

                        {/* Question Status */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-purple-600"
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
                            <span className="font-medium text-slate-900">
                              {section.questionIds.length} Questions Selected
                            </span>
                          </div>
                          {section.questionIds.length === 0 && (
                            <div className="flex items-center gap-2 text-amber-600">
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
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              <span className="text-sm font-medium">
                                No questions selected
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Question Picker */}
                        <div className="border-t border-slate-200 pt-4">
                          <QuestionPicker
                            selected={section.questionIds}
                            onChange={(ids) =>
                              updateSection(index, { questionIds: ids })
                            }
                            classLevel={examClassForQuestions}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {sectionDrafts.length === 0 && (
                  <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
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
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-slate-900 mb-1">
                      No sections created
                    </p>
                    <p className="text-sm">
                      Click &apos;Add Section&apos; to get started
                    </p>
                  </div>
                )}
              </div>

              {/* Assignment Section */}
              <div className="border-t border-slate-200 pt-6">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-4">
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">
                      Assign to Class & Batch
                    </h4>
                    <p className="text-sm text-purple-700">
                      Select a class (7–12) and batch to publish this exam to
                      specific student groups
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      className="px-4 py-2.5 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-200 bg-white"
                    >
                      <option value="">Select Class</option>
                      {["7", "8", "9", "10", "11", "12"].map((c) => (
                        <option key={c} value={c}>
                          Class {c}
                        </option>
                      ))}
                    </select>
                    <select
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="px-4 py-2.5 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-200 bg-white"
                    >
                      <option value="">Select Batch</option>
                      <option value="All Batches">All Batches</option>
                      {["Lakshya", "Aadharshilla", "Basic", "Commerce"].map(
                        (b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        )
                      )}
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={assignToClassBatch}
                      disabled={!classLevel || !batch}
                      className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Assign & Publish
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

// Enhanced Question Picker Component
interface QuestionPickerProps {
  selected: string[];
  onChange(ids: string[]): void;
  classLevel?: string;
}

interface Question {
  _id: string;
  text: string;
  type: string;
  subject: string;
  chapter?: string;
  topic?: string;
  section?: string;
  marks?: number;
  difficulty?: string;
}

interface FilterOptions {
  subjects: string[];
  chapters: string[];
  topics: string[];
  sections: string[];
}

const QuestionPicker: React.FC<QuestionPickerProps> = ({
  selected,
  onChange,
  classLevel,
}) => {
  const [list, setList] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    subjects: [],
    chapters: [],
    topics: [],
    sections: [],
  });

  // Load filter options
  async function loadFilters() {
    if (!classLevel) return;
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append("subject", selectedSubject);

      const response = (await apiFetch(
        `/api/ai/questions/class/${classLevel}/filters?${params}`
      )) as { success: boolean; data: FilterOptions };

      if (response.success) {
        setFilterOptions(response.data);
      }
    } catch (error) {
      console.error("Failed to load filters:", error);
    }
  }

  async function loadQuestions() {
    if (!classLevel) {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (selectedSubject) params.append("subject", selectedSubject);
      if (selectedChapter) params.append("chapter", selectedChapter);
      if (selectedTopic) params.append("topic", selectedTopic);
      if (selectedSection) params.append("section", selectedSection);

      const response = (await apiFetch(
        `/api/ai/questions/class/${classLevel}?${params}`
      )) as { success: boolean; data: { questions: Question[] } };

      if (response.success) {
        setList(response.data.questions || []);
      } else {
        setList([]);
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (classLevel) {
      loadFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classLevel, selectedSubject]);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    classLevel,
    selectedSubject,
    selectedChapter,
    selectedTopic,
    selectedSection,
  ]);

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    setSelectedChapter("");
    setSelectedTopic("");
    setSelectedSection("");
  }, [selectedSubject]);

  useEffect(() => {
    setSelectedTopic("");
    setSelectedSection("");
  }, [selectedChapter]);

  useEffect(() => {
    setSelectedSection("");
  }, [selectedTopic]);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const displayedQuestions = showAll ? list : list.slice(0, 10);

  const selectAll = () => {
    const allIds = list.map((q) => q._id);
    onChange([...new Set([...selected, ...allIds])]);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      {!classLevel ? (
        <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-lg">
          <svg
            className="w-12 h-12 text-amber-500 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="font-medium text-amber-900 mb-1">No Class Selected</p>
          <p className="text-sm text-amber-700">
            Please select a class above to load questions from that class&apos;s
            question bank
          </p>
        </div>
      ) : (
        <>
          {/* Filter Panel */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <h5 className="font-semibold text-purple-900">
                Filter Questions (Class {classLevel})
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-white text-sm"
              >
                <option value="">All Subjects</option>
                {filterOptions.subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                disabled={!selectedSubject}
                className="px-3 py-2 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Chapters</option>
                {filterOptions.chapters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={!selectedChapter}
                className="px-3 py-2 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Topics</option>
                {filterOptions.topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedTopic}
                className="px-3 py-2 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Sections</option>
                {filterOptions.sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={loadQuestions}
                disabled={loading}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
              >
                {loading ? (
                  <InlineLoader />
                ) : (
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
                )}
                Refresh
              </motion.button>
              <button
                onClick={selectAll}
                disabled={list.length === 0}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                disabled={selected.length === 0}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                {selected.length} selected
              </div>
              <div className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                {list.length} available
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {loading && (
              <div className="p-8 text-center text-slate-500">
                <InlineLoader className="mb-2" />
                <p>Loading questions...</p>
              </div>
            )}

            {!loading && (
              <>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {displayedQuestions.map((question) => (
                    <motion.label
                      key={question._id}
                      className="flex items-start gap-3 p-4 cursor-pointer hover:bg-purple-50/50 transition-colors"
                      whileHover={{ x: 2 }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(question._id)}
                        onChange={() => toggle(question._id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 mb-2 line-clamp-2">
                          <MathText text={question.text} inline />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                            {question.type}
                          </span>
                          {question.subject && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {question.subject}
                            </span>
                          )}
                          {question.chapter && (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                              {question.chapter}
                            </span>
                          )}
                          {question.topic && (
                            <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                              {question.topic}
                            </span>
                          )}
                          {question.marks && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {question.marks} marks
                            </span>
                          )}
                          {question.difficulty && (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                question.difficulty === "easy"
                                  ? "bg-green-100 text-green-700"
                                  : question.difficulty === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {question.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.label>
                  ))}
                </div>

                {list.length > 10 && !showAll && (
                  <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                    <button
                      onClick={() => setShowAll(true)}
                      className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-white transition-colors font-medium"
                    >
                      Show {list.length - 10} more questions
                    </button>
                  </div>
                )}

                {showAll && list.length > 10 && (
                  <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                    <button
                      onClick={() => setShowAll(false)}
                      className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-white transition-colors font-medium"
                    >
                      Show less
                    </button>
                  </div>
                )}
              </>
            )}

            {!loading && list.length === 0 && (
              <div className="p-12 text-center text-slate-500">
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
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No questions found
                </h3>
                <p className="text-slate-600 mb-4">
                  {selectedSubject ||
                  selectedChapter ||
                  selectedTopic ||
                  selectedSection
                    ? "Try adjusting your filters or select a different class"
                    : "No questions available for Class " + classLevel}
                </p>
                {(selectedSubject ||
                  selectedChapter ||
                  selectedTopic ||
                  selectedSection) && (
                  <button
                    onClick={() => {
                      setSelectedSubject("");
                      setSelectedChapter("");
                      setSelectedTopic("");
                      setSelectedSection("");
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
