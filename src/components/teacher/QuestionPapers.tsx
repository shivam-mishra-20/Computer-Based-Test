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
import { apiFetch } from "@/lib/api";

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
    setGenerating(p._id);
    try {
      const upd = (await genSols(p._id)) as Paper;
      setItems((arr) =>
        arr.map((x) =>
          x._id === p._id ? { ...x, solutions: upd.solutions || null } : x
        )
      );
      notify.success("Solutions generated");
    } catch (e) {
      notify.error((e as Error).message || "Generation failed");
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
      if (type === "doc" && !contentType.includes("application/msword")) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Export did not return a DOC file");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slugify(p.examTitle)}.${type}`;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Papers</h1>
          <p className="text-sm text-gray-600">
            History of AI-generated papers. Manage, generate solutions, and
            download.
          </p>
        </div>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or subject..."
            className="w-64 pl-3 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

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
                {loading ? (
                  <tr>
                    <td className="px-6 py-6" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-10 text-center text-gray-500"
                      colSpan={5}
                    >
                      No papers found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
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
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-200">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                            Not generated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => view(p)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                          >
                            View
                          </button>
                          {renaming === p._id ? null : (
                            <button
                              onClick={() => beginRename(p)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                            >
                              Rename
                            </button>
                          )}
                          <button
                            disabled={generating === p._id}
                            onClick={() => generateSolutions(p)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                          >
                            {generating === p._id
                              ? "Generating…"
                              : "Gen Solutions"}
                          </button>
                          <button
                            onClick={() => createExamFromPaper(p)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-green-200 text-green-700 hover:bg-green-50"
                          >
                            Create Exam
                          </button>
                          <div className="relative">
                            <button
                              disabled={downloading?.startsWith(p._id)}
                              onClick={() => downloadPaper(p, "pdf")}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                            >
                              Download PDF
                            </button>
                          </div>
                          <button
                            onClick={() => downloadPaper(p, "doc")}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                          >
                            Word
                          </button>
                          <button
                            disabled={deleting === p._id}
                            onClick={() => remove(p._id)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title={selected?.examTitle || "Paper"}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        wide
      >
        {selected && (
          <div className="max-h-[65vh] overflow-y-auto pr-2">
            <div className="mb-3 text-sm text-gray-600">
              {selected.subject ? `Subject: ${selected.subject}` : ""}
            </div>
            {Array.isArray(selected.generalInstructions) &&
              selected.generalInstructions.length > 0 && (
                <div className="mb-4">
                  <div className="font-medium text-gray-800">Instructions</div>
                  <ol className="list-decimal ml-6 text-sm text-gray-700">
                    {selected.generalInstructions.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ol>
                </div>
              )}
            {selected.sections.map((sec, sIdx) => (
              <section key={sIdx} className="mb-6">
                <h3 className="font-semibold text-gray-900">{sec.title}</h3>
                {sec.instructions && (
                  <div className="text-xs text-gray-500 mb-2">
                    {sec.instructions}
                  </div>
                )}
                <ol className="ml-5 list-decimal space-y-2">
                  {sec.questions.map((q, i) => (
                    <li key={i} className="text-sm text-gray-800">
                      <div>{q.text}</div>
                      {selected.solutions?.sections?.[sIdx]?.solutions?.[i]
                        ?.solutionText && (
                        <div className="mt-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2">
                          <strong>Solution:</strong>{" "}
                          {
                            selected.solutions!.sections[sIdx].solutions[i]
                              .solutionText
                          }
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
