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
            const resp = await fetch(`${baseUrl}/api/uploads/image`, {
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
    await onSaveSelected(Object.keys(cleaned).length ? cleaned : undefined);
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
            className="relative bg-white w-[95vw] max-w-5xl max-h-[85vh] rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Review Extracted Questions ({questions.length})
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                aria-label="Close preview"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onSelectAll}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={onDeselectAll}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Deselect All
                </button>
                {anySelected && (
                  <span className="text-sm text-gray-500">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 mr-2">
                  💡 Click &quot;Edit&quot; to mark correct answers for
                  auto-evaluation
                </div>
                {onApproveSelected && (
                  <button
                    onClick={onApproveSelected}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircleIcon className="w-4 h-4 inline mr-1" /> Approve
                    Selected
                  </button>
                )}
                <button
                  onClick={handleSaveSelected}
                  disabled={!anySelected}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    anySelected
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Save Selected to Question Bank
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {questions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No questions were extracted.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q._id}
                      className="p-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 text-emerald-600"
                          checked={selectedIds.has(q._id)}
                          onChange={() => onToggleSelect(q._id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">
                              Q{q.questionNumber ?? "?"}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              {(drafts[q._id]?.type || q.type).toUpperCase()}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 font-medium">
                                ⚠️ No Answer
                              </span>
                            )}
                          </div>
                          {/* View/Edit area */}
                          {drafts[q._id]?.isEditing ? (
                            <div className="space-y-2">
                              <label className="text-xs text-gray-600">
                                Question text (plain input; LaTeX auto on Done)
                              </label>
                              <textarea
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                rows={4}
                                value={drafts[q._id]?.plainText ?? ""}
                                placeholder="Type question normally, e.g. d/dx tan^{-1}(sqrt(1+x^2)-1/x) ="
                                onChange={(e) =>
                                  updateDraft(
                                    q._id,
                                    "plainText",
                                    e.target.value
                                  )
                                }
                              />
                              <div className="text-xs text-gray-500">
                                Preview:
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                                <MathText
                                  text={plainToLatex(
                                    drafts[q._id]?.plainText ||
                                      latexToPlain(q.text)
                                  )}
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600">
                                  Type
                                </label>
                                <select
                                  className="px-2 py-1 border rounded-lg text-sm"
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
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                      Options{" "}
                                      <span className="text-xs text-gray-500">
                                        (Check the correct answer)
                                      </span>
                                    </span>
                                    <button
                                      className="text-xs text-emerald-600 hover:underline font-medium"
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
                                        className="mt-2 w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
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
                                      <div className="flex-1">
                                        <input
                                          type="text"
                                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                          value={opt.text || ""}
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
                                        <div className="text-xs text-gray-500 mt-1">
                                          Preview:{" "}
                                          <MathText text={opt.text} inline />
                                        </div>
                                      </div>
                                      <button
                                        className="text-xs text-red-600 hover:underline"
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
                                    <span className="text-sm font-medium text-gray-700">
                                      Correct Answer
                                    </span>
                                  </div>
                                  <div className="flex gap-4">
                                    {[
                                      { text: "True", value: true },
                                      { text: "False", value: false },
                                    ].map((opt, idx) => (
                                      <label
                                        key={idx}
                                        className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
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
                                          className="w-4 h-4 text-green-600"
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
                                        <span className="font-medium text-gray-900">
                                          {opt.text}
                                        </span>
                                        {(drafts[q._id]?.options ||
                                          q.options ||
                                          [])[idx]?.isCorrect && (
                                          <CheckCircleIcon className="w-4 h-4 text-green-600 ml-auto" />
                                        )}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">
                                    Correct Answer{" "}
                                    <span className="text-xs text-gray-500">
                                      (Required for auto-evaluation)
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                                  <div className="text-xs text-gray-500">
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
                              <div className="mt-2 flex items-center gap-3 flex-wrap">
                                <label className="text-xs text-gray-500">
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
                                  className="text-xs"
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

                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                                  onClick={() => finalizeEdit(q._id)}
                                >
                                  Done (Convert to LaTeX)
                                </button>
                                <button
                                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                                  onClick={() => cancelEdit(q._id)}
                                >
                                  Cancel
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
                                    <div className="text-gray-900">
                                      <MathText text={viewText} />
                                    </div>
                                    {(viewType === "mcq" ||
                                      viewType === "truefalse") &&
                                      Array.isArray(viewOptions) &&
                                      viewOptions.length > 0 && (
                                        <div className="mt-3">
                                          <div className="text-xs font-semibold text-gray-600 mb-1.5">
                                            OPTIONS:
                                          </div>
                                          <ul className="space-y-1.5 text-sm">
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
                                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <div className="text-xs font-semibold text-green-700 mb-1">
                                            CORRECT ANSWER:
                                          </div>
                                          <div className="text-sm text-green-900 font-medium">
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
                                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                          <div className="text-xs font-medium text-orange-700">
                                            ⚠️ No correct answer provided. Click
                                            &quot;Edit&quot; to add one for
                                            auto-evaluation.
                                          </div>
                                        </div>
                                      )}
                                  </>
                                );
                              })()}

                              {/* Edit toggle */}
                              <div className="mt-3 flex gap-2">
                                <button
                                  className="px-4 py-2 text-sm font-medium border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
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
// Very lightweight heuristics; can be extended for more coverage.
function latexToPlain(latex: string): string {
  if (!latex) return "";
  let s = latex.replace(/\$/g, ""); // drop $ wrappers
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  s = s.replace(/\\int/g, "int");
  s = s.replace(/\\cdot/g, "*");
  s = s.replace(/\\pi/g, "pi");
  s = s.replace(/\\left\s*\(|\\right\s*\)/g, "");
  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function plainToLatex(input: string): string {
  if (!input) return "";
  let s = input.trim();
  // Fractions: (a/b) -> \frac{a}{b} for simple tokens
  s = s.replace(/\(([^()\s]+)\/([^()\s]+)\)/g, "\\frac{$1}{$2}");
  // sqrt(x) -> \sqrt{x}
  s = s.replace(/sqrt\(([^()]+)\)/g, "\\sqrt{$1}");
  // Derivative d/dx -> \frac{d}{dx}
  s = s.replace(/d\s*\/\s*d([a-zA-Z])/g, "\\frac{d}{d$1}");
  // Powers: x^2 or x^10 -> add braces if exponent has more than one char
  s = s.replace(/([a-zA-Z0-9])\^([a-zA-Z0-9]+)/g, (m, base, exp) => {
    if (exp.length > 1) return `${base}^{${exp}}`;
    return `${base}^${exp}`;
  });
  // Greek common
  const greek: Record<string, string> = {
    alpha: "\\alpha",
    beta: "\\beta",
    gamma: "\\gamma",
    delta: "\\delta",
    theta: "\\theta",
    lambda: "\\lambda",
    pi: "\\pi",
    sigma: "\\sigma",
    omega: "\\omega",
  };
  s = s.replace(
    /\b(alpha|beta|gamma|delta|theta|lambda|pi|sigma|omega)\b/g,
    (_, g) => greek[g]
  );
  // Replace int with \int (avoid word boundaries inside words)
  s = s.replace(/\bint\b/g, "\\int");
  // Clean extra spaces
  s = s.replace(/\s+/g, " ").trim();
  // Wrap inline math candidates containing \frac, \sqrt, ^, _ , \int etc. in $ ... $
  if (/\\frac|\\sqrt|\^|\\int|\\alpha|\\beta|\\gamma|\\pi/.test(s)) {
    s = `$${s}$`;
  }
  return s;
}
