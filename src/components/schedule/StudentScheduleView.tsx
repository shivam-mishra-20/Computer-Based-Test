"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";

interface Schedule {
  _id: string;
  title?: string;
  scheduleType: "regular" | "custom";
  type: "class" | "exam" | "event" | "holiday";
  subject: string;
  classLevel: string;
  batch: string;
  roomNumber: number;
  teacherName?: string;
  startTimeSlot: string;
  endTimeSlot: string;
  date?: string;
  dayOfWeek?: number;
  status?: "completed" | "ongoing" | "upcoming";
}

interface LiveSchedule {
  currentClass: Schedule | null;
  nextClass: Schedule | null;
  todaySchedule: Schedule[];
  currentTime: string;
  dayOfWeek: number;
  currentSlot: string | null;
  nextSlot: string | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentScheduleView() {
  const [liveSchedule, setLiveSchedule] = useState<LiveSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user] = useState(getUser());

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/schedule/live");
      setLiveSchedule(data as LiveSchedule);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
    
    // Refresh every minute
    const interval = setInterval(loadSchedule, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-slate-100 border-slate-300 text-slate-600";
      case "ongoing":
        return "bg-emerald-100 border-emerald-500 text-emerald-700";
      case "upcoming":
        return "bg-blue-100 border-blue-500 text-blue-700";
      default:
        return "bg-slate-100 border-slate-300 text-slate-600";
    }
  };

  const ClassCard = ({ schedule, size = "normal" }: { schedule: Schedule; size?: "normal" | "large" }) => {
    const isLarge = size === "large";
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl border-2 shadow-lg p-6 ${getStatusColor(schedule.status)} ${
          isLarge ? "col-span-full" : ""
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {schedule.status === "ongoing" && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
              <span className={`text-xs font-bold uppercase tracking-wide ${
                schedule.status === "ongoing" ? "text-emerald-700" :
                schedule.status === "upcoming" ? "text-blue-700" :
                "text-slate-600"
              }`}>
                {schedule.status || "Scheduled"}
              </span>
            </div>
            <h3 className={`font-bold ${isLarge ? "text-3xl" : "text-xl"} text-slate-900 mb-2`}>
              {schedule.subject}
            </h3>
            {schedule.title && (
              <p className="text-sm text-slate-600 mb-2">{schedule.title}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-700">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">
                  {schedule.startTimeSlot} - {schedule.endTimeSlot}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Room {schedule.roomNumber}</span>
              </div>
            </div>
          </div>
          
          {schedule.teacherName && (
            <div className="ml-4 flex-shrink-0">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Teacher</div>
                <div className="font-semibold text-slate-800">{schedule.teacherName}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-current/20">
          <div className="flex items-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/50 font-medium">
              Class {schedule.classLevel}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/50 font-medium">
              {schedule.batch}
            </span>
          </div>
          {schedule.scheduleType === "custom" && (
            <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
              Special Class
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full border-2 border-red-200">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-red-900 mb-2 text-center">Error</h2>
          <p className="text-red-700 text-center mb-4">{error}</p>
          <button
            onClick={loadSchedule}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            My Schedule
          </h1>
          <div className="flex items-center gap-4 text-slate-600">
            <span className="font-medium">{DAYS[liveSchedule?.dayOfWeek || 0]}</span>
            <span>•</span>
            <span>{new Date(liveSchedule?.currentTime || new Date()).toLocaleDateString()}</span>
            {user && (
              <>
                <span>•</span>
                <span className="font-medium">Class {user.classLevel}</span>
                {user.batch && (
                  <>
                    <span>•</span>
                    <span className="font-medium">{user.batch}</span>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Current & Next Class */}
        {(liveSchedule?.currentClass || liveSchedule?.nextClass) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {liveSchedule?.currentClass && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  Current Class
                </h2>
                <ClassCard schedule={liveSchedule.currentClass} size="large" />
              </div>
            )}
            
            {liveSchedule?.nextClass && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  Next Class
                </h2>
                <ClassCard schedule={liveSchedule.nextClass} size="large" />
              </div>
            )}
          </div>
        )}

        {/* Today's Full Schedule */}
        {liveSchedule?.todaySchedule && liveSchedule.todaySchedule.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Today&apos;s Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveSchedule.todaySchedule.map((schedule) => (
                <ClassCard key={schedule._id} schedule={schedule} />
              ))}
            </div>
          </div>
        )}

        {!liveSchedule?.todaySchedule?.length && !liveSchedule?.currentClass && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-slate-200"
          >
            <svg className="w-24 h-24 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              No Classes Today
            </h3>
            <p className="text-slate-600">
              Enjoy your day off! Check back tomorrow for your schedule.
            </p>
          </motion.div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={loadSchedule}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
