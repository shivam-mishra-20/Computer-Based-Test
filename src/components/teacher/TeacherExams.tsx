"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Modal } from "../ui/modal";
import { notify } from "../ui/toast";
import { Table, THead, TBody, TR, TH, TD } from "../ui/table";
import { Skeleton } from "../ui/skeleton";
// (Question bank reused via QuestionPicker component below)

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
  const [assignList, setAssignList] = useState<string>(""); // comma separated user IDs

  async function load() {
    setLoading(true);
    try {
      const data = (await apiFetch("/api/exams")) as { items?: Exam[] };
      setExams(Array.isArray(data.items) ? data.items : []);
    } catch {
      setExams([]);
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
          title,
          description: "",
          totalDurationMins: 60,
          sections: [],
          isPublished: false,
        }),
      });
      setTitle("");
      await load();
      notify.success("Exam created");
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  }

  function openBuilder(ex: Exam) {
    setEditingExam(ex);
    setSectionDrafts(ex.sections || []);
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
    if (!confirm("Remove section?")) return;
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
      notify.success("Exam updated");
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
      notify.success(!ex.isPublished ? "Published" : "Unpublished");
      await load();
    } catch (e) {
      notify.error((e as Error).message || "Toggle failed");
    }
  }

  async function assignUsers() {
    if (!editingExam) return;
    const users = assignList
      .split(/[,\s]/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (!users.length) {
      notify.error("Enter user IDs");
      return;
    }
    try {
      await apiFetch(`/api/exams/${editingExam._id}/assign`, {
        method: "POST",
        body: JSON.stringify({ users }),
      });
      notify.success("Assigned");
      setAssignList("");
    } catch (e) {
      notify.error((e as Error).message || "Assign failed");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Exams</h2>
        <form onSubmit={onCreate} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New exam title"
            className="border rounded-md px-3 py-2 text-sm"
          />
          <button
            disabled={creating}
            className="px-4 py-2 rounded-md bg-primary text-white text-sm disabled:opacity-50"
          >
            {creating ? "Adding..." : "Add"}
          </button>
        </form>
      </div>
      <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Sections</TH>
              <TH>Published</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {loading && (
              <TR>
                <TD colSpan={4} className="px-3 py-3">
                  <Skeleton className="h-4 w-1/2" />
                </TD>
              </TR>
            )}
            {!loading &&
              exams.map((ex) => (
                <TR key={ex._id} className="border-t hover:bg-gray-50">
                  <TD>{ex.title}</TD>
                  <TD>{ex.sections?.length || 0}</TD>
                  <TD>{ex.isPublished ? "Yes" : "No"}</TD>
                  <TD className="text-right space-x-2">
                    <button
                      onClick={() => openBuilder(ex)}
                      className="text-xs text-primary underline"
                    >
                      Build
                    </button>
                    <button
                      onClick={() => togglePublish(ex)}
                      className="text-xs text-gray-700 underline"
                    >
                      {ex.isPublished ? "Unpublish" : "Publish"}
                    </button>
                  </TD>
                </TR>
              ))}
            {!loading && !exams.length && (
              <TR>
                <TD colSpan={4} className="px-3 py-4 text-center text-gray-400">
                  No exams
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>

      <Modal
        title={editingExam ? `Build: ${editingExam.title}` : "Exam Builder"}
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        wide
        footer={
          <>
            <button
              onClick={() => setBuilderOpen(false)}
              className="px-4 py-2 rounded-md border text-sm"
            >
              Close
            </button>
            <button
              disabled={saving}
              onClick={saveExamStructure}
              className="px-4 py-2 rounded-md bg-primary text-white text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Structure"}
            </button>
          </>
        }
      >
        {!editingExam && (
          <div className="text-sm text-gray-500">Select an exam to build.</div>
        )}
        {editingExam && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Sections</h3>
              <button
                onClick={addSection}
                className="text-xs text-primary underline"
                type="button"
              >
                Add Section
              </button>
            </div>
            <div className="space-y-4">
              {sectionDrafts.map((sec, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-md p-4 space-y-3 bg-white"
                >
                  <div className="flex gap-2 flex-wrap items-center">
                    <input
                      value={sec.title}
                      onChange={(e) =>
                        updateSection(i, { title: e.target.value })
                      }
                      className="border rounded-md px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={sec.sectionDurationMins || 0}
                      onChange={(e) =>
                        updateSection(i, {
                          sectionDurationMins: Number(e.target.value),
                        })
                      }
                      className="border rounded-md px-2 py-1 text-sm w-24"
                    />
                    <label className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={sec.shuffleQuestions}
                        onChange={(e) =>
                          updateSection(i, {
                            shuffleQuestions: e.target.checked,
                          })
                        }
                      />
                      Shuffle Q
                    </label>
                    <label className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={sec.shuffleOptions}
                        onChange={(e) =>
                          updateSection(i, {
                            shuffleOptions: e.target.checked,
                          })
                        }
                      />
                      Shuffle Opt
                    </label>
                    <button
                      onClick={() => removeSection(i)}
                      className="ml-auto text-xs text-red-600 underline"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 flex flex-wrap gap-3">
                    <span>
                      Questions: <strong>{sec.questionIds.length}</strong>
                    </span>
                  </div>
                  {/* Placeholder for question picker */}
                  <QuestionPicker
                    selected={sec.questionIds}
                    onChange={(ids) => updateSection(i, { questionIds: ids })}
                  />
                </div>
              ))}
              {!sectionDrafts.length && (
                <div className="text-xs text-gray-500">No sections yet.</div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Assign Users</h4>
              <textarea
                value={assignList}
                onChange={(e) => setAssignList(e.target.value)}
                placeholder="Comma or space separated user IDs"
                className="w-full border rounded-md p-2 text-xs h-20"
              />
              <button
                type="button"
                onClick={assignUsers}
                className="text-xs bg-primary text-white px-3 py-2 rounded-md"
              >
                Assign
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface QuestionPickerProps {
  selected: string[];
  onChange(ids: string[]): void;
}

const QuestionPicker: React.FC<QuestionPickerProps> = ({
  selected,
  onChange,
}) => {
  const [list, setList] = useState<
    {
      _id: string;
      text: string;
      tags?: { subject?: string; topic?: string; difficulty?: string };
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  async function loadQuestions() {
    setLoading(true);
    try {
      interface QShape {
        _id: string;
        text: string;
        tags?: { subject?: string; topic?: string; difficulty?: string };
      }
      const data = (await apiFetch(
        `/api/exams/questions${q ? `?q=${encodeURIComponent(q)}` : ""}`
      )) as { items: QShape[] };
      setList(data.items || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search bank..."
          className="border rounded-md px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={loadQuestions}
          className="text-xs px-3 py-1 rounded-md border"
        >
          Refresh
        </button>
        <span className="text-[10px] text-gray-500">
          {selected.length} selected
        </span>
      </div>
      <div className="max-h-60 overflow-auto border rounded-md divide-y">
        {loading && <div className="p-2 text-xs text-gray-500">Loading...</div>}
        {!loading &&
          list.map((it) => (
            <label
              key={it._id}
              className="flex items-start gap-2 p-2 text-xs cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(it._id)}
                onChange={() => toggle(it._id)}
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="font-medium line-clamp-2">{it.text}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">
                  {it.tags?.subject || "-"} / {it.tags?.topic || "-"} /{" "}
                  {it.tags?.difficulty || "-"}
                </span>
              </span>
            </label>
          ))}
        {!loading && !list.length && (
          <div className="p-2 text-[10px] text-gray-400">No questions</div>
        )}
      </div>
    </div>
  );
};
