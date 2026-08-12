"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notify } from "@/components/ui/toast";

interface ClassRule {
  classValue: string;
  classLabel: string;
}
const CLASS_6: ClassRule = { classValue: "6", classLabel: "Class 6" };
const FALLBACK_CLASSES: ClassRule[] = ["7", "8", "9", "10", "11", "12"].map((v) => ({
  classValue: v,
  classLabel: `Class ${v}`,
}));

const DURATION_PRESETS = [30, 60, 90, 120];
const MARKING_PRESETS = [
  { label: "+4 / -1 / 0 (Competitive)", correct: 4, incorrect: -1, unattempted: 0 },
  { label: "+1 / 0 / 0 (Practice)", correct: 1, incorrect: 0, unattempted: 0 },
  { label: "+2 / -0.5 / 0", correct: 2, incorrect: -0.5, unattempted: 0 },
];

interface Props {
  // Caller navigates to the builder with the new exam's id.
  onCreated: (examId: string) => void;
  onCancel?: () => void;
}

// The one "create an exam" entry point — collects only what's needed to get
// into the builder fast (name/class/subject/duration/marking), everything
// else (questions, settings, students, schedule) happens there. Used by the
// teacher dashboard's Create Exam tab and by both exam lists' quick-create
// modal — previously three separate implementations (a 3-step wizard plus two
// title-only modals).
export default function QuickCreateExamForm({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [classOptions, setClassOptions] = useState<ClassRule[]>([CLASS_6, ...FALLBACK_CLASSES]);
  const [subject, setSubject] = useState("");
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [markingIdx, setMarkingIdx] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await apiFetch("/users/student-batch-config")) as {
          classes?: ClassRule[];
        };
        if (!cancelled && data.classes?.length) setClassOptions([CLASS_6, ...data.classes]);
      } catch {
        // keep fallback list
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dependent dropdown: once a class is picked, load the subjects that
  // actually have questions in that class's bank.
  useEffect(() => {
    if (!classLevel) {
      setSubjectOptions([]);
      return;
    }
    let cancelled = false;
    setSubjectsLoading(true);
    (async () => {
      try {
        const res = (await apiFetch(`/ai/questions/class/${classLevel}/filters`)) as {
          success: boolean;
          data: { subjects: string[] };
        };
        if (!cancelled) setSubjectOptions(res.success ? res.data.subjects || [] : []);
      } catch {
        if (!cancelled) setSubjectOptions([]);
      } finally {
        if (!cancelled) setSubjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classLevel]);

  const effectiveDuration = customDuration.trim() ? Number(customDuration) || 0 : duration;
  const marking = useMemo(() => MARKING_PRESETS[markingIdx], [markingIdx]);

  const create = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Enter an exam name.");
      return;
    }
    if (!classLevel) {
      setError("Select a class.");
      return;
    }
    setCreating(true);
    try {
      const created = (await apiFetch("/exams", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          classLevel,
          meta: subject ? { subject } : undefined,
          totalDurationMins: effectiveDuration || 60,
          markingScheme: { correct: marking.correct, incorrect: marking.incorrect, unattempted: marking.unattempted },
          mode: "live",
          sections: [],
          isPublished: false,
        }),
      })) as { _id: string };
      onCreated(created._id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create exam";
      setError(message);
      notify.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Exam Name</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Mid-Term Physics Test"
          className="w-full px-4 py-2.5 border rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          <select value={classLevel} onChange={(e) => { setClassLevel(e.target.value); setSubject(""); }} className="w-full px-3 py-2.5 border rounded-lg bg-white text-sm">
            <option value="">Select class</option>
            {classOptions.map((c) => (
              <option key={c.classValue} value={c.classValue}>{c.classLabel}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Subject {subjectsLoading && <span className="text-gray-400">(loading...)</span>}
          </label>
          <input
            list="qc-subject-options"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!classLevel}
            placeholder={classLevel ? "e.g. Physics" : "Select a class first"}
            className="w-full px-3 py-2.5 border rounded-lg text-sm disabled:opacity-50 disabled:bg-gray-50"
          />
          <datalist id="qc-subject-options">
            {subjectOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Duration</label>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDuration(d); setCustomDuration(""); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 ${
                !customDuration && duration === d ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d} min
            </button>
          ))}
          <input
            value={customDuration}
            onChange={(e) => setCustomDuration(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Custom"
            className="w-20 px-3 py-1.5 border rounded-full text-sm text-center"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Marking Scheme</label>
        <div className="flex flex-wrap gap-2">
          {MARKING_PRESETS.map((m, i) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setMarkingIdx(i)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 ${
                markingIdx === i ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={create}
          disabled={creating || !title.trim() || !classLevel}
          className="flex-1 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
        >
          {creating ? "Creating..." : "Create & Add Questions"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
