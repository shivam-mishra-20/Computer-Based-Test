"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  listPapers,
  deletePaper as delPaper,
  updatePaper as updPaper,
  generateSolutions as genSols,
} from "@/lib/teacher";
import { Modal } from "../ui/modal";
import { notify } from "../ui/toast";
import { MathText } from "../ui/MathText";
import { apiFetch } from "@/lib/api";
import {
  DocumentTextIcon,
  SparklesIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  AcademicCapIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

type Paper = {
  _id: string;
  examTitle: string;
  subject?: string;
  totalMarks?: number;
  generalInstructions: string[];
  sections: Array<{
    title: string;
    instructions?: string;
    marksPerQuestion?: number;
    questions: Array<{
      text: string;
      type: string;
      options?: Array<{ text: string; isCorrect?: boolean }>;
      explanation?: string;
    }>;
  }>;
  solutions?: {
    generatedAt: string;
    sections: Array<{
      title: string;
      solutions: Array<{ solutionText: string }>;
    }>;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export default function QuestionPapers() {
  const router = useRouter();
  const [items, setItems] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Paper | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  async function load() {
    setLoading(true);
    try {
      const data = (await listPapers({ limit: 100 })) as unknown as {
        items: Paper[];
        total: number;
      };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      notify.error((e as Error).message || "Failed to load papers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.examTitle.toLowerCase().includes(q) ||
        (p.subject || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPapers = items.length;
    const withSolutions = items.filter((p) => p.solutions?.generatedAt).length;
    const totalQuestions = items.reduce(
      (sum, p) => sum + (p.sections?.flatMap((s) => s.questions).length || 0),
      0
    );
    return { totalPapers, withSolutions, totalQuestions };
  }, [items]);

  function view(p: Paper) {
    setSelected(p);
  }

  async function remove(id: string) {
    if (!confirm("Delete this paper?")) return;
    setDeleting(id);
    try {
      await delPaper(id);
      setItems((arr) => arr.filter((x) => x._id !== id));
      notify.success("Deleted");
    } catch (e) {
      notify.error((e as Error).message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function beginRename(p: Paper) {
    setRenaming(p._id);
    setNewTitle(p.examTitle);
  }

  async function saveRename(p: Paper) {
    if (!newTitle.trim()) return;
    try {
      const upd = (await updPaper(p._id, {
        title: newTitle.trim(),
        subject: p.subject || "",
        questions:
          p.sections?.flatMap((s) => s.questions.map((q) => q.text)) || [],
        // Add any other required fields for CreatePaperPayload here if needed
      })) as Paper;
      setItems((arr) =>
        arr.map((x) =>
          x._id === p._id ? { ...x, examTitle: upd.examTitle } : x
        )
      );
      setRenaming(null);
      notify.success("Renamed");
    } catch (e) {
      notify.error((e as Error).message || "Rename failed");
    }
  }

  async function generateSolutions(p: Paper) {
    if (generating) return; // Prevent multiple simultaneous generations

    setGenerating(p._id);
    try {
      notify.info("Generating solutions... This may take a moment.");
      const upd = (await genSols(p._id)) as Paper;

      // Update the specific paper in the list with new solutions
      setItems((arr) =>
        arr.map((x) =>
          x._id === p._id ? { ...x, solutions: upd.solutions || null } : x
        )
      );

      // If modal is open for this paper, update selected as well
      if (selected?._id === p._id) {
        setSelected({ ...p, solutions: upd.solutions || null });
      }

      notify.success("✅ Solutions generated successfully!");
    } catch (e) {
      console.error("Solution generation error:", e);
      const errorMessage =
        (e as Error).message || "Failed to generate solutions";
      notify.error(`Error: ${errorMessage}`);
    } finally {
      setGenerating(null);
    }
  }

  async function downloadPaper(p: Paper, type: "pdf" | "doc") {
    setDownloading(`${p._id}:${type}`);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const url = `${base}/api/papers/${p._id}/export/${type}${
        type === "pdf" ? "?solutions=true" : ""
      }`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to export");
      const contentType = res.headers.get("Content-Type") || "";
      if (type === "pdf" && !contentType.includes("application/pdf")) {
        // Do not download unexpected content like HTML; try to read message
        const text = await res.text().catch(() => "");
        throw new Error(text || "Export did not return a PDF");
      }
      if (
        type === "doc" &&
        !contentType.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) &&
        !contentType.includes("application/msword")
      ) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Export did not return a Word document");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slugify(p.examTitle)}.${type === "doc" ? "docx" : type}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      notify.error((e as Error).message || "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  async function createExamFromPaper(p: Paper) {
    try {
      const payload = {
        paper: {
          examTitle: p.examTitle,
          subject: p.subject,
          generalInstructions: p.generalInstructions,
          sections: p.sections,
        },
        options: {},
      };
      await apiFetch("/api/exams/from-paper", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      notify.success("Exam created from paper");
      router.push("/dashboard/teacher?tab=exams");
    } catch (e) {
      notify.error((e as Error).message || "Failed to create exam");
    }
  }

  function slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // client-side HTML builder removed; use server export endpoints

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Question Papers
              </h1>
              <p className="mt-2 text-blue-100">
                Manage and organize your AI-generated question papers
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg bg-white/20 px-6 py-3 font-semibold backdrop-blur-sm transition hover:bg-white/30 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="h-8 w-8 text-blue-200" />
                <div>
                  <p className="text-sm text-blue-100">Total Papers</p>
                  <p className="text-3xl font-bold">{stats.totalPapers}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-8 w-8 text-green-200" />
                <div>
                  <p className="text-sm text-blue-100">With Solutions</p>
                  <p className="text-3xl font-bold">{stats.withSolutions}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AcademicCapIcon className="h-8 w-8 text-purple-200" />
                <div>
                  <p className="text-sm text-blue-100">Total Questions</p>
                  <p className="text-3xl font-bold">{stats.totalQuestions}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or subject..."
            className="w-full pl-3 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              viewMode === "grid"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              viewMode === "list"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mt-8 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading question papers...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900">
            No Question Papers Found
          </h3>
          <p className="mt-2 text-gray-600">
            {query
              ? "Try adjusting your search"
              : "Get started by importing your first question paper using Smart Import!"}
          </p>
        </div>
      )}

      {/* Grid View */}
      {!loading && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl"
              >
                {/* Header */}
                <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {renaming === p._id ? (
                        <div className="space-y-2">
                          <input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                              onClick={() => saveRename(p)}
                            >
                              Save
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50"
                              onClick={() => setRenaming(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                            {p.examTitle}
                          </h3>
                          <div className="mt-3 space-y-1">
                            {p.subject && (
                              <p className="text-sm text-gray-600">
                                📚 {p.subject}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                                {p.sections?.length ?? 0} sections
                              </span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="h-3.5 w-3.5" />
                                {new Date(p.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Solution Status */}
                  <div className="mb-4">
                    {p.solutions?.generatedAt ? (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-700">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          Solutions Generated
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-amber-700">
                        <ClockIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          Solutions Pending
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Generate Solutions Button (if not generated) */}
                  {!p.solutions?.generatedAt && (
                    <button
                      onClick={() => generateSolutions(p)}
                      disabled={generating === p._id}
                      className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-semibold text-white transition hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                    >
                      <SparklesIcon className="h-5 w-5" />
                      {generating === p._id
                        ? "Generating Solutions..."
                        : "Generate Solutions"}
                    </button>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => view(p)}
                      className="flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Details
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => beginRename(p)}
                        disabled={renaming === p._id}
                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Rename
                      </button>
                      <button
                        onClick={() => downloadPaper(p, "pdf")}
                        disabled={downloading?.startsWith(p._id)}
                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                    <button
                      onClick={() => createExamFromPaper(p)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      Create Exam
                    </button>
                    <button
                      onClick={() => remove(p._id)}
                      disabled={deleting === p._id}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {deleting === p._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {!loading && filtered.length > 0 && viewMode === "list" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">
                    Sections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">
                    Solutions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {filtered.map((p) => (
                    <motion.tr
                      key={p._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        {renaming === p._id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              className="px-2 py-1 border rounded"
                            />
                            <button
                              className="text-primary-600 text-sm"
                              onClick={() => saveRename(p)}
                            >
                              Save
                            </button>
                            <button
                              className="text-gray-500 text-sm"
                              onClick={() => setRenaming(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {p.examTitle}
                            </span>
                            <span className="text-xs text-gray-400">
                              · {new Date(p.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell text-sm text-gray-700">
                        {p.subject || "-"}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-700">
                        {p.sections?.length ?? 0}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {p.solutions?.generatedAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200">
                            <CheckCircleIcon className="h-4 w-4" />
                            Generated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                            <ClockIcon className="h-4 w-4" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => view(p)}
                            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => beginRename(p)}
                            disabled={renaming === p._id}
                            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                            title="Rename"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {!p.solutions?.generatedAt && (
                            <button
                              onClick={() => generateSolutions(p)}
                              disabled={generating === p._id}
                              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                              title="Generate Solutions"
                            >
                              {generating === p._id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              ) : (
                                <SparklesIcon className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => createExamFromPaper(p)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            Exam
                          </button>
                          <button
                            onClick={() => downloadPaper(p, "pdf")}
                            disabled={downloading?.startsWith(p._id)}
                            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                            title="Download PDF"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => remove(p._id)}
                            disabled={deleting === p._id}
                            className="rounded-lg p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Viewing Paper Details */}
      <Modal
        title={selected?.examTitle || "Paper"}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        wide
      >
        {" "}
        {selected && (
          <div className="max-h-[65vh] overflow-y-auto pr-2">
            {/* Subject and Basic Info */}
            {selected.subject && (
              <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  <span className="font-semibold">Subject:</span>{" "}
                  {selected.subject}
                </p>
                {selected.totalMarks && (
                  <p className="text-sm text-blue-700 mt-1">
                    <span className="font-semibold">Total Marks:</span>{" "}
                    {selected.totalMarks}
                  </p>
                )}
              </div>
            )}

            {/* General Instructions */}
            {Array.isArray(selected.generalInstructions) &&
              selected.generalInstructions.length > 0 && (
                <div className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                    General Instructions
                  </h4>
                  <ol className="list-decimal ml-6 space-y-2 text-sm text-gray-700">
                    {selected.generalInstructions.map((instruction, idx) => (
                      <li key={idx}>
                        <MathText text={instruction} />
                      </li>
                    ))}
                  </ol>
                </div>
              )}

            {/* Sections with Questions and Solutions */}
            {selected.sections.map((sec, sIdx) => (
              <section
                key={sIdx}
                className="mb-8 pb-6 border-b border-gray-200 last:border-0"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {sIdx + 1}
                    </span>
                    {sec.title}
                  </h3>
                  {sec.marksPerQuestion && (
                    <span className="text-sm text-gray-600">
                      {sec.marksPerQuestion} marks each
                    </span>
                  )}
                </div>

                {/* Section Instructions */}
                {sec.instructions && (
                  <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 border border-amber-200">
                    <p className="text-sm text-amber-900">
                      <MathText text={sec.instructions} />
                    </p>
                  </div>
                )}

                {/* Questions */}
                <ol className="space-y-6">
                  {sec.questions.map((q, qIdx) => (
                    <li key={qIdx} className="ml-6">
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        {/* Question Text */}
                        <div className="mb-3">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                            {qIdx + 1}
                          </span>
                          <span className="font-medium text-gray-900">
                            <MathText text={q.text} />
                          </span>
                        </div>

                        {/* MCQ Options */}
                        {q.type === "mcq" &&
                          Array.isArray(q.options) &&
                          q.options.length > 0 && (
                            <div className="mb-3 ml-8 space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`rounded-lg px-3 py-2 text-sm ${
                                    opt.isCorrect
                                      ? "bg-green-50 border border-green-200 font-medium text-green-900"
                                      : "bg-gray-50 border border-gray-200 text-gray-700"
                                  }`}
                                >
                                  <span className="font-semibold mr-2">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <MathText text={opt.text} inline />
                                  {opt.isCorrect && (
                                    <CheckCircleIcon className="ml-2 inline h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Question Explanation */}
                        {q.explanation && (
                          <div className="ml-8 mb-3 rounded-lg bg-blue-50 px-4 py-3 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-1">
                              Explanation:
                            </p>
                            <div className="text-sm text-blue-800">
                              <MathText text={q.explanation} />
                            </div>
                          </div>
                        )}

                        {/* Solution */}
                        {selected.solutions?.sections?.[sIdx]?.solutions?.[qIdx]
                          ?.solutionText && (
                          <div className="ml-8 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-l-4 border-purple-500">
                            <div className="flex items-start gap-2">
                              <SparklesIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-purple-900 mb-2">
                                  AI Generated Solution:
                                </p>
                                <div className="text-sm text-gray-800 leading-relaxed">
                                  <MathText
                                    text={
                                      selected.solutions!.sections[sIdx]
                                        .solutions[qIdx].solutionText
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            {/* Solution Generation Status */}
            {!selected.solutions?.generatedAt && (
              <div className="mt-6 rounded-lg bg-amber-50 p-4 border border-amber-200 text-center">
                <ClockIcon className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                <p className="text-sm font-medium text-amber-900">
                  Solutions have not been generated for this paper yet.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Click &quot;Generate Solutions&quot; to create AI-powered
                  solutions for all questions.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
