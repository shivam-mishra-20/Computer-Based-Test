"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Modal } from "../ui/modal";
import { notify } from "../ui/toast";
import { Table, THead, TBody, TR, TH, TD } from "../ui/table";
import { Skeleton } from "../ui/skeleton";

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
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Question Bank</h2>
        <div className="flex gap-2 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="border rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={onCreate}
            className="px-3 py-2 rounded-md bg-primary text-white text-sm"
          >
            New
          </button>
        </div>
      </div>
      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm relative">
        <Table>
          <THead>
            <TR>
              <TH style={{ width: "40%" }}>Text</TH>
              <TH>Subject</TH>
              <TH>Topic</TH>
              <TH>Difficulty</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {loading && (
              <TR>
                <TD colSpan={5}>
                  <div className="py-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </TD>
              </TR>
            )}
            {!loading &&
              questions.map((q) => (
                <TR key={q._id} className="border-t hover:bg-gray-50">
                  <TD className="max-w-xs truncate" title={q.text}>
                    {q.text}
                  </TD>
                  <TD>{q.tags?.subject || "-"}</TD>
                  <TD>{q.tags?.topic || "-"}</TD>
                  <TD className="capitalize">{q.tags?.difficulty || "-"}</TD>
                  <TD className="text-right space-x-2">
                    <button
                      onClick={() => onEdit(q)}
                      className="text-xs text-primary underline"
                    >
                      Edit
                    </button>
                    <button
                      disabled={deletingId === q._id}
                      onClick={() => onDelete(q._id)}
                      className="text-xs text-red-600 underline disabled:opacity-50"
                    >
                      {deletingId === q._id ? "..." : "Delete"}
                    </button>
                  </TD>
                </TR>
              ))}
            {!loading && !questions.length && (
              <TR>
                <TD colSpan={5} className="px-3 py-4 text-center text-gray-400">
                  No questions
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
      <Modal
        title={draft._id ? "Edit Question" : "New Question"}
        open={open}
        onOpenChange={setOpen}
        wide
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-md border text-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-primary text-white text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form onSubmit={saveDraft} className="space-y-4" id="question-form">
          <div className="space-y-1">
            <label className="text-xs font-medium">Question Text</label>
            <textarea
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              className="w-full border rounded-md p-2 text-sm h-24"
              required
            />
          </div>
          <div className="grid sm:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-medium">Type</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="border rounded-md px-2 py-1 w-full"
              >
                <option value="mcq">MCQ</option>
                <option value="truefalse">True/False</option>
                <option value="short">Short</option>
                <option value="long">Long</option>
                <option value="fill">Fill</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Subject</label>
              <input
                value={draft.tags?.subject || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tags: { ...draft.tags, subject: e.target.value },
                  })
                }
                className="border rounded-md px-2 py-1 w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Topic</label>
              <input
                value={draft.tags?.topic || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tags: { ...draft.tags, topic: e.target.value },
                  })
                }
                className="border rounded-md px-2 py-1 w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Difficulty</label>
              <select
                value={draft.tags?.difficulty || "medium"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tags: { ...draft.tags, difficulty: e.target.value },
                  })
                }
                className="border rounded-md px-2 py-1 w-full"
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </div>
          </div>
          {draft.type === "mcq" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Options</label>
                <button
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
                  className="text-xs text-primary underline"
                >
                  Add Option
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {draft.options?.map((o, i) => (
                  <div
                    key={i}
                    className={`border rounded-md p-2 space-y-1 relative ${
                      o.isCorrect ? "border-green-500" : "border-gray-200"
                    }`}
                  >
                    <input
                      value={o.text}
                      onChange={(e) =>
                        updateOption(i, { text: e.target.value })
                      }
                      placeholder={`Option ${i + 1}`}
                      className="w-full text-sm outline-none"
                    />
                    <div className="flex items-center justify-between text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCorrect(i)}
                        className={`px-2 py-0.5 rounded border ${
                          o.isCorrect
                            ? "bg-green-500 text-white border-green-500"
                            : "border-gray-300"
                        }`}
                      >
                        {o.isCorrect ? "Correct" : "Mark Correct"}
                      </button>
                      {draft.options && draft.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              options: d.options?.filter((_, idx) => idx !== i),
                            }))
                          }
                          className="text-red-600 underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Explanation (optional)
            </label>
            <textarea
              value={draft.explanation || ""}
              onChange={(e) =>
                setDraft({ ...draft, explanation: e.target.value })
              }
              className="w-full border rounded-md p-2 text-sm h-20"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
