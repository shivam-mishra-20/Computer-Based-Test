"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notify } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

interface StudentLite {
  _id: string;
  name: string;
  email?: string;
  batch?: string;
}

interface AssignedTo {
  users?: string[];
  groups?: string[];
}

interface Props {
  examId: string;
  classLevel: string;
  initialAssignedTo?: AssignedTo;
  onSaved?: (assignedTo: AssignedTo) => void;
}

type Mode = "class" | "batch" | "students";

// The one assignment write path: always POSTs /exams/:id/assign with an
// explicit value for both `groups` and `users` (never omits one to mean
// "leave as-is" — that's for callers like Schedule & Publish that don't
// touch assignment at all). This is where a teacher can see and deliberately
// replace an exam's current assignment, class OR batch OR individual
// students, never several stale modes silently coexisting.
export default function StudentAssignmentPicker({ examId, classLevel, initialAssignedTo, onSaved }: Props) {
  const initialBatch = useMemo(() => {
    const groups = initialAssignedTo?.groups || [];
    return groups.find((g) => g !== classLevel) || "";
  }, [initialAssignedTo, classLevel]);
  const initialMode: Mode = initialAssignedTo?.users?.length
    ? "students"
    : initialBatch
    ? "batch"
    : "class";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [batch, setBatch] = useState(initialBatch);
  const [batchOptions, setBatchOptions] = useState<string[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(initialAssignedTo?.users || []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await apiFetch("/users/student-batch-config")) as {
          batchRules: Record<string, string[]>;
        };
        if (!cancelled) setBatchOptions(data.batchRules?.[classLevel] || []);
      } catch {
        // no fallback list — an empty batch picker just means "class only" is available
      } finally {
        if (!cancelled) setBatchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classLevel]);

  // Student roster for the "students" mode — scoped to class, and to batch
  // when one's selected, refetched on search (debounced).
  useEffect(() => {
    if (mode !== "students") return;
    const handle = setTimeout(() => {
      let cancelled = false;
      setStudentsLoading(true);
      (async () => {
        try {
          const params = new URLSearchParams({ classLevel, limit: "200" });
          if (batch) params.append("batch", batch);
          if (search.trim()) params.append("search", search.trim());
          const data = (await apiFetch(`/teacher/students?${params}`)) as { students?: StudentLite[] } | StudentLite[];
          const list = Array.isArray(data) ? data : data?.students || [];
          if (!cancelled) setStudents(list);
        } catch {
          if (!cancelled) setStudents([]);
        } finally {
          if (!cancelled) setStudentsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, 300);
    return () => clearTimeout(handle);
  }, [mode, classLevel, batch, search]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const selectAllVisible = () => setSelectedStudentIds((prev) => [...new Set([...prev, ...students.map((s) => s._id)])]);
  const deselectAllVisible = () => {
    const visible = new Set(students.map((s) => s._id));
    setSelectedStudentIds((prev) => prev.filter((id) => !visible.has(id)));
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const body: AssignedTo =
        mode === "students"
          ? { users: selectedStudentIds, groups: [] }
          : mode === "batch"
          ? { users: [], groups: batch ? [classLevel, batch] : [classLevel] }
          : { users: [], groups: [classLevel] };
      await apiFetch(`/exams/${examId}/assign`, { method: "POST", body: JSON.stringify(body) });
      notify.success("Assignment saved");
      onSaved?.(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save assignment";
      setError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  const summary =
    mode === "students"
      ? `${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? "" : "s"} selected`
      : mode === "batch"
      ? batch
        ? `Class ${classLevel} · ${batch}`
        : `Class ${classLevel} (select a batch)`
      : `All of Class ${classLevel}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["class", "batch", "students"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border-2 ${
              mode === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {m === "class" ? "Whole Class" : m === "batch" ? "Batch" : "Individual Students"}
          </button>
        ))}
      </div>

      {mode === "batch" && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Batch {batchesLoading && <span className="text-gray-400">(loading...)</span>}
          </label>
          {!batchesLoading && batchOptions.length === 0 ? (
            <p className="text-sm text-gray-500">No batches configured for Class {classLevel} — use Whole Class instead.</p>
          ) : (
            <select value={batch} onChange={(e) => setBatch(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg bg-white text-sm">
              <option value="">Select batch</option>
              {batchOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === "students" && (
        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or email..."
            className="w-full px-3 py-2.5 border rounded-lg text-sm"
          />
          <div className="flex items-center gap-3 text-xs">
            <button onClick={selectAllVisible} disabled={students.length === 0} className="text-emerald-700 font-medium disabled:opacity-50">
              Select All Visible ({students.length})
            </button>
            <button onClick={deselectAllVisible} disabled={students.length === 0} className="text-red-600 font-medium disabled:opacity-50">
              Deselect Visible
            </button>
          </div>
          <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
            {studentsLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No students found.</p>
            ) : (
              students.map((s) => {
                const checked = selectedStudentIds.includes(s._id);
                return (
                  <label key={s._id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${checked ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleStudent(s._id)} className="w-4 h-4 rounded text-emerald-600" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{s.name}</p>
                      {(s.email || s.batch) && (
                        <p className="text-xs text-gray-500 truncate">{[s.email, s.batch].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-gray-700">{summary}</p>
        <button
          onClick={save}
          disabled={saving || (mode === "batch" && !batch)}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-emerald-700"
        >
          {saving ? "Saving..." : "Save Assignment"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
