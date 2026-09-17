"use client";
import { Fragment, useMemo, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  ImageOff,
  Trash2,
  Plus,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export interface ScheduleImportEntry {
  tempId: string;
  classLevel: string;
  classLevelRaw?: string;
  /** An EXISTING batch name, or "". Never text read off the photograph. */
  batch: string;
  /**
   * Every batch this session is for.
   *
   * A class can legitimately run for several batches at once — same teacher,
   * same room, same slot — which the schedule policy treats as one combined
   * session. `batch` stays as the first of these for the queries that still
   * read the single field.
   */
  batches?: string[];
  /** Leftover row text from the image ("jee even"). Diagnostic only. */
  batchHint?: string;
  /** Why the batch is or is not set — see scheduleBatchResolver.ts. */
  batchStatus?:
    | "resolved-single"
    | "resolved-hint"
    | "needs-selection"
    | "no-batches"
    | "unknown-class"
    | "no-org-context";
  /** The organization's real batches for this class. */
  availableBatches?: string[];
  /** Existing batches the hint might mean. Ordering help, never a decision. */
  batchSuggestions?: string[];
  startTimeSlot: string;
  endTimeSlot: string;
  roomNumber: number | null;
  teacherId: string;
  teacherName: string;
  note?: string;
  subject: string;
  confidence: "high" | "low";
  needsReview: boolean;
  uncertainFields: string[];
}

export interface ScheduleImportIssue {
  tempId?: string;
  field?: string;
  severity: "error" | "warning";
  message: string;
}

interface BatchOption {
  _id: string;
  name: string;
  classLevels: string[];
}

interface TeacherOption {
  id: string;
  name: string;
}

interface TimeSlotOption {
  start: string;
  end: string;
  label: string;
}

interface ScheduleImportReviewPanelProps {
  imageUrl: string;
  date: string;
  onDateChange: (date: string) => void;
  entries: ScheduleImportEntry[];
  onEntriesChange: (entries: ScheduleImportEntry[]) => void;
  issues: ScheduleImportIssue[];
  validating: boolean;
  batches: BatchOption[];
  teachers: TeacherOption[];
  timeSlots: TimeSlotOption[];
  classLevels: string[];
}

const FIELD_LABELS: Record<string, string> = {
  classLevel: "Class unclear",
  batch: "Existing batch selection required",
  teacherName: "Teacher unmatched",
  roomNumber: "Room unclear",
  startTimeSlot: "Start time unclear",
  endTimeSlot: "End time unclear",
};

type StatusKind = "valid" | "review" | "conflict";
type FilterKind = "all" | "review" | "conflict";

function to12h(hhmm: string): string {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || "—";
  const [hStr, m] = hhmm.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

/** Every batch on an entry, tolerating the older single-value shape. */
function batchesOf(e: ScheduleImportEntry): string[] {
  const raw = [...(e.batches ?? []), e.batch];
  return Array.from(new Set(raw.map((b) => (b ?? "").trim()).filter(Boolean)));
}

function groupKeyOf(e: ScheduleImportEntry): string {
  return `${e.classLevel}|${batchesOf(e).join("+")}`;
}

function groupLabelOf(e: ScheduleImportEntry): string {
  const names = batchesOf(e);
  return `Class ${e.classLevel || "?"}${names.length ? " " + names.join(" + ") : ""}`;
}

function newBlankEntry(defaultClassLevel: string): ScheduleImportEntry {
  return {
    tempId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    classLevel: defaultClassLevel,
    batch: "",
    batches: [],
    startTimeSlot: "",
    endTimeSlot: "",
    roomNumber: null,
    teacherId: "",
    teacherName: "",
    note: "",
    subject: "",
    confidence: "high",
    needsReview: false,
    uncertainFields: [],
  };
}

export default function ScheduleImportReviewPanel({
  imageUrl,
  date,
  onDateChange,
  entries,
  onEntriesChange,
  issues,
  validating,
  batches,
  teachers,
  timeSlots,
  classLevels,
}: ScheduleImportReviewPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [groupFilter, setGroupFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ tempId: string; field: string } | null>(null);

  const issuesByTempId = useMemo(() => {
    const map = new Map<string, ScheduleImportIssue[]>();
    for (const issue of issues) {
      if (!issue.tempId) continue;
      const list = map.get(issue.tempId) || [];
      list.push(issue);
      map.set(issue.tempId, list);
    }
    return map;
  }, [issues]);

  const generalIssues = issues.filter((i) => !i.tempId);

  const statusOf = (e: ScheduleImportEntry): StatusKind => {
    const rowIssues = issuesByTempId.get(e.tempId) || [];
    if (rowIssues.some((i) => i.severity === "error")) return "conflict";
    if (e.needsReview || rowIssues.length > 0) return "review";
    return "valid";
  };

  const summary = useMemo(() => {
    let valid = 0;
    let review = 0;
    let conflict = 0;
    for (const e of entries) {
      const s = statusOf(e);
      if (s === "conflict") conflict++;
      else if (s === "review") review++;
      else valid++;
    }
    return { total: entries.length, valid, review, conflict };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, issuesByTempId]);

  const groupOptions = useMemo(() => {
    const seen = new Map<string, string>();
    entries.forEach((e) => {
      if (!seen.has(groupKeyOf(e))) seen.set(groupKeyOf(e), groupLabelOf(e));
    });
    return Array.from(seen.entries());
  }, [entries]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: ScheduleImportEntry[] }>();
    entries.forEach((e) => {
      const status = statusOf(e);
      if (filter === "review" && status !== "review") return;
      if (filter === "conflict" && status !== "conflict") return;
      const key = groupKeyOf(e);
      if (groupFilter && key !== groupFilter) return;
      if (!map.has(key)) map.set(key, { label: groupLabelOf(e), rows: [] });
      map.get(key)!.rows.push(e);
    });
    for (const g of map.values()) {
      g.rows.sort((a, b) => a.startTimeSlot.localeCompare(b.startTimeSlot));
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, filter, groupFilter, issuesByTempId]);

  function updateEntry(tempId: string, patch: Partial<ScheduleImportEntry>) {
    onEntriesChange(entries.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e)));
  }

  function removeEntry(tempId: string) {
    onEntriesChange(entries.filter((e) => e.tempId !== tempId));
  }

  function batchNamesForClass(classLevel: string): string[] {
    return Array.from(
      new Set(batches.filter((b) => b.classLevels.includes(classLevel)).map((b) => b.name))
    );
  }

  /** The EXISTING batches offerable for a row — server list first, page list as fallback. */
  function batchOptionsFor(entry: ScheduleImportEntry): string[] {
    return entry.availableBatches && entry.availableBatches.length
      ? entry.availableBatches
      : batchNamesForClass(entry.classLevel);
  }

  /**
   * Set the batch selection for every row in a group.
   *
   * `batch` is kept as the first selected name because a lot of existing code —
   * queries, indexes, the student audience clause — still reads the single
   * field; `batches` is the real answer. Choosing at least one also clears the
   * row's `batch` review flag, so the badge stops demanding a selection the
   * admin has just made.
   */
  function setGroupBatches(rows: ScheduleImportEntry[], names: string[]) {
    const selected = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    onEntriesChange(
      entries.map((e) => {
        if (!rows.some((r) => r.tempId === e.tempId)) return e;
        const uncertain = selected.length
          ? e.uncertainFields.filter((f) => f !== "batch")
          : Array.from(new Set([...e.uncertainFields, "batch"]));
        return {
          ...e,
          batches: selected,
          batch: selected[0] || "",
          uncertainFields: uncertain,
          needsReview: uncertain.length > 0,
        };
      })
    );
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const cellBtn =
    "w-full text-left px-2 py-1 rounded hover:bg-slate-100 truncate transition-colors";
  const inputCls =
    "w-full px-1.5 py-0.5 rounded border border-emerald-400 text-[13px] focus:ring-2 focus:ring-emerald-500/20 outline-none";

  function StatusBadge({ entry }: { entry: ScheduleImportEntry }) {
    const status = statusOf(entry);
    const rowIssues = issuesByTempId.get(entry.tempId) || [];
    const reasons = [
      ...rowIssues.map((i) => i.message),
      ...entry.uncertainFields.map((f) => FIELD_LABELS[f] || f),
    ];
    const title = reasons.join("\n") || "Looks good";

    if (status === "conflict") {
      const short = rowIssues.find((i) => i.severity === "error")?.field;
      return (
        <span
          title={title}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded cursor-help"
        >
          <X className="w-3 h-3 shrink-0" />
          {short === "teacherId" ? "Teacher" : short === "roomNumber" ? "Room" : "Conflict"}
        </span>
      );
    }
    if (status === "review") {
      const first = entry.uncertainFields[0];
      return (
        <span
          title={title}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded cursor-help"
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {first ? (FIELD_LABELS[first] || first).replace(/ unclear| unmatched/, "") : "Review"}
        </span>
      );
    }
    return (
      <span title={title} className="inline-flex items-center text-emerald-600">
        <Check className="w-3.5 h-3.5" />
      </span>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Compact sticky header */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-2 py-1 rounded border border-slate-300 text-[13px] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="font-semibold text-slate-800">{summary.total} entries</span>
          <span className="text-emerald-600">{summary.valid} valid</span>
          {summary.review > 0 && <span className="text-amber-600">{summary.review} review</span>}
          {summary.conflict > 0 && <span className="text-red-600">{summary.conflict} conflict</span>}
          {validating && <span className="text-slate-400">checking…</span>}
        </div>
      </div>

      {generalIssues.length > 0 && (
        <div className="shrink-0 px-4 py-1.5 space-y-1 border-b border-slate-200">
          {generalIssues.map((issue, idx) => (
            <div
              key={idx}
              className={`text-[12px] px-2 py-1 rounded ${
                issue.severity === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Split workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT — original image */}
        <div className="lg:w-[45%] lg:border-r border-slate-200 flex flex-col bg-slate-50 min-h-[220px] shrink-0">
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-white">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Original upload
            </span>
            {/* Keeping the original is optional — the server skips it when the
                session carries no organization, and says so in `warnings`. The
                zoom controls have nothing to act on then, so they are hidden
                rather than left as dead buttons over a broken image. */}
            {imageUrl && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => { setFitWidth(false); setZoom((z) => Math.max(0.25, z - 0.25)); }}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setFitWidth(false); setZoom((z) => Math.min(5, z + 0.25)); }}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setFitWidth(true); setZoom(1); }}
                  className={`p-1.5 rounded hover:bg-slate-100 ${fitWidth ? "text-emerald-600" : "text-slate-600"}`}
                  title="Fit to width"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                  title="Open original in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Uploaded timetable"
                className={fitWidth ? "w-full h-auto" : "max-w-none"}
                style={fitWidth ? undefined : { width: `${zoom * 100}%` }}
              />
            ) : (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-1.5 text-center px-4">
                <ImageOff className="w-6 h-6 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">Original not saved</p>
                <p className="text-[11px] text-slate-400 max-w-[240px]">
                  The extracted classes on the right are complete — you just can&apos;t
                  compare them against the photo here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — extracted schedule */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              {(["all", "review", "conflict"] as FilterKind[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                    filter === f ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f === "all" ? "All" : f === "review" ? "Needs review" : "Conflicts"}
                </button>
              ))}
            </div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 text-[12px] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">All classes</option>
              {groupOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-auto">
            {groups.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm">
                {entries.length === 0
                  ? 'No entries yet. Use "Add row" below to add one manually.'
                  : "No entries match this filter."}
              </div>
            ) : (
              <table className="w-full text-[13px] border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="font-semibold px-3 py-1.5 w-[27%]">Time</th>
                    <th className="font-semibold px-2 py-1.5 w-[27%]">Teacher</th>
                    <th className="font-semibold px-2 py-1.5 w-[11%]">Room</th>
                    <th className="font-semibold px-2 py-1.5 w-[17%]">Note</th>
                    <th className="font-semibold px-2 py-1.5 w-[13%]">Status</th>
                    <th className="w-[5%]" />
                  </tr>
                </thead>
                <tbody>
                  {groups.map(([key, group]) => {
                    const isCollapsed = collapsed.has(key);
                    return (
                      <Fragment key={key}>
                        <tr className="bg-slate-100/70">
                          <td colSpan={6} className="px-2 py-1">
                            <button
                              type="button"
                              onClick={() => toggleGroup(key)}
                              className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-emerald-700"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                              {group.label}
                              <span className="ml-1 font-normal text-slate-400">
                                ({group.rows.length})
                              </span>
                            </button>
                          </td>
                        </tr>
                        {!isCollapsed &&
                          group.rows.map((entry) => {
                            const isEditing = (f: string) =>
                              editing?.tempId === entry.tempId && editing.field === f;
                            const status = statusOf(entry);

                            return (
                              <tr
                                key={entry.tempId}
                                className={`border-b border-slate-100 hover:bg-slate-50/70 ${
                                  status === "conflict"
                                    ? "bg-red-50/40"
                                    : status === "review"
                                      ? "bg-amber-50/30"
                                      : ""
                                }`}
                              >
                                {/* Time */}
                                <td className="px-3 py-1 align-middle">
                                  {isEditing("time") ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="time"
                                          autoFocus
                                          value={entry.startTimeSlot}
                                          onChange={(e) =>
                                            updateEntry(entry.tempId, { startTimeSlot: e.target.value })
                                          }
                                          className={inputCls}
                                        />
                                        <input
                                          type="time"
                                          value={entry.endTimeSlot}
                                          onChange={(e) =>
                                            updateEntry(entry.tempId, { endTimeSlot: e.target.value })
                                          }
                                          className={inputCls}
                                        />
                                      </div>
                                      {timeSlots.length > 0 && (
                                        <select
                                          value=""
                                          onChange={(e) => {
                                            const slot = timeSlots.find((s) => s.start === e.target.value);
                                            if (slot) {
                                              updateEntry(entry.tempId, {
                                                startTimeSlot: slot.start,
                                                endTimeSlot: slot.end,
                                              });
                                            }
                                            setEditing(null);
                                          }}
                                          onBlur={() => setEditing(null)}
                                          className="w-full px-1.5 py-0.5 rounded border border-slate-200 text-[11px] text-slate-500"
                                        >
                                          <option value="">Pick a known slot…</option>
                                          {timeSlots.map((s) => (
                                            <option key={s.start} value={s.start}>
                                              {s.label}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditing({ tempId: entry.tempId, field: "time" })}
                                      className={cellBtn}
                                    >
                                      {to12h(entry.startTimeSlot)} – {to12h(entry.endTimeSlot)}
                                    </button>
                                  )}
                                </td>

                                {/* Teacher */}
                                <td className="px-2 py-1 align-middle">
                                  {isEditing("teacher") ? (
                                    <select
                                      autoFocus
                                      value={entry.teacherId}
                                      onChange={(e) => {
                                        const t = teachers.find((x) => x.id === e.target.value);
                                        updateEntry(entry.tempId, {
                                          teacherId: e.target.value,
                                          teacherName: t?.name || entry.teacherName,
                                        });
                                      }}
                                      onBlur={() => setEditing(null)}
                                      className={inputCls}
                                    >
                                      <option value="">TBA / not listed</option>
                                      {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditing({ tempId: entry.tempId, field: "teacher" })}
                                      className={`${cellBtn} ${entry.teacherId ? "" : "text-amber-700"}`}
                                    >
                                      {entry.teacherName || "TBA"}
                                    </button>
                                  )}
                                </td>

                                {/* Room */}
                                <td className="px-2 py-1 align-middle">
                                  {isEditing("room") ? (
                                    <select
                                      autoFocus
                                      value={entry.roomNumber ?? ""}
                                      onChange={(e) =>
                                        updateEntry(entry.tempId, {
                                          roomNumber: e.target.value ? Number(e.target.value) : null,
                                        })
                                      }
                                      onBlur={() => setEditing(null)}
                                      className={inputCls}
                                    >
                                      <option value="">—</option>
                                      {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n}>
                                          {n}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditing({ tempId: entry.tempId, field: "room" })}
                                      className={`${cellBtn} ${entry.roomNumber === null ? "text-amber-700" : ""}`}
                                    >
                                      {entry.roomNumber ?? "—"}
                                    </button>
                                  )}
                                </td>

                                {/* Note */}
                                <td className="px-2 py-1 align-middle">
                                  {isEditing("note") ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={entry.note || ""}
                                      onChange={(e) => updateEntry(entry.tempId, { note: e.target.value })}
                                      onBlur={() => setEditing(null)}
                                      className={inputCls}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditing({ tempId: entry.tempId, field: "note" })}
                                      className={`${cellBtn} text-slate-500`}
                                    >
                                      {entry.note || "—"}
                                    </button>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="px-2 py-1 align-middle">
                                  <StatusBadge entry={entry} />
                                </td>

                                {/* Delete */}
                                <td className="px-1 py-1 align-middle text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeEntry(entry.tempId)}
                                    className="p-1 rounded text-slate-300 hover:text-red-600 hover:bg-red-50"
                                    title="Remove this entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        {!isCollapsed && (
                          <tr>
                            <td colSpan={6} className="px-3 py-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-slate-400">Class/Batch:</span>
                                <select
                                  value={group.rows[0]?.classLevel || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    group.rows.forEach((r) =>
                                      updateEntry(r.tempId, {
                                        classLevel: v,
                                        batch: "",
                                        batches: [],
                                      })
                                    );
                                  }}
                                  className="px-1.5 py-0.5 rounded border border-slate-200 text-[12px]"
                                >
                                  <option value="">Class…</option>
                                  {classLevels.map((c) => (
                                    <option key={c} value={c}>
                                      Class {c}
                                    </option>
                                  ))}
                                </select>
                                {/* ── Multi-select, because a class can run for
                                    SEVERAL batches at once ────────────────────
                                    Two batches sharing a teacher, room and slot
                                    is one combined session, which the schedule
                                    policy already treats as valid. A dropdown
                                    could only ever express one, so the options
                                    are toggles: each click adds or removes a
                                    batch, and the current selection is visible
                                    without opening anything.

                                    EXISTING batches only. The server sends this
                                    organization's list for the class; the Batch
                                    records loaded by the page are the fallback.
                                    A name in neither — such as text read off the
                                    photograph — is never offered. */}
                                {(() => {
                                  const first = group.rows[0];
                                  if (!first) return null;
                                  const opts = batchOptionsFor(first);
                                  const selected = batchesOf(first);
                                  if (!opts.length) {
                                    return (
                                      <span className="text-[11px] text-slate-400">
                                        no batches configured for this class
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex flex-wrap items-center gap-1">
                                      {opts.map((n) => {
                                        const on = selected.includes(n);
                                        return (
                                          <button
                                            key={n}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() =>
                                              setGroupBatches(
                                                group.rows,
                                                on
                                                  ? selected.filter((b) => b !== n)
                                                  : [...selected, n]
                                              )
                                            }
                                            className={`px-2 py-0.5 rounded-full border text-[12px] transition-colors ${
                                              on
                                                ? "bg-emerald-600 border-emerald-600 text-white"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400"
                                            }`}
                                          >
                                            {on ? "✓ " : ""}
                                            {n}
                                            {!on && first.batchSuggestions?.[0] === n
                                              ? " · likely"
                                              : ""}
                                          </button>
                                        );
                                      })}
                                      {selected.length > 1 && (
                                        <span className="text-[11px] text-emerald-700 font-medium">
                                          combined session · {selected.length} batches
                                        </span>
                                      )}
                                    </span>
                                  );
                                })()}
                                <span className="text-[11px] text-slate-300">
                                  applies to all {group.rows.length} rows in this group
                                </span>
                                {/* The photo's own words, shown as evidence and
                                    never as an option. */}
                                {group.rows[0]?.batchHint ? (
                                  <span className="text-[11px] text-slate-400">
                                    photo said &ldquo;{group.rows[0].batchHint}&rdquo;
                                  </span>
                                ) : null}
                                {group.rows[0]?.batchStatus === "needs-selection" &&
                                batchesOf(group.rows[0]).length === 0 ? (
                                  <span className="text-[11px] font-medium text-amber-700">
                                    Existing batch selection required
                                  </span>
                                ) : null}
                                {/* Only when there is genuinely nothing to pick
                                    from. The server could not supply this
                                    organization's list, but the Batch records
                                    the page already loaded are a valid
                                    fallback — announcing "unavailable" above a
                                    populated list of batches contradicts what
                                    the admin can plainly see. */}
                                {group.rows[0]?.batchStatus === "no-org-context" &&
                                group.rows[0] &&
                                batchOptionsFor(group.rows[0]).length === 0 ? (
                                  <span className="text-[11px] text-slate-400">
                                    batch list unavailable — sign in with an organization to assign
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 px-3 py-1.5">
            <button
              type="button"
              onClick={() => onEntriesChange([...entries, newBlankEntry(classLevels[0] || "")])}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-emerald-300 text-emerald-700 text-[12px] font-medium hover:bg-emerald-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add row
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
