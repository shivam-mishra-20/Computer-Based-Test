"use client";
import React, { useState } from "react";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PlaylistVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  position: number;
  durationSec: number;
}

interface PlaylistMeta {
  playlistId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelName: string;
  totalVideos: number;
}

interface PreviewData {
  playlistId: string;
  meta: PlaylistMeta;
  videos: PlaylistVideo[];
  totalVideos: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const CLASSES = ["8", "9", "10", "11", "12"];
const SUBJECTS = ["Science","Physics", "Chemistry", "Mathematics", "Biology", "English", "Hindi", "Accounts", "Economics", "Business Studies", "History", "Geography", "Civics"];

// ─── Step indicators ───────────────────────────────────────────────────────

function StepDot({ n, current, label }: { n: number; current: number; label: string }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          done
            ? "bg-emerald-600 text-white"
            : active
            ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          n
        )}
      </div>
      <span className={`text-sm font-medium ${active ? "text-slate-800" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ImportPlaylistPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 form
  const [classLevel, setClassLevel] = useState("11");
  const [subject, setSubject] = useState("Physics");
  const [isFree, setIsFree] = useState(false);

  // Step 2 form
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Step 3 form (editable course details)
  const [courseName, setCourseName] = useState("");
  const [moduleName, setModuleName] = useState("");

  // Import state
  const [importing, setImporting] = useState(false);

  // ── Step 2: preview playlist ─────────────────────────────────────────────
  const handlePreview = async () => {
    if (!playlistUrl.trim()) {
      toast.error("Paste a YouTube playlist URL first");
      return;
    }
    setPreviewing(true);
    setPreview(null);
    try {
      const data = await apiFetch("/playlist/preview", {
        method: "POST",
        body: JSON.stringify({ playlistUrl: playlistUrl.trim() }),
      }) as PreviewData;

      setPreview(data);
      setCourseName(data.meta.title);
      setModuleName(data.meta.title);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch playlist");
    } finally {
      setPreviewing(false);
    }
  };

  // ── Step 3: import ───────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!courseName.trim()) {
      toast.error("Course name is required");
      return;
    }
    if (!preview) return;

    setImporting(true);
    try {
      const result = await apiFetch("/playlist/import", {
        method: "POST",
        body: JSON.stringify({
          classLevel,
          subject,
          courseName: courseName.trim(),
          playlistUrl: playlistUrl.trim(),
          isFree,
          moduleName: moduleName.trim() || undefined,
        }),
      }) as { courseId: string; courseTitle: string; lectureCount: number; message: string };

      toast.success(result.message);
      router.push(`/dashboard/admin/app-management/courses/${result.courseId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      if (message?.includes("already been imported")) {
        toast.error(message);
      } else {
        toast.error(message ?? "Import failed");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Protected requiredRole="admin">
      <main className="p-6 font-poppins min-h-screen">
        <DashboardHeader
          title="Import from YouTube Playlist"
          subtitle="Automatically create a course from a YouTube playlist"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          }
          breadcrumbs={[
            { label: "App Management", href: "/dashboard/admin/app-management" },
            { label: "Courses", href: "/dashboard/admin/app-management/courses" },
            { label: "Import from Playlist" },
          ]}
        />

        {/* Step indicators */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-6">
          <StepDot n={1} current={step} label="Course Details" />
          <div className="flex-1 h-px bg-slate-200" />
          <StepDot n={2} current={step} label="Playlist URL" />
          <div className="flex-1 h-px bg-slate-200" />
          <StepDot n={3} current={step} label="Preview & Import" />
        </div>

        <div className="mt-4 max-w-2xl">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Course Details ─────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
              >
                <h2 className="font-semibold text-slate-800 text-lg">Step 1 — Course Details</h2>
                <p className="text-sm text-slate-500">
                  Select the class and subject this course belongs to.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
                    <select
                      value={classLevel}
                      onChange={e => setClassLevel(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {CLASSES.map(c => (
                        <option key={c} value={c}>Class {c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                    <select
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFree(!isFree)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isFree ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        isFree ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-slate-700">
                    Free course <span className="text-slate-400">(students can access without enrollment)</span>
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Playlist URL ───────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
              >
                <h2 className="font-semibold text-slate-800 text-lg">Step 2 — YouTube Playlist URL</h2>
                <p className="text-sm text-slate-500">
                  Paste any YouTube playlist URL. The system will fetch all videos automatically.
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Playlist URL *</label>
                  <input
                    type="url"
                    value={playlistUrl}
                    onChange={e => setPlaylistUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePreview()}
                    placeholder="https://youtube.com/playlist?list=PLxxxxxxxx"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Supports: youtube.com/playlist?list=... · youtu.be playlists · any YouTube URL with list=
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={previewing || !playlistUrl.trim()}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {previewing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Fetching playlist...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview Playlist
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Preview & Import ───────────────────────────────── */}
            {step === 3 && preview && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Playlist summary card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex gap-4 p-5">
                    {preview.meta.thumbnail && (
                      <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <Image
                          src={preview.meta.thumbnail}
                          alt={preview.meta.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          YouTube Playlist
                        </span>
                        <span className="text-xs text-slate-500">{preview.meta.channelName}</span>
                      </div>
                      <p className="font-semibold text-slate-900 truncate">{preview.meta.title}</p>
                      {preview.meta.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{preview.meta.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                        <span className="font-medium text-emerald-700">{preview.totalVideos} lectures</span>
                        <span>Class {classLevel} · {subject}</span>
                        {isFree && <span className="text-blue-600 font-medium">Free</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable course name & module name */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <h3 className="font-semibold text-slate-800">Course Configuration</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Course Name *
                      <span className="ml-1 text-slate-400 font-normal">(auto-filled from playlist title)</span>
                    </label>
                    <input
                      type="text"
                      value={courseName}
                      onChange={e => setCourseName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Module Name
                      <span className="ml-1 text-slate-400 font-normal">(the single module that will hold all lectures)</span>
                    </label>
                    <input
                      type="text"
                      value={moduleName}
                      onChange={e => setModuleName(e.target.value)}
                      placeholder="All Lectures"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Lecture list preview */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">
                      Lectures Preview
                      <span className="ml-2 text-sm font-normal text-slate-500">({preview.videos.length} total)</span>
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {preview.videos.map((v, i) => (
                      <div key={v.videoId} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                        <span className="w-7 text-center text-xs text-slate-400 font-medium flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="relative w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-slate-100">
                          {v.thumbnail ? (
                            <Image src={v.thumbnail} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full bg-slate-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 truncate">{v.title}</p>
                        </div>
                        {v.durationSec > 0 && (
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatDuration(v.durationSec)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => { setStep(2); setPreview(null); }}
                    className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Change playlist
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || !courseName.trim()}
                    className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Importing {preview.totalVideos} lectures...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import Course ({preview.totalVideos} lectures)
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  The course will be saved as a <strong>Draft</strong>. Publish it from the course editor when ready.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </Protected>
  );
}
