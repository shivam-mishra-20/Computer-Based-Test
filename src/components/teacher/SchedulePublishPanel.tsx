"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notify } from "@/components/ui/toast";
import { addDays, suggestEndFromStart, toDateInputValue, toTimeInputValue } from "@/lib/examSchedule";

interface ExamSectionLite {
  title: string;
  questionIds: string[];
  sectionDurationMins: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

export interface ExamPublishInfo {
  _id: string;
  classLevel?: string;
  batch?: string;
  schedule?: { startAt?: string; endAt?: string; timezone?: string };
  instructions?: string;
  antiCheat?: boolean;
  lateEntryMins?: number;
  totalDurationMins?: number;
  isPublished?: boolean;
}

interface Props {
  exam: ExamPublishInfo;
  totalQuestions: number;
  // Only pass when publishing from inside the builder — persists the latest
  // section/question edits in the same request as publishing. Omit when
  // quick-publishing from an exam list: that path must never touch content.
  sections?: ExamSectionLite[];
  onPublished: (updatedExam: ExamPublishInfo) => void;
  onCancel?: () => void;
}

interface ClassRule {
  classValue: string;
  classLabel: string;
  batches: string[];
  requiresBatch: boolean;
}
interface StudentBatchConfig {
  classes: ClassRule[];
  batchRules: Record<string, string[]>;
}

// Class 6 has no batch split in the real data (GET /users/student-batch-config
// only covers 7-12) — kept selectable with no batch requirement, same as it's
// always worked, rather than silently dropping it.
const CLASS_6: ClassRule = { classValue: "6", classLabel: "Class 6", batches: [], requiresBatch: false };
const FALLBACK_CLASSES: ClassRule[] = ["7", "8", "9", "10", "11", "12"].map((v) => ({
  classValue: v,
  classLabel: `Class ${v}`,
  batches: [],
  requiresBatch: false,
}));

const ALL_BATCHES = "All Batches";

export default function SchedulePublishPanel({ exam, totalQuestions, sections, onPublished, onCancel }: Props) {
  const alreadyScheduled = !!(exam.classLevel && exam.schedule?.startAt && exam.schedule?.endAt);
  const [editing, setEditing] = useState(!alreadyScheduled);

  const [config, setConfig] = useState<StudentBatchConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [classLevel, setClassLevel] = useState(exam.classLevel || "");
  const [batch, setBatch] = useState(exam.batch || ALL_BATCHES);
  const [mode, setMode] = useState<"now" | "later">(exam.schedule?.startAt ? "later" : "now");

  const durationMins = sections
    ? sections.reduce((sum, s) => sum + (s.sectionDurationMins || 0), 0)
    : exam.totalDurationMins || 60;

  const initialStart = exam.schedule?.startAt ? new Date(exam.schedule.startAt) : new Date();
  const initialEnd = exam.schedule?.endAt ? new Date(exam.schedule.endAt) : suggestEndFromStart(initialStart, durationMins);
  const [startDate, setStartDate] = useState(toDateInputValue(initialStart));
  const [startTime, setStartTime] = useState(toTimeInputValue(initialStart));
  const [endDate, setEndDate] = useState(toDateInputValue(initialEnd));
  const [endTime, setEndTime] = useState(toTimeInputValue(initialEnd));
  const [endTouched, setEndTouched] = useState(!!exam.schedule?.endAt);

  const [instructions, setInstructions] = useState(exam.instructions || "");
  const [antiCheat, setAntiCheat] = useState(exam.antiCheat ?? true);
  const [lateEntryMins, setLateEntryMins] = useState(
    typeof exam.lateEntryMins === "number" ? String(exam.lateEntryMins) : ""
  );

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Belt-and-suspenders against a double-click firing two publish requests
  // before the `disabled` prop re-render commits — the `disabled` attribute
  // alone is normally enough, but a ref check is synchronous and free.
  const publishingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await apiFetch("/users/student-batch-config")) as StudentBatchConfig;
        if (!cancelled) setConfig(data);
      } catch {
        // fall back silently — FALLBACK_CLASSES keeps the form usable offline
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const classOptions = useMemo<ClassRule[]>(() => {
    const base = config?.classes?.length ? config.classes : FALLBACK_CLASSES;
    return [CLASS_6, ...base];
  }, [config]);

  const batchesForClass = classLevel === "6" ? [] : config?.batchRules?.[classLevel] || [];

  // Keep the suggested end time in sync with start+duration until the teacher
  // manually edits it — a linked-fields pattern so the common case (never
  // touch End) still produces a correct value.
  useEffect(() => {
    if (endTouched || mode !== "later") return;
    if (!startDate || !startTime) return;
    const start = new Date(`${startDate}T${startTime}`);
    if (Number.isNaN(start.getTime())) return;
    const end = suggestEndFromStart(start, durationMins);
    setEndDate(toDateInputValue(end));
    setEndTime(toTimeInputValue(end));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, startTime, mode, durationMins]);

  const applyQuickDate = (days: number) => {
    setStartDate(toDateInputValue(addDays(new Date(), days)));
    if (!startTime) setStartTime("09:00");
  };

  const publish = async () => {
    // Ref check (synchronous, immune to render timing) + the `disabled` prop
    // on the button together make a double-click/double-tap unable to fire
    // two publish requests.
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    setError(null);
    try {
      if (!classLevel) {
        setError("Select a class.");
        return;
      }

      let startAt: Date;
      let endAt: Date;
      if (mode === "now") {
        startAt = new Date();
        endAt = suggestEndFromStart(startAt, durationMins);
      } else {
        startAt = new Date(`${startDate}T${startTime}`);
        endAt = new Date(`${endDate}T${endTime}`);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
          setError("Invalid date/time.");
          return;
        }
        if (startAt >= endAt) {
          setError("Start time must be before end time.");
          return;
        }
      }
      if (totalQuestions === 0) {
        notify.error("Add at least one question to publish");
        return;
      }

      const body: Record<string, unknown> = {
        classLevel,
        batch: batch === ALL_BATCHES ? undefined : batch,
        isPublished: true,
        schedule: {
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          timezone: exam.schedule?.timezone || "Asia/Kolkata",
        },
        instructions: instructions.trim() || undefined,
        antiCheat,
        lateEntryMins: lateEntryMins.trim() ? Number(lateEntryMins) : undefined,
      };
      if (sections) {
        body.sections = sections;
        body.totalDurationMins = durationMins;
      }
      const updated = await apiFetch(`/exams/${exam._id}`, { method: "PUT", body: JSON.stringify(body) });

      // Real batch names for this class (from the DB-backed config), not a
      // hardcoded list — "All Batches" expands to every configured batch for
      // the class, or just the class group if the class has none.
      const groups =
        batch === ALL_BATCHES || !batch
          ? [classLevel, ...batchesForClass]
          : [classLevel, batch];
      await apiFetch(`/exams/${exam._id}/assign`, {
        method: "POST",
        body: JSON.stringify({ groups }),
      });

      notify.success("Exam scheduled and published");
      onPublished(updated as ExamPublishInfo);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      setError(message);
      notify.error(message);
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  };

  if (!editing) {
    const startAt = exam.schedule?.startAt ? new Date(exam.schedule.startAt) : null;
    const endAt = exam.schedule?.endAt ? new Date(exam.schedule.endAt) : null;
    const fmt = (d: Date) =>
      d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    return (
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h3 className="font-medium text-gray-900">Schedule & Publish</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium text-gray-800">Class {exam.classLevel}</span>
            {exam.batch ? ` • ${exam.batch}` : " • All Batches"}
          </p>
          {startAt && endAt && (
            <p>
              {fmt(startAt)} → {fmt(endAt)} ({exam.schedule?.timezone || "Asia/Kolkata"})
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50"
          >
            Edit Schedule
          </button>
          <button
            onClick={publish}
            disabled={publishing}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg disabled:opacity-50 hover:bg-emerald-700"
          >
            {publishing ? "Publishing..." : exam.isPublished ? "Republish" : "Publish"}
          </button>
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div>
        <h3 className="font-medium text-gray-900 mb-1">Schedule & Publish</h3>
        <p className="text-sm text-gray-500">
          Students see a waiting room until the start time and cannot enter early — this schedule is enforced by the
          server.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          <select
            value={classLevel}
            onChange={(e) => {
              setClassLevel(e.target.value);
              setBatch(ALL_BATCHES);
            }}
            className="w-full px-3 py-2.5 border rounded-lg bg-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Select Class</option>
            {classOptions.map((c) => (
              <option key={c.classValue} value={c.classValue}>
                {c.classLabel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Batch {configLoading && <span className="text-gray-400">(loading...)</span>}
          </label>
          <select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-lg bg-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value={ALL_BATCHES}>{ALL_BATCHES}</option>
            {batchesForClass.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">When should the exam be available?</label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMode("now")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border-2 ${
              mode === "now" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"
            }`}
          >
            Start Now
          </button>
          <button
            type="button"
            onClick={() => setMode("later")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border-2 ${
              mode === "later" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"
            }`}
          >
            Schedule for Later
          </button>
        </div>

        {mode === "now" ? (
          <p className="text-xs text-gray-500">
            Starts immediately. Entry closes in {durationMins} minutes; anyone already in the exam keeps their full
            time regardless.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyQuickDate(0)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border hover:bg-gray-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyQuickDate(1)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border hover:bg-gray-50"
              >
                Tomorrow
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Entry closes (auto-suggested from duration)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndTouched(true);
                      setEndDate(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTouched(true);
                      setEndTime(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Times are in {exam.schedule?.timezone || "Asia/Kolkata"} (IST).
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Exam Instructions</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          placeholder="Shown to students on the waiting room screen before the exam starts..."
          className="w-full px-3 py-2 border rounded-lg text-sm resize-vertical"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={antiCheat}
          onChange={(e) => setAntiCheat(e.target.checked)}
          className="rounded text-emerald-600"
        />
        <span className="text-sm text-gray-700">
          Enable proctoring (tab-switch/fullscreen detection, warning threshold, auto-submit)
        </span>
      </label>

      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 select-none">Advanced: late entry grace period</summary>
        <div className="mt-2">
          <input
            type="number"
            min={0}
            value={lateEntryMins}
            onChange={(e) => setLateEntryMins(e.target.value)}
            placeholder="Minutes after start entry stays open (blank = until entry closes)"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </details>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={publish}
          disabled={publishing || totalQuestions === 0}
          className="flex-1 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors text-sm"
        >
          {publishing ? "Publishing..." : mode === "now" ? "Start Now & Publish" : "Schedule & Publish"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        )}
      </div>
      {totalQuestions === 0 && <p className="text-xs text-amber-600">⚠️ Add at least one question to publish</p>}
    </div>
  );
}
