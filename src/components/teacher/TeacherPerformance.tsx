"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "../../lib/api";

interface StudentPerformance {
  _id: string;
  studentName: string;
  studentEmail: string;
  studentBatch: string;
  totalAttempts: number;
  avgScore: number;
  maxScore: number;
  totalCorrect: number;
  totalWrong: number;
  totalQuestions: number;
  accuracy: number;
}

interface BatchStat {
  batch: string;
  avgScore: number;
  totalAttempts: number;
  studentCount: number;
}

export default function TeacherPerformance() {
  const [performance, setPerformance] = useState<StudentPerformance[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"avgScore" | "accuracy" | "totalAttempts">("avgScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchPerformance = useCallback(async () => {
    try {
      const params = selectedBatch ? `?batch=${encodeURIComponent(selectedBatch)}` : "";
      const res = await apiFetch(`/teacher/performance${params}`) as { performance: StudentPerformance[]; batchStats: BatchStat[] };
      setPerformance(res?.performance || []);
      setBatchStats(res?.batchStats || []);
    } catch (error) {
      console.error("Error fetching performance:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const sortedPerformance = [...performance].sort((a, b) => {
    const multiplier = sortOrder === "desc" ? -1 : 1;
    return (a[sortBy] - b[sortBy]) * multiplier;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Batch", "Attempts", "Avg Score", "Max Score", "Accuracy %"];
    const rows = sortedPerformance.map((p) => [
      p.studentName,
      p.studentEmail,
      p.studentBatch,
      p.totalAttempts,
      p.avgScore.toFixed(1),
      p.maxScore.toFixed(1),
      p.accuracy.toFixed(1),
    ]);
    
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 shadow-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Performance Reports</h1>
            <p className="text-white/80 mt-1">Track student performance and identify areas for improvement</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white/20 backdrop-blur text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </motion.button>
        </div>
      </motion.div>

      {/* Batch Stats */}
      {batchStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {batchStats.map((stat, i) => (
            <motion.div
              key={stat.batch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedBatch(selectedBatch === stat.batch ? "" : stat.batch)}
              className={`p-5 rounded-xl shadow-sm border-2 cursor-pointer transition-all ${
                selectedBatch === stat.batch
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-100 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${selectedBatch === stat.batch ? "text-blue-700" : "text-gray-800"}`}>
                  {stat.batch}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  stat.avgScore >= 70
                    ? "bg-green-100 text-green-700"
                    : stat.avgScore >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {stat.avgScore.toFixed(0)}% avg
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{stat.studentCount} students</span>
                <span>{stat.totalAttempts} attempts</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {selectedBatch && (
            <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
              Batch: {selectedBatch}
              <button onClick={() => setSelectedBatch("")} className="hover:bg-blue-200 rounded-full p-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sort by:</span>
          {["avgScore", "accuracy", "totalAttempts"].map((field) => (
            <button
              key={field}
              onClick={() => handleSort(field as typeof sortBy)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === field
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {field === "avgScore" ? "Score" : field === "accuracy" ? "Accuracy" : "Attempts"}
              {sortBy === field && (
                <span className="ml-1">{sortOrder === "desc" ? "↓" : "↑"}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {sortedPerformance.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No performance data</h3>
            <p className="text-gray-400">
              {selectedBatch
                ? `No data available for ${selectedBatch}`
                : "Student performance data will appear here after exams are completed"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm hidden md:table-cell">Batch</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">Attempts</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">Avg Score</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">Max Score</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPerformance.map((student, index) => (
                  <motion.tr
                    key={student._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {student.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{student.studentName}</p>
                          <p className="text-xs text-gray-500">{student.studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {student.studentBatch}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-700">
                      {student.totalAttempts}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-12 h-7 rounded-full text-sm font-medium ${
                        student.avgScore >= 70
                          ? "bg-green-100 text-green-700"
                          : student.avgScore >= 50
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {student.avgScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-gray-700 font-medium">
                        {student.maxScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              student.accuracy >= 70
                                ? "bg-green-500"
                                : student.accuracy >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(student.accuracy, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-10">
                          {student.accuracy.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
