"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MathText from "@/components/ui/MathText";
import {
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export type PreviewQuestion = {
  _id: string;
  questionNumber?: number;
  text: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  options?: { text: string; isCorrect: boolean }[];
  correctAnswerText?: string;
  diagramUrl?: string;
};

// Override now also carries transient editing helpers (not sent to backend)
type Override = Partial<
  Pick<
    PreviewQuestion,
    "text" | "type" | "options" | "correctAnswerText" | "diagramUrl"
  > & {
    isEditing?: boolean; // whether this question is currently being edited
    plainText?: string; // user-friendly plain input (auto-converted to LaTeX on Done)
    marks?: number; // marks for this question (1-5)
  }
>;

// Clean override type without transient fields
type CleanOverride = Omit<Override, "isEditing" | "plainText">;

interface SmartImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: PreviewQuestion[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApproveSelected?: () => void;
  // Pass per-question overrides (text/type/options/answers/diagramUrl) back to parent save
  onSaveSelected: (
    overrides?: Record<string, Override>
  ) => Promise<void> | void;
  onClearStorage?: () => void;
}

export default function SmartImportPreviewModal({
  isOpen,
  onClose,
  questions,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onApproveSelected,
  onSaveSelected,
  onClearStorage,
}: SmartImportPreviewModalProps) {
  const anySelected = selectedIds.size > 0;

  // Local editable drafts and pending diagram files
  const [drafts, setDrafts] = useState<Record<string, Override>>({});
  const [diagramFiles, setDiagramFiles] = useState<
    Record<string, File | undefined>
  >({});

  const baseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000",
    []
  );

  function startEdit(id: string) {
    const q = questions.find((x) => x._id === id);
    if (!q) return;
    const existing = drafts[id];
    const baseText = existing?.text ?? q.text;
    setDrafts((d) => ({
      ...d,
      [id]: {
        // keep any previous overrides if present
        text: existing?.text ?? q.text,
        type: existing?.type ?? q.type,
        options: existing?.options
          ? existing.options.map((o) => ({ ...o }))
          : q.options
          ? q.options.map((o) => ({ ...o }))
          : undefined,
        correctAnswerText: existing?.correctAnswerText ?? q.correctAnswerText,
        diagramUrl: existing?.diagramUrl ?? q.diagramUrl,
        // reset plainText each time user enters edit mode
        plainText: latexToPlain(baseText || ""),
        isEditing: true,
      },
    }));
  }

  function updateDraft<K extends keyof Override>(
    id: string,
    key: K,
    value: NonNullable<Override[K]>
  ) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), [key]: value } }));
  }

  function cancelEdit(id: string) {
    // Revert editing state but keep existing overrides (text stays LaTeX original)
    setDrafts((d) => ({
      ...d,
      [id]: d[id]
        ? {
            ...d[id],
            isEditing: false,
            plainText: undefined, // drop plain text helper
          }
        : d[id],
    }));
    setDiagramFiles((m) => ({ ...m, [id]: undefined }));
  }

  function finalizeEdit(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    // Transform plainText to LaTeX and store in text
    const sourcePlain = draft.plainText ?? latexToPlain(draft.text || "");
    const latex = plainToLatex(sourcePlain);
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...d[id],
        text: latex,
        plainText: undefined,
        isEditing: false,
      },
    }));
  }

  async function handleSaveSelected() {
    // Upload diagrams (if any) first to get URLs
    const uploads: Array<Promise<void>> = [];
    const overrides: Record<string, Override> = { ...drafts };
    for (const id of selectedIds) {
      const file = diagramFiles[id];
      if (file) {
        uploads.push(
          (async () => {
            const form = new FormData();
            form.append("image", file);
            const resp = await fetch(`${baseUrl}/uploads/image`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${
                  localStorage.getItem("accessToken") || ""
                }`,
              },
              body: form,
            });
            if (!resp.ok) return; // don't block other saves
            const data = await resp.json();
            const url: string | undefined = data?.url;
            if (url) {
              overrides[id] = { ...(overrides[id] || {}), diagramUrl: url };
            }
          })()
        );
      }
    }
    await Promise.allSettled(uploads);
    // Strip transient fields before sending
    const cleaned: Record<string, CleanOverride> = {};
    for (const [id, ov] of Object.entries(overrides)) {
      if (!selectedIds.has(id)) continue;
      if (!ov) continue;
      // Remove transient fields without using 'any'
      const rest = { ...ov } as CleanOverride & {
        isEditing?: boolean;
        plainText?: string;
      };
      delete rest.isEditing;
      delete rest.plainText;
      cleaned[id] = rest as CleanOverride;
    }
    
    try {
      await onSaveSelected(Object.keys(cleaned).length ? cleaned : undefined);
      // Successfully saved - clear storage and close modal
      if (onClearStorage) {
        onClearStorage();
      }
      onClose();
    } catch (error) {
      console.error("Failed to save questions:", error);
      // Don't close modal on error - let user retry
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white w-full h-full sm:w-[95vw] sm:max-w-5xl sm:max-h-[85vh] sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900">
                  Review Questions ({questions.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (window.confirm('Discard all questions without saving? This cannot be undone.')) {
                      onClearStorage?.();
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 text-xs sm:text-sm text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg font-medium transition-colors"
                  aria-label="Discard and close"
                >
                  Discard & Close
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                  aria-label="Close preview"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-3 sm:px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={onSelectAll}
                  className="text-xs sm:text-sm text-blue-600 hover:underline font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={onDeselectAll}
                  className="text-xs sm:text-sm text-gray-600 hover:underline font-medium"
                >
                  Deselect All
                </button>
                {anySelected && (
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="hidden md:block text-xs text-gray-500 mr-2">
                  💡 Click &quot;Edit&quot; to mark correct answers
                </div>
                {onApproveSelected && (
                  <button
                    onClick={onApproveSelected}
                    className="px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium whitespace-nowrap flex items-center justify-center gap-1"
                  >
                    <CheckCircleIcon className="w-4 h-4" /> Approve Selected
                  </button>
                )}
                <button
                  onClick={handleSaveSelected}
                  disabled={!anySelected}
                  className={`px-4 py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors whitespace-nowrap ${
                    anySelected
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Save Selected
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-2 sm:p-4">
              {questions.length === 0 ? (
                <div className="p-4 sm:p-8 text-center text-gray-500">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No questions were extracted.</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q._id}
                      className="p-2 sm:p-3 rounded-lg sm:rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 text-emerald-600"
                          checked={selectedIds.has(q._id)}
                          onChange={() => onToggleSelect(q._id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-emerald-100 text-emerald-800 font-medium">
                              Q{q.questionNumber ?? "?"}
                            </span>
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-gray-100 text-gray-700 font-medium">
                              {(drafts[q._id]?.type || q.type).toUpperCase()}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                                q.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : q.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {q.status}
                            </span>
                            {!hasCorrectAnswer({
                              ...q,
                              options: drafts[q._id]?.options ?? q.options,
                              correctAnswerText:
                                drafts[q._id]?.correctAnswerText ??
                                q.correctAnswerText,
                            }) && (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-orange-100 text-orange-700 font-medium">
                                ⚠️ No Answer
                              </span>
                            )}
                          </div>
                          {/* View/Edit area */}
                          {drafts[q._id]?.isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] sm:text-xs text-gray-600 font-medium">
                                  Question Text
                                </label>
                                <div className="text-[9px] sm:text-[10px] text-gray-500 bg-blue-50 px-2 py-1 rounded">
                                  💡 Tip: Type naturally - we&apos;ll format math automatically
                                </div>
                              </div>
                              <textarea
                                className="w-full px-2 sm:px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                rows={5}
                                value={drafts[q._id]?.plainText ?? ""}
                                placeholder="Examples:&#10;• Fractions: (a/b) or sqrt(x+2)&#10;• Powers: x^2 or x^{10}&#10;• Greek: alpha, beta, pi&#10;• Symbols: >= or <=&#10;• Already LaTeX? Keep as-is!"
                                onChange={(e) =>
                                  updateDraft(
                                    q._id,
                                    "plainText",
                                    e.target.value
                                  )
                                }
                              />
                              
                              {/* Quick reference guide */}
                              <details className="text-[9px] sm:text-[10px] text-gray-600 bg-gray-50 rounded p-2">
                                <summary className="cursor-pointer font-semibold text-emerald-700 hover:text-emerald-800">
                                  📚 Math Input Quick Reference
                                </summary>
                                <div className="mt-2 space-y-1 pl-2">
                                  <div><strong>Fractions:</strong> {`(x+1/2) → $\\frac{x+1}{2}$`}</div>
                                  <div><strong>Roots:</strong> {`sqrt(x) → $\\sqrt{x}$`}</div>
                                  <div><strong>Powers:</strong> {`x^2, a^{10} → $x^2$, $a^{10}$`}</div>
                                  <div><strong>Subscripts:</strong> {`x_1, a_{10} → $x_1$, $a_{10}$`}</div>
                                  <div><strong>Greek:</strong> alpha, beta, theta, pi</div>
                                  <div><strong>Operators:</strong> × ÷ ± ≤ ≥ ≠ ≈</div>
                                  <div><strong>Trig:</strong> sin, cos, tan, log, ln</div>
                                  <div><strong>Calculus:</strong> d/dx, int, lim, ∞</div>
                                </div>
                              </details>
                              
                              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-3 rounded-lg border border-emerald-200">
                                <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold mb-1.5 flex items-center gap-1">
                                  <span>👀</span> Live Preview:
                                </div>
                                <div className="bg-white p-2 sm:p-3 rounded text-sm sm:text-base text-gray-900 border border-gray-200 min-h-[60px]">
                                  <MathText
                                    text={plainToLatex(
                                      drafts[q._id]?.plainText ||
                                        latexToPlain(q.text)
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-[10px] sm:text-xs text-gray-600 font-medium">
                                  Type
                                </label>
                                <select
                                  className="px-2 py-1 border rounded-lg text-xs sm:text-sm"
                                  value={drafts[q._id]?.type || q.type}
                                  onChange={(e) =>
                                    updateDraft(q._id, "type", e.target.value)
                                  }
                                >
                                  <option value="mcq">MCQ</option>
                                  <option value="truefalse">True/False</option>
                                  <option value="fill">Fill</option>
                                  <option value="short">Short</option>
                                  <option value="long">Long</option>
                                  <option value="assertionreason">
                                    Assertion-Reason
                                  </option>
                                  <option value="integer">Integer</option>
                                </select>
                              </div>

                              {(drafts[q._id]?.type || q.type) === "mcq" ? (
                                <div className="space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                                      Options{" "}
                                      <span className="text-[10px] sm:text-xs text-gray-500">
                                        (Check the correct answer)
                                      </span>
                                    </span>
                                    <button
                                      className="text-xs text-emerald-600 hover:underline font-medium self-start sm:self-auto"
                                      onClick={() => {
                                        const opts = (
                                          drafts[q._id]?.options ||
                                          q.options ||
                                          []
                                        ).map((o) => ({ ...o }));
                                        opts.push({
                                          text: "",
                                          isCorrect: false,
                                        });
                                        updateDraft(q._id, "options", opts);
                                      }}
                                    >
                                      + Add option
                                    </button>
                                  </div>
                                  {(
                                    drafts[q._id]?.options ||
                                    q.options ||
                                    []
                                  ).map((opt, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-start gap-2 p-2 rounded-lg border-2 transition-colors ${
                                        opt.isCorrect
                                          ? "border-green-400 bg-green-50"
                                          : "border-gray-200"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="mt-1.5 sm:mt-2 w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 flex-shrink-0"
                                        checked={!!opt.isCorrect}
                                        onChange={(e) => {
                                          const opts = (
                                            drafts[q._id]?.options ||
                                            q.options ||
                                            []
                                          ).map((o) => ({ ...o }));
                                          if (!opts[idx]) return;
                                          opts[idx] = {
                                            ...opts[idx],
                                            isCorrect: e.target.checked,
                                          };
                                          updateDraft(q._id, "options", opts);
                                        }}
                                        title="Mark as correct answer"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <input
                                          type="text"
                                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                          value={opt.text || ""}
                                          placeholder="Type option (supports math: x^2, (a/b))"
                                          onChange={(e) => {
                                            const opts = (
                                              drafts[q._id]?.options ||
                                              q.options ||
                                              []
                                            ).map((o) => ({ ...o }));
                                            if (!opts[idx]) return;
                                            opts[idx] = {
                                              ...opts[idx],
                                              text: e.target.value,
                                            };
                                            updateDraft(q._id, "options", opts);
                                          }}
                                        />
                                        <div className="text-[10px] sm:text-xs text-gray-500 mt-1 bg-white p-1 rounded border border-gray-200">
                                          Preview: <MathText text={plainToLatex(opt.text || "")} inline />
                                        </div>
                                      </div>
                                      <button
                                        className="text-[10px] sm:text-xs text-red-600 hover:underline flex-shrink-0 font-medium"
                                        onClick={() => {
                                          const opts = (
                                            drafts[q._id]?.options ||
                                            q.options ||
                                            []
                                          ).map((o) => ({ ...o }));
                                          opts.splice(idx, 1);
                                          updateDraft(q._id, "options", opts);
                                        }}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (drafts[q._id]?.type || q.type) ===
                                "truefalse" ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                                      Correct Answer
                                    </span>
                                  </div>
                                  <div className="flex gap-2 sm:gap-4">
                                    {[
                                      { text: "True", value: true },
                                      { text: "False", value: false },
                                    ].map((opt, idx) => (
                                      <label
                                        key={idx}
                                        className={`flex-1 flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                          (drafts[q._id]?.options ||
                                            q.options ||
                                            [])[idx]?.isCorrect
                                            ? "border-green-400 bg-green-50"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`tf-${q._id}`}
                                          className="w-4 h-4 text-green-600 flex-shrink-0"
                                          checked={
                                            !!(drafts[q._id]?.options ||
                                              q.options ||
                                              [])[idx]?.isCorrect
                                          }
                                          onChange={() => {
                                            const opts = [
                                              {
                                                text: "True",
                                                isCorrect: idx === 0,
                                              },
                                              {
                                                text: "False",
                                                isCorrect: idx === 1,
                                              },
                                            ];
                                            updateDraft(q._id, "options", opts);
                                          }}
                                        />
                                        <span className="text-sm sm:text-base font-medium text-gray-900">
                                          {opt.text}
                                        </span>
                                        {(drafts[q._id]?.options ||
                                          q.options ||
                                          [])[idx]?.isCorrect && (
                                          <CheckCircleIcon className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />
                                        )}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                                    Correct Answer{" "}
                                    <span className="text-[10px] sm:text-xs text-gray-500">
                                      (Required for auto-evaluation)
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Enter the correct answer..."
                                    value={
                                      drafts[q._id]?.correctAnswerText ??
                                      q.correctAnswerText ??
                                      ""
                                    }
                                    onChange={(e) =>
                                      updateDraft(
                                        q._id,
                                        "correctAnswerText",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <div className="text-[10px] sm:text-xs text-gray-500">
                                    Preview:{" "}
                                    <MathText
                                      text={
                                        (drafts[q._id]?.correctAnswerText ||
                                          q.correctAnswerText ||
                                          "") as string
                                      }
                                      inline
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Diagram upload */}
                              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <label className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                  Diagram:
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    setDiagramFiles((m) => ({
                                      ...m,
                                      [q._id]: file,
                                    }));
                                  }}
                                  className="text-[10px] sm:text-xs w-full sm:w-auto"
                                />
                                {(drafts[q._id]?.diagramUrl ||
                                  q.diagramUrl) && (
                                  <a
                                    href={
                                      drafts[q._id]?.diagramUrl || q.diagramUrl
                                    }
                                    className="text-xs text-blue-600 underline"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open current
                                  </a>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                                <button
                                  className="px-3 py-2 text-xs sm:text-sm border-2 border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50"
                                  onClick={() => finalizeEdit(q._id)}
                                >
                                  ✓ Done (Convert to LaTeX)
                                </button>
                                <button
                                  className="px-3 py-2 text-xs sm:text-sm border font-medium rounded-lg hover:bg-gray-50"
                                  onClick={() => cancelEdit(q._id)}
                                >
                                  ✕ Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {(() => {
                                const ov = drafts[q._id];
                                const viewText = ov?.text ?? q.text;
                                const viewType =
                                  (ov?.type ?? q.type) || "short";
                                const viewOptions = ov?.options ?? q.options;
                                const viewAnswer =
                                  ov?.correctAnswerText ?? q.correctAnswerText;
                                return (
                                  <>
                                    <div className="text-sm sm:text-base text-gray-900">
                                      <MathText text={viewText} />
                                    </div>
                                    {(viewType === "mcq" ||
                                      viewType === "truefalse") &&
                                      Array.isArray(viewOptions) &&
                                      viewOptions.length > 0 && (
                                        <div className="mt-2 sm:mt-3">
                                          <div className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1.5">
                                            OPTIONS:
                                          </div>
                                          <ul className="space-y-1.5 text-xs sm:text-sm">
                                            {viewOptions.map((o, i) => (
                                              <li
                                                key={i}
                                                className={`flex items-start gap-2 p-2 rounded-lg ${
                                                  o.isCorrect
                                                    ? "bg-green-50 border border-green-200 text-green-800 font-medium"
                                                    : "text-gray-700"
                                                }`}
                                              >
                                                <span className="font-semibold min-w-[20px]">
                                                  {String.fromCharCode(65 + i)}.
                                                </span>
                                                <MathText text={o.text} />
                                                {o.isCorrect && (
                                                  <CheckCircleIcon className="w-5 h-5 text-green-600 ml-auto flex-shrink-0" />
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    {viewType !== "mcq" &&
                                      viewType !== "truefalse" &&
                                      viewAnswer && (
                                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <div className="text-[10px] sm:text-xs font-semibold text-green-700 mb-1">
                                            CORRECT ANSWER:
                                          </div>
                                          <div className="text-xs sm:text-sm text-green-900 font-medium">
                                            <MathText
                                              text={viewAnswer}
                                              inline
                                            />
                                          </div>
                                        </div>
                                      )}
                                    {viewType !== "mcq" &&
                                      viewType !== "truefalse" &&
                                      !viewAnswer && (
                                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                          <div className="text-[10px] sm:text-xs font-medium text-orange-700">
                                            ⚠️ No correct answer provided. Click
                                            &quot;Edit&quot; to add one for
                                            auto-evaluation.
                                          </div>
                                        </div>
                                      )}
                                  </>
                                );
                              })()}

                              {/* Marks Assignment */}
                              <div className="mt-2 sm:mt-3 flex items-center gap-2 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="text-xs sm:text-sm font-semibold text-blue-900">
                                  Marks:
                                </span>
                                <div className="flex gap-1 sm:gap-2">
                                  {[1, 2, 3, 4, 5].map((mark) => (
                                    <button
                                      key={mark}
                                      onClick={() =>
                                        updateDraft(q._id, "marks", mark)
                                      }
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                                        (drafts[q._id]?.marks ?? 0) === mark
                                          ? "bg-blue-600 text-white shadow-md scale-110"
                                          : "bg-white text-blue-600 border border-blue-300 hover:bg-blue-100"
                                      }`}
                                    >
                                      {mark}
                                    </button>
                                  ))}
                                </div>
                                {drafts[q._id]?.marks && (
                                  <span className="text-xs text-blue-700 font-medium ml-auto">
                                    ✓ {drafts[q._id].marks} mark
                                    {drafts[q._id].marks! > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>

                              {/* Edit toggle */}
                              <div className="mt-2 sm:mt-3 flex gap-2">
                                <button
                                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                                  onClick={() => startEdit(q._id)}
                                >
                                  ✏️ Edit Question & Answer
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------ Helper Functions ------------------
// Check if question has correct answer marked
function hasCorrectAnswer(q: PreviewQuestion): boolean {
  if (q.type === "mcq") {
    return Array.isArray(q.options) && q.options.some((opt) => opt.isCorrect);
  } else if (q.type === "truefalse") {
    return Array.isArray(q.options) && q.options.some((opt) => opt.isCorrect);
  } else {
    return !!q.correctAnswerText && q.correctAnswerText.trim() !== "";
  }
}

// ------------------ Helper Conversion Functions ------------------
// Enhanced LaTeX conversion supporting complex middle school mathematics

/**
 * Convert LaTeX to plain text for editing
 * Supports algebra, factorization, division, and more (classes 8-10)
 */
function latexToPlain(latex: string): string {
  if (!latex) return "";
  let s = latex;
  
  // Remove outer $ delimiters
  s = s.replace(/^\$+|\$+$/g, "");
  
  // Fractions: \frac{a}{b} -> (a/b)
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)");
  
  // Square roots: \sqrt{x} -> sqrt(x), \sqrt[n]{x} -> nthroot(x)
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, "$1throot($2)");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  
  // Powers with braces: x^{2} -> x^2
  s = s.replace(/\^\\{([^}]+)\\}/g, "^$1");
  s = s.replace(/\^\\{([^}]+)\\}/g, "^($1)");
  
  // Subscripts with braces: x_{1} -> x_1
  s = s.replace(/\_\\{([^}]+)\\}/g, "_$1");
  
  // Greek letters
  const greekMap: Record<string, string> = {
    "\\alpha": "alpha", "\\beta": "beta", "\\gamma": "gamma",
    "\\delta": "delta", "\\theta": "theta", "\\lambda": "lambda",
    "\\pi": "pi", "\\sigma": "sigma", "\\omega": "omega",
    "\\mu": "mu", "\\nu": "nu", "\\phi": "phi", "\\psi": "psi"
  };
  Object.entries(greekMap).forEach(([tex, plain]) => {
    s = s.replace(new RegExp(tex.replace(/\\/g, "\\\\"), "g"), plain);
  });
  
  // Mathematical operators
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\div/g, "÷");
  s = s.replace(/\\cdot/g, "·");
  s = s.replace(/\\pm/g, "±");
  s = s.replace(/\\mp/g, "∓");
  
  // Comparison operators
  s = s.replace(/\\leq/g, "≤");
  s = s.replace(/\\geq/g, "≥");
  s = s.replace(/\\neq/g, "≠");
  s = s.replace(/\\approx/g, "≈");
  
  // Trigonometric functions
  s = s.replace(/\\sin/g, "sin");
  s = s.replace(/\\cos/g, "cos");
  s = s.replace(/\\tan/g, "tan");
  s = s.replace(/\\cot/g, "cot");
  s = s.replace(/\\sec/g, "sec");
  s = s.replace(/\\csc/g, "csc");
  
  // Calculus
  s = s.replace(/\\int/g, "∫");
  s = s.replace(/\\infty/g, "∞");
  s = s.replace(/\\lim/g, "lim");
  
  // Arrows
  s = s.replace(/\\rightarrow/g, "→");
  s = s.replace(/\\leftarrow/g, "←");
  s = s.replace(/\\Rightarrow/g, "⇒");
  
  // Parentheses
  s = s.replace(/\\left\s*\(|\\right\s*\)/g, "");
  s = s.replace(/\\left\s*\[|\\right\s*\]/g, "");
  s = s.replace(/\\left\s*\\{|\\right\s*\\}/g, "");
  
  // Text blocks
  s = s.replace(/\\text\{([^}]+)\}/g, "$1");
  
  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();
  
  return s;
}

/**
 * Convert plain text to LaTeX with enhanced mathematics support
 * Handles algebra, factorization, division (classes 8-10)
 */
function plainToLatex(input: string): string {
  if (!input) return "";
  let s = input.trim();
  
  // Preserve existing LaTeX if already present (check for $ symbols or LaTeX commands)
  if (s.includes("$") || s.includes("\\frac") || s.includes("\\sqrt") || s.includes("\\")) {
    // Already has LaTeX formatting, return as-is
    return s;
  }
  
  // Convert Unicode math symbols back to LaTeX
  s = s.replace(/×/g, "\\times ");
  s = s.replace(/÷/g, "\\div ");
  s = s.replace(/·/g, "\\cdot ");
  s = s.replace(/±/g, "\\pm ");
  s = s.replace(/∓/g, "\\mp ");
  s = s.replace(/≤/g, "\\leq ");
  s = s.replace(/≥/g, "\\geq ");
  s = s.replace(/≠/g, "\\neq ");
  s = s.replace(/≈/g, "\\approx ");
  s = s.replace(/∫/g, "\\int ");
  s = s.replace(/∞/g, "\\infty");
  s = s.replace(/→/g, "\\rightarrow ");
  s = s.replace(/←/g, "\\leftarrow ");
  s = s.replace(/⇒/g, "\\Rightarrow ");
  
  // Fractions: (a/b) -> \frac{a}{b}
  // Handle nested parentheses for complex fractions
  let prevS = "";
  let iterations = 0;
  while (s !== prevS && iterations < 10) {
    prevS = s;
    s = s.replace(/\(([^()]+)\/([^()]+)\)/g, "\\frac{$1}{$2}");
    iterations++;
  }
  
  // Simple fractions without parentheses: a/b -> \frac{a}{b} (for simple tokens)
  s = s.replace(/\b(\w+)\s*\/\s*(\w+)\b/g, "\\frac{$1}{$2}");
  
  // Derivative notation: d/dx -> \frac{d}{dx}
  s = s.replace(/d\s*\/\s*d([a-zA-Z])/g, "\\frac{d}{d$1}");
  s = s.replace(/∂\s*\/\s*∂([a-zA-Z])/g, "\\frac{\\partial}{\\partial $1}");
  
  // Square roots: sqrt(x) -> \sqrt{x}
  s = s.replace(/sqrt\(([^()]+)\)/g, "\\sqrt{$1}");
  s = s.replace(/√\(([^()]+)\)/g, "\\sqrt{$1}");
  
  // Nth roots: nthroot(x) -> \sqrt[n]{x}
  s = s.replace(/(\d+)throot\(([^()]+)\)/g, "\\sqrt[$1]{$2}");
  
  // Powers: x^2 or x^{10} -> ensure braces for multi-char exponents
  s = s.replace(/([a-zA-Z0-9)])\^([a-zA-Z0-9]+)/g, (m, base, exp) => {
    if (exp.length > 1 && !exp.startsWith("{")) {
      return `${base}^{${exp}}`;
    }
    return `${base}^${exp}`;
  });
  
  // Subscripts: x_1 -> x_{1} for multi-char subscripts
  s = s.replace(/([a-zA-Z0-9)])\\_([a-zA-Z0-9]+)/g, (m, base, sub) => {
    if (sub.length > 1 && !sub.startsWith("{")) {
      return `${base}_{${sub}}`;
    }
    return `${base}_${sub}`;
  });
  
  // Greek letters (whole word)
  const greekWords: Record<string, string> = {
    "alpha": "\\alpha", "beta": "\\beta", "gamma": "\\gamma",
    "delta": "\\delta", "theta": "\\theta", "lambda": "\\lambda",
    "pi": "\\pi", "sigma": "\\sigma", "omega": "\\omega",
    "mu": "\\mu", "nu": "\\nu", "phi": "\\phi", "psi": "\\psi"
  };
  Object.entries(greekWords).forEach(([word, tex]) => {
    s = s.replace(new RegExp(`\\b${word}\\b`, "gi"), tex);
  });
  
  // Trigonometric functions
  s = s.replace(/\bsin\b/g, "\\sin");
  s = s.replace(/\bcos\b/g, "\\cos");
  s = s.replace(/\btan\b/g, "\\tan");
  s = s.replace(/\bcot\b/g, "\\cot");
  s = s.replace(/\bsec\b/g, "\\sec");
  s = s.replace(/\bcsc\b/g, "\\csc");
  
  // Logarithms
  s = s.replace(/\blog\b/g, "\\log");
  s = s.replace(/\bln\b/g, "\\ln");
  
  // Limits
  s = s.replace(/\blim\b/g, "\\lim");
  
  // Integrals (if not already converted)
  s = s.replace(/\bint\b/g, "\\int");
  
  // Clean up extra spaces around operators
  s = s.replace(/\s*\\times\s*/g, " \\times ");
  s = s.replace(/\s*\\div\s*/g, " \\div ");
  s = s.replace(/\s+/g, " ").trim();
  
  // Wrap in $ if contains LaTeX commands
  if (/\\frac|\\sqrt|\\int|\\sum|\\alpha|\\beta|\\gamma|\\pi|\\theta|\\leq|\\geq|\^|_/.test(s)) {
    if (!s.startsWith("$")) {
      s = `$${s}$`;
    }
  }
  
  return s;
}
