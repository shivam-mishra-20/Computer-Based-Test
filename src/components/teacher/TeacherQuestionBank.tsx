"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import { Modal } from "../ui/modal";
import { notify } from "../ui/toast";
//import { Table, THead, TBody, TR, TH, TD } from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle,
  BookOpen,
  Tag,
  BarChart3,
} from "lucide-react";

interface QuestionOption {
  _id?: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  _id: string;
  text: string;
  type: string;
  tags?: { subject?: string; topic?: string; difficulty?: string };
  options?: QuestionOption[];
  explanation?: string;
}

type Draft = Omit<Question, "_id"> & { _id?: string };

const emptyDraft = (): Draft => ({
  text: "",
  type: "mcq",
  tags: { subject: "", topic: "", difficulty: "medium" },
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  explanation: "",
});

const difficultyColors = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

const typeLabels = {
  mcq: "Multiple Choice",
  truefalse: "True/False",
  short: "Short Answer",
  long: "Long Answer",
  fill: "Fill in the Blank",
};

export default function TeacherQuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiFetch(
        `/api/exams/questions${query ? `?q=${encodeURIComponent(query)}` : ""}`
      )) as { items: Question[]; total: number };
      setQuestions(data.items || []);
    } catch {
      setQuestions([]);
      notify.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  function onCreate() {
    setDraft(emptyDraft());
    setOpen(true);
  }

  function onEdit(q: Question) {
    setDraft({ ...q });
    setOpen(true);
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.text.trim()) {
      notify.error("Question text required");
      return;
    }
    if (draft.type === "mcq") {
      const correct = draft.options?.some((o) => o.isCorrect);
      if (!correct) {
        notify.error("Select a correct option");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = { ...draft } as Draft;
      if (draft._id) {
        await apiFetch(`/api/exams/questions/${draft._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        notify.success("Question updated");
      } else {
        await apiFetch(`/api/exams/questions`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        notify.success("Question created");
      }
      setOpen(false);
      await load();
    } catch (e) {
      notify.error((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/exams/questions/${id}`, { method: "DELETE" });
      notify.success("Deleted");
      setQuestions((qs) => qs.filter((q) => q._id !== id));
    } catch (e) {
      notify.error((e as Error).message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function updateOption(idx: number, patch: Partial<QuestionOption>) {
    setDraft((d) => ({
      ...d,
      options: d.options?.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    }));
  }

  function setCorrect(idx: number) {
    setDraft((d) => ({
      ...d,
      options: d.options?.map((o, i) => ({ ...o, isCorrect: i === idx })),
    }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-8xl mx-auto p-4 sm:p-6 lg:p-2"
    >
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          Question Bank
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-600"
        >
          Manage and organize your exam questions
        </motion.p>
      </div>

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreate}
          className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Question
        </motion.button>
      </motion.div>

      {/* Questions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                  Subject
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                  Topic
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={6} className="px-6 py-8">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                      </div>
                    </td>
                  </motion.tr>
                ) : questions.length > 0 ? (
                  questions.map((q, index) => (
                    <motion.tr
                      key={q._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-xs lg:max-w-md">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {q.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1 sm:hidden">
                            <span className="text-xs text-gray-500">
                              {typeLabels[q.type as keyof typeof typeLabels]}
                            </span>
                            {q.tags?.subject && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">
                                  {q.tags.subject}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">
                          {typeLabels[q.type as keyof typeof typeLabels]}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-600">
                          {q.tags?.subject || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">
                          {q.tags?.topic || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            difficultyColors[
                              q.tags
                                ?.difficulty as keyof typeof difficultyColors
                            ] || difficultyColors.medium
                          }`}
                        >
                          {q.tags?.difficulty || "medium"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onEdit(q)}
                            className="p-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={deletingId === q._id}
                            onClick={() => onDelete(q._id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === q._id ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              >
                                <Circle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No questions found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Create your first question to get started
                      </p>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal */}
      <Modal
        title={draft._id ? "Edit Question" : "Create New Question"}
        open={open}
        onOpenChange={setOpen}
        wide
        footer={
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveDraft}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Circle className="w-4 h-4" />
                  </motion.div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Question
                </>
              )}
            </motion.button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Question Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Question Text
            </label>
            <textarea
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              rows={4}
              placeholder="Enter your question here..."
              required
            />
          </motion.div>

          {/* Question Properties */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Type
              </label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Subject
              </label>
              <input
                value={draft.tags?.subject || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tags: { ...draft.tags, subject: e.target.value },
                  })
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g., Mathematics"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Topic
              </label>
              <input
                value={draft.tags?.topic || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tags: { ...draft.tags, topic: e.target.value },
                  })
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g., Algebra"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Difficulty
              </label>
              <select
                value={draft.tags?.difficulty || "medium"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tags: { ...draft.tags, difficulty: e.target.value },
                  })
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </motion.div>

          {/* MCQ Options */}
          {draft.type === "mcq" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">
                  Answer Options
                </label>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      options: [
                        ...(d.options || []),
                        { text: "", isCorrect: false },
                      ],
                    }))
                  }
                  className="text-sm text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </motion.button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {draft.options?.map((o, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`relative border-2 rounded-xl p-4 transition-all ${
                        o.isCorrect
                          ? "border-green-500 bg-green-50/50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        value={o.text}
                        onChange={(e) =>
                          updateOption(i, { text: e.target.value })
                        }
                        placeholder={`Option ${i + 1}`}
                        className="w-full text-sm bg-transparent outline-none placeholder-gray-400"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setCorrect(i)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                            o.isCorrect
                              ? "bg-green-500 text-white"
                              : "border border-gray-300 text-gray-600 hover:border-green-500 hover:text-green-600"
                          }`}
                        >
                          {o.isCorrect ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Circle className="w-3.5 h-3.5" />
                          )}
                          {o.isCorrect ? "Correct Answer" : "Mark as Correct"}
                        </motion.button>
                        {draft.options && draft.options.length > 2 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                options: d.options?.filter(
                                  (_, idx) => idx !== i
                                ),
                              }))
                            }
                            className="text-red-500 hover:text-red-600 text-xs font-medium transition-colors"
                          >
                            Remove
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <label className="text-sm font-semibold text-gray-700">
              Explanation{" "}
              <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              value={draft.explanation || ""}
              onChange={(e) =>
                setDraft({ ...draft, explanation: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              rows={3}
              placeholder="Provide an explanation for the correct answer..."
            />
          </motion.div>
        </div>
      </Modal>
    </motion.div>
  );
}
