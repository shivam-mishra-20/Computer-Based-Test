"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { apiFetch, API_BASE } from "@/lib/api";
import ScheduleImportReviewPanel, {
  ScheduleImportEntry,
  ScheduleImportIssue,
} from "./ScheduleImportReviewPanel";

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

interface ScheduleImportFlowProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string; // YYYY-MM-DD
  batches: BatchOption[];
  teachers: TeacherOption[];
  visibleTimeSlots: TimeSlotOption[];
  classLevels: string[];
  onImported: (date: string) => void;
}

type Step = "upload" | "review" | "done";

const STORAGE_KEY = "scheduleImport_draft";
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

interface SavedCounts {
  created: number;
  studentsNotified: number;
  teachersNotified: number;
}

export default function ScheduleImportFlow({
  isOpen,
  onClose,
  defaultDate,
  batches,
  teachers,
  visibleTimeSlots,
  classLevels,
  onImported,
}: ScheduleImportFlowProps) {
  const [step, setStep] = useState<Step>("upload");

  // Upload step
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [dateHint, setDateHint] = useState(defaultDate);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review step
  const [imageUrl, setImageUrl] = useState("");
  const [scheduleDate, setScheduleDate] = useState(defaultDate);
  const [entries, setEntries] = useState<ScheduleImportEntry[]>([]);
  // The backend already reports which transcribed cells it refused to turn into
  // entries. Not rendering it meant a partial extraction looked identical to a
  // complete one, which is why "only some rows came through" went unnoticed.
  const [extractNotice, setExtractNotice] = useState<{
    warnings: string[];
    declaredCells: number;
    totalFound: number;
    rejectedCount: number;
    // What the server says it DETECTED, as opposed to what it produced. Without
    // this, one entry out of a 23x8 grid looked exactly like one entry out of a
    // one-class day — which is how a reading that stopped after a single cell
    // reached an admin described as complete.
    summary: {
      sections: number;
      rowLabels: number;
      timeColumns: number;
      populatedCells: number;
      offCells: number;
      rejectedCells: number;
      entries: number;
      needsReview: number;
      resolved: number;
    } | null;
    incomplete: boolean;
  } | null>(null);
  // Set when the server judged the reading too thin to trust. One-click save is
  // withheld until the admin explicitly confirms they have checked it.
  const [incompleteAcknowledged, setIncompleteAcknowledged] = useState(false);
  const [issues, setIssues] = useState<ScheduleImportIssue[]>([]);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const validateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Done step
  const [savedCounts, setSavedCounts] = useState<SavedCounts | null>(null);

  // Restore an in-progress review after an accidental close/refresh.
  useEffect(() => {
    if (!isOpen) return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.entries?.length) {
        setImageUrl(parsed.imageUrl || "");
        setScheduleDate(parsed.scheduleDate || defaultDate);
        setEntries(parsed.entries);
        setStep("review");
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Persist the in-progress review so a refresh doesn't lose a large extraction.
  useEffect(() => {
    if (step !== "review") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ imageUrl, scheduleDate, entries }));
  }, [step, imageUrl, scheduleDate, entries]);

  function clearDraft() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // Debounced server-side conflict validation whenever the draft changes.
  useEffect(() => {
    if (step !== "review") return;
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(async () => {
      setValidating(true);
      try {
        const result = (await apiFetch("/schedule/bulk/validate", {
          method: "POST",
          body: JSON.stringify({ date: scheduleDate, entries }),
        })) as { issues?: ScheduleImportIssue[] } | null;
        setIssues(result?.issues || []);
      } catch (err) {
        console.error("Bulk validate failed:", err);
      } finally {
        setValidating(false);
      }
    }, 600);
    return () => {
      if (validateTimer.current) clearTimeout(validateTimer.current);
    };
  }, [step, scheduleDate, entries]);

  const resetAll = useCallback(() => {
    setStep("upload");
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    setExtractError(null);
    setExtractNotice(null);
    setImageUrl("");
    setEntries([]);
    setIssues([]);
    setSaveError(null);
    setSavedCounts(null);
  }, [filePreviewUrl]);

  const handleFileSelect = useCallback((file: File) => {
    const name = (file.name || "").toLowerCase();
    const extOk = ACCEPTED_EXTS.some((ext) => name.endsWith(ext));
    const mimeOk = ACCEPTED_TYPES.includes(file.type);
    if (!mimeOk && !extOk) {
      setExtractError("Unsupported file. Please upload a JPG, PNG, or WEBP photo of the schedule.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setExtractError("Image too large. Maximum size is 20MB.");
      return;
    }
    setExtractError(null);
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    },
    [handleFileSelect]
  );

  async function handleExtract() {
    if (!selectedFile) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const form = new FormData();
      form.append("image", selectedFile);
      form.append("dateHint", dateHint);

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch(`${API_BASE}/schedule/extract-image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Couldn't read this schedule image.");
      }

      setImageUrl(data.imageUrl);
      setScheduleDate(data.scheduleDate);
      setEntries(data.entries || []);
      setExtractNotice({
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        declaredCells: data?.meta?.declaredCells ?? 0,
        totalFound: data?.meta?.totalFound ?? (data.entries || []).length,
        rejectedCount: data?.meta?.rejectedCount ?? 0,
        summary: data?.summary ?? null,
        incomplete: Boolean(data?.incomplete),
      });
      setIncompleteAcknowledged(false);
      setStep("review");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleConfirmSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const result = (await apiFetch("/schedule/bulk", {
        method: "POST",
        body: JSON.stringify({ date: scheduleDate, entries }),
      })) as { counts: SavedCounts };
      setSavedCounts(result.counts);
      clearDraft();
      setStep("done");
    } catch (err) {
      const apiErr = err as Error & { data?: { issues?: ScheduleImportIssue[] } };
      if (apiErr?.data?.issues) setIssues(apiErr.data.issues);
      setSaveError(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (extracting || saving) return;
    onClose();
  }

  const hasBlockingIssue = issues.some((i) => i.severity === "error");
  // A reading the server judged incomplete cannot be committed in one click.
  // Saving a timetable that was never fully read writes a day of classes that
  // silently never existed, and nothing downstream can tell that apart from a
  // genuinely quiet day — so the admin confirms first.
  const saveBlockedByIncomplete = Boolean(extractNotice?.incomplete) && !incompleteAcknowledged;
  const unresolvedCount = entries.filter(
    (e) => e.needsReview || issues.some((i) => i.tempId === e.tempId)
  ).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`relative bg-white w-full h-full sm:h-[92vh] sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col ${
            step === "review" ? "sm:w-[95vw] sm:max-w-[1600px]" : "sm:w-[95vw] sm:max-w-3xl"
          }`}
        >
          <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
            <h3 className="text-[15px] font-bold text-slate-800">
              {step === "review" ? "Review Extracted Schedule" : "Upload Schedule"}
              {step === "review" && scheduleDate && (
                <span className="ml-2 text-[13px] font-normal text-slate-500">{scheduleDate}</span>
              )}
            </h3>
            <button
              onClick={handleClose}
              disabled={extracting || saving}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {step === "upload" && (
              <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Schedule date
                  </label>
                  <input
                    type="date"
                    value={dateHint}
                    onChange={(e) => setDateHint(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Used as a hint — the date printed on the photo is read automatically and preferred when it&apos;s confidently detected.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                  accept=".jpg,.jpeg,.png,.webp,image/*"
                  className="sr-only"
                />

                <div
                  className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    dragActive ? "border-emerald-500 bg-emerald-50" : "border-emerald-300"
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-4">
                      <div className="max-w-2xl mx-auto relative rounded-lg overflow-hidden border-2 border-emerald-200 bg-slate-50">
                        <Image
                          src={filePreviewUrl || ""}
                          alt="Schedule preview"
                          width={1200}
                          height={800}
                          unoptimized
                          style={{ objectFit: "contain" }}
                          className="w-full h-auto max-h-[420px] mx-auto"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-emerald-700">{selectedFile.name}</p>
                        <p className="text-xs text-emerald-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 border border-emerald-200"
                        >
                          Change Photo
                        </button>
                        <button
                          onClick={() => {
                            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                            setFilePreviewUrl(null);
                            setSelectedFile(null);
                          }}
                          className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium rounded-lg hover:bg-red-50 border border-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                        <DocumentArrowUpIcon className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        Drag & drop a photo of the daily schedule here
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                      >
                        Browse Files
                      </button>
                      <p className="text-xs text-slate-400">JPG, PNG or WEBP · up to 20MB</p>
                    </div>
                  )}
                </div>

                {extractError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
                    <p className="text-sm text-red-700 font-medium">{extractError}</p>
                    <p className="text-xs text-red-600">
                      You can still add classes manually — close this and use &quot;Add Schedule&quot;.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={!selectedFile || extracting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {extracting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Reading schedule… this can take up to a minute
                      </>
                    ) : (
                      "Extract Schedule"
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <>
                {/* What was DETECTED, always — not only when something was
                    rejected. A silent summary is what let a one-cell reading of
                    a 23-row timetable pass as a finished job. */}
                {extractNotice?.summary && (
                  <div
                    className={`shrink-0 mx-4 sm:mx-5 mt-3 rounded-lg border px-3 py-2 ${
                      extractNotice.incomplete
                        ? "border-red-300 bg-red-50"
                        : extractNotice.summary.needsReview > 0 || extractNotice.rejectedCount > 0
                          ? "border-amber-300 bg-amber-50"
                          : "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        extractNotice.incomplete
                          ? "text-red-900"
                          : extractNotice.summary.needsReview > 0 || extractNotice.rejectedCount > 0
                            ? "text-amber-900"
                            : "text-emerald-900"
                      }`}
                    >
                      {extractNotice.incomplete
                        ? "This reading looks incomplete"
                        : `Detected ${extractNotice.summary.sections} timetable section${
                            extractNotice.summary.sections === 1 ? "" : "s"
                          }`}
                    </p>
                    <ul className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-xs text-slate-700">
                      <li>{extractNotice.summary.sections} timetable sections</li>
                      <li>{extractNotice.summary.rowLabels} class/batch rows</li>
                      <li>{extractNotice.summary.timeColumns} time slots</li>
                      <li>{extractNotice.summary.populatedCells} populated cells</li>
                      <li>{extractNotice.summary.offCells} OFF cells ignored</li>
                      <li>{extractNotice.summary.rejectedCells} cells rejected</li>
                      <li className="font-medium text-emerald-800">
                        {extractNotice.summary.resolved} extracted
                      </li>
                      <li className="font-medium text-amber-800">
                        {extractNotice.summary.needsReview} need review
                      </li>
                      <li className="font-medium text-slate-800">
                        {extractNotice.summary.entries} entries total
                      </li>
                    </ul>
                    {extractNotice.warnings.length > 0 && (
                      <ul className="mt-1.5 list-inside list-disc text-xs text-slate-700">
                        {extractNotice.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                    {extractNotice.incomplete && (
                      <label className="mt-2 flex items-start gap-2 text-xs text-red-900">
                        <input
                          type="checkbox"
                          checked={incompleteAcknowledged}
                          onChange={(e) => setIncompleteAcknowledged(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          I have compared this against the photo and the classes above are correct.
                          Anything missing can be added with Add Row.
                        </span>
                      </label>
                    )}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <ScheduleImportReviewPanel
                    imageUrl={imageUrl}
                    date={scheduleDate}
                    onDateChange={setScheduleDate}
                    entries={entries}
                    onEntriesChange={setEntries}
                    issues={issues}
                    validating={validating}
                    batches={batches}
                    teachers={teachers}
                    timeSlots={visibleTimeSlots}
                    classLevels={classLevels}
                  />
                </div>
                <div className="shrink-0 border-t border-slate-200 px-4 sm:px-5 py-2 flex items-center justify-between gap-3">
                  <div className="text-[12px]">
                    {saveError ? (
                      <span className="text-red-600 font-medium">{saveError}</span>
                    ) : (
                      <button
                        onClick={resetAll}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50"
                      >
                        Start Over
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {unresolvedCount > 0 && (
                      <span className="text-[12px] text-amber-700">
                        {unresolvedCount} {unresolvedCount === 1 ? "entry needs" : "entries need"} review
                      </span>
                    )}
                    <button
                      onClick={handleConfirmSave}
                      disabled={saving || validating || hasBlockingIssue || entries.length === 0 || saveBlockedByIncomplete}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? "Saving…" : "Save Schedule"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === "done" && (
              <div className="flex-1 overflow-auto p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircleIcon className="w-9 h-9 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800">Schedule saved</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {savedCounts?.created ?? 0} class{savedCounts?.created === 1 ? "" : "es"} added for{" "}
                    {scheduleDate} · {savedCounts?.studentsNotified ?? 0} batch group
                    {savedCounts?.studentsNotified === 1 ? "" : "s"} and {savedCounts?.teachersNotified ?? 0}{" "}
                    teacher{savedCounts?.teachersNotified === 1 ? "" : "s"} notified.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled
                    title="WhatsApp broadcast — coming in Phase 2"
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-medium bg-slate-50 cursor-not-allowed"
                  >
                    Send to All (Phase 2)
                  </button>
                  <button
                    onClick={() => {
                      onImported(scheduleDate);
                      resetAll();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-500/25"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
