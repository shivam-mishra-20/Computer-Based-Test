"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";
import ElegantLoader from "../ElegantLoader";

interface ExamPreview {
  examId: string;
  title: string;
  teacherName?: string;
  subject?: string;
  durationMins?: number;
  totalQuestions: number;
  markingScheme?: { correct: number; incorrect: number; unattempted: number };
  instructions?: string;
  antiCheat: boolean;
  schedule?: { startAt?: string; endAt?: string; timezone?: string };
  serverNow: string;
}

interface Props {
  examId: string;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function ExamWaitingRoom({ examId }: Props) {
  const [preview, setPreview] = useState<ExamPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [starting, setStarting] = useState(false);
  // serverNow - Date.now() at load time, so the countdown is anchored to the
  // server's clock rather than trusting the device's (which a student could
  // set back to delay the unlock, or forward to fake an early one).
  const clockOffsetRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await apiFetch(`/attempts/${examId}/preview`)) as ExamPreview;
        if (cancelled) return;
        clockOffsetRef.current = new Date(data.serverNow).getTime() - Date.now();
        setPreview(data);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { message?: string };
        setError(err?.message || "Failed to load exam");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const attempt = (await apiFetch(`/attempts/${examId}/start`, {
        method: "POST",
      })) as { _id: string };
      window.location.href = `/dashboard/exam/${attempt._id}?attempt=1`;
    } catch (e: unknown) {
      const err = e as { data?: { message?: string; code?: string }; message?: string };
      setError(err?.data?.message || err?.message || "Failed to start exam");
      setStarting(false);
    }
  }

  const serverNow = now + clockOffsetRef.current;
  const startAt = preview?.schedule?.startAt ? new Date(preview.schedule.startAt).getTime() : undefined;
  const endAt = preview?.schedule?.endAt ? new Date(preview.schedule.endAt).getTime() : undefined;
  const notStarted = !!startAt && serverNow < startAt;
  const ended = !!endAt && serverNow > endAt;
  const unlocked = !notStarted && !ended;

  return (
    <Protected requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {!preview && !error && (
            <div className="flex items-center justify-center py-12">
              <ElegantLoader size="lg" text="Loading exam..." />
            </div>
          )}

          {error && !preview && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
          )}

          {preview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 lg:p-8 space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{preview.title}</h1>
                  {(preview.teacherName || preview.subject) && (
                    <p className="text-slate-600 mt-1">
                      {[preview.teacherName, preview.subject].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-700">
                      {preview.durationMins ?? "—"}
                    </div>
                    <div className="text-xs text-emerald-600">Minutes</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-700">{preview.totalQuestions}</div>
                    <div className="text-xs text-emerald-600">Questions</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-700">
                      +{preview.markingScheme?.correct ?? 1}
                    </div>
                    <div className="text-xs text-emerald-600">Per Correct</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-700">
                      {preview.markingScheme?.incorrect ? preview.markingScheme.incorrect : "0"}
                    </div>
                    <div className="text-xs text-emerald-600">Negative Marking</div>
                  </div>
                </div>

                {preview.instructions && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-2">Instructions</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{preview.instructions}</p>
                  </div>
                )}

                {preview.antiCheat && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-900 mb-1">Proctoring is enabled</h3>
                    <ul className="text-amber-800 text-sm list-disc pl-5 space-y-1">
                      <li>Stay on this tab — switching away or minimizing is logged.</li>
                      <li>Repeated warnings will auto-submit your exam.</li>
                      <li>Keep a stable internet connection where possible.</li>
                    </ul>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="border-t border-slate-100 pt-6 flex flex-col items-center gap-4">
                  {notStarted && startAt && (
                    <div className="text-center">
                      <p className="text-slate-500 text-sm mb-1">Exam starts in</p>
                      <p className="text-4xl font-mono font-bold text-emerald-700">
                        {formatCountdown(startAt - serverNow)}
                      </p>
                    </div>
                  )}
                  {ended && (
                    <p className="text-red-600 font-medium">
                      This exam has ended or the entry window has closed.
                    </p>
                  )}
                  <motion.button
                    whileHover={unlocked ? { scale: 1.02 } : undefined}
                    whileTap={unlocked ? { scale: 0.98 } : undefined}
                    onClick={handleStart}
                    disabled={!unlocked || starting}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
                  >
                    {starting
                      ? "Starting..."
                      : ended
                      ? "Exam Closed"
                      : notStarted
                      ? "Exam has not started yet."
                      : "Start Exam"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </Protected>
  );
}
