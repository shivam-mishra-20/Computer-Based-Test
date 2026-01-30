"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";

type AttendanceRow = {
  userId: string;
  startedAt?: string;
  submittedAt?: string;
  status?: string;
};

export default function AdminReports() {
  const [examId, setExamId] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // For animation refresh

  const load = useCallback(async () => {
    if (!examId) {
      setAttendance([]);
      return;
    }
    setLoading(true);
    try {
      const data = (await apiFetch(
        `/reports/exams/${examId}/attendance`
      )) as { attended?: AttendanceRow[] };
      setAttendance(data.attended || []);
      setRefreshKey((prev) => prev + 1);
    } catch {
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-600";

    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-50 text-green-600";
      case "started":
        return "bg-blue-50 text-blue-600";
      case "expired":
        return "bg-red-50 text-red-600";
      case "pending":
        return "bg-yellow-50 text-yellow-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <motion.h2
        className="text-2xl font-semibold mb-6 text-accent"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        Attendance Reports
      </motion.h2>

      <motion.div
        className="flex flex-wrap gap-3 items-center mb-6 bg-white/80 backdrop-blur p-4 rounded-xl shadow-sm border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex-grow flex gap-3">
          <input
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            placeholder="Enter Exam ID"
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-cta/30 focus:border-cta transition-all duration-200"
          />
          <motion.button
            onClick={load}
            className="px-5 py-2.5 rounded-lg bg-cta text-white text-sm font-medium shadow-sm hover:bg-cta/90 transition-colors"
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  className="h-2 w-2 bg-white rounded-full"
                  animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                Loading...
              </span>
            ) : (
              "Generate Report"
            )}
          </motion.button>
        </div>

        {examId && (
          <motion.a
            href="#"
            onClick={(e) => {
              e.preventDefault();
            const apiBase =
              process.env.NEXT_PUBLIC_API_BASE_URL ||
              "http://localhost:5000/api";
            window.open(
              `${apiBase}/reports/exams/${examId}/results.csv`,
              "_blank"
            );
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download CSV
          </motion.a>
        )}
      </motion.div>

      <motion.div
        className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  User ID
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Started At
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Submitted At
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.tr
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={4} className="px-6 py-8 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <motion.div
                          className="h-2.5 w-2.5 rounded-full bg-primary"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            repeatDelay: 0.2,
                          }}
                        />
                        <motion.div
                          className="h-2.5 w-2.5 rounded-full bg-primary/80"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            repeatDelay: 0.2,
                            delay: 0.1,
                          }}
                        />
                        <motion.div
                          className="h-2.5 w-2.5 rounded-full bg-primary/60"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            repeatDelay: 0.2,
                            delay: 0.2,
                          }}
                        />
                        <span className="ml-2 text-gray-500 font-medium">
                          Loading attendance data...
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                )}

                {!loading && attendance.length > 0 && (
                  <motion.tr key="attendance-list">
                    <td colSpan={4} className="p-0">
                      <motion.div
                        key={refreshKey}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {attendance.map((row, i) => (
                          <motion.tr
                            key={i}
                            variants={itemVariants}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                            style={{ display: "table-row" }}
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                                {row.userId}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {row.startedAt ? (
                                <div className="flex flex-col">
                                  <span>
                                    {new Date(
                                      row.startedAt
                                    ).toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      row.startedAt
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {row.submittedAt ? (
                                <div className="flex flex-col">
                                  <span>
                                    {new Date(
                                      row.submittedAt
                                    ).toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      row.submittedAt
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  row.status
                                )}`}
                              >
                                {row.status || "Unknown"}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </motion.div>
                    </td>
                  </motion.tr>
                )}

                {!loading && !attendance.length && (
                  <motion.tr
                    key="no-data"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring" as const,
                            stiffness: 300,
                            damping: 15,
                            delay: 0.2,
                          }}
                          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </motion.div>
                        <p className="text-gray-500 font-medium">
                          No attendance data available
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          {examId
                            ? "No students have attempted this exam yet"
                            : "Enter an exam ID to generate a report"}
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
