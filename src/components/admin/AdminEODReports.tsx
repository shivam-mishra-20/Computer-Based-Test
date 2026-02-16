"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";

interface ClassReport {
  subject: string;
  classLevel: string;
  batch: string;
  startTime: string;
  endTime: string;
  wasHeld: boolean;
  topicsCovered?: string;
  homework?: string;
  studentsPresent?: number;
  studentsAbsent?: number;
  remarks?: string;
}

interface EODReport {
  _id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  classes: ClassReport[];
  additionalNotes?: string;
  submittedAt: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
  status: "pending" | "reviewed" | "flagged";
}

interface Stats {
  statusCounts: { pending?: number; reviewed?: number; flagged?: number };
  submissionStats: {
    totalSubmissions?: number;
    avgClassesPerDay?: number;
    totalClassesConducted?: number;
  };
  topTeachers: Array<{
    _id: string;
    teacherName: string;
    submissionCount: number;
    lastSubmission: string;
  }>;
}

export default function AdminEODReports() {
  const [reports, setReports] = useState<EODReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: "reviewed" as "reviewed" | "flagged",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("startDate", dateRange.start);
      params.append("endDate", dateRange.end);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const data = await apiFetch(`/eod/admin/all?${params.toString()}`) as { eods: EODReport[] };
      setReports(data.eods || []);
    } catch (error) {
      console.error("Error fetching EOD reports:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("startDate", dateRange.start);
      params.append("endDate", dateRange.end);

      const data = await apiFetch(`/eod/admin/stats?${params.toString()}`) as Stats;
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [fetchReports, fetchStats]);

  const handleReview = async () => {
    if (!selectedReport) return;

    try {
      setSubmitting(true);
      const updated = await apiFetch(
        `/eod/admin/${selectedReport._id}/review`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: reviewData.status,
            reviewNotes: reviewData.notes,
          }),
        }
      ) as EODReport;

      // Update local state
      setReports(
        reports.map((r) => (r._id === selectedReport._id ? updated : r))
      );
      setReviewModal(false);
      setSelectedReport(null);
      setReviewData({ status: "reviewed", notes: "" });
      fetchStats();
    } catch (error) {
      alert((error as Error).message || "Failed to review EOD");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "reviewed":
        return "bg-green-100 text-green-700 border-green-200";
      case "flagged":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-8 shadow-lg"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          EOD Reports Management
        </h1>
        <p className="text-white/80 mt-1">
          Review and manage teacher end-of-day submissions
        </p>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.submissionStats.totalSubmissions || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.statusCounts.pending || 0}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Classes Conducted</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.submissionStats.totalClassesConducted || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Classes/Day</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.submissionStats.avgClassesPerDay?.toFixed(1) || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No EOD Reports Found
            </h3>
            <p className="text-gray-400">
              No reports match your current filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    Teacher
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                    Classes
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                    Held
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                    Submitted
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => {
                  const heldClasses = report.classes.filter(
                    (c) => c.wasHeld
                  ).length;
                  return (
                    <motion.tr
                      key={report._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {new Date(report.date).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {report.teacherName}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-gray-600">
                          {report.classes.length}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-medium text-green-600">
                          {heldClasses}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            report.status
                          )}`}
                        >
                          {report.status.charAt(0).toUpperCase() +
                            report.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <p className="text-xs text-gray-500">
                          {new Date(report.submittedAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setReviewModal(true);
                            setReviewData({
                              status:
                                report.status === "pending"
                                  ? "reviewed"
                                  : report.status === "flagged"
                                  ? "reviewed"
                                  : "reviewed",
                              notes: report.reviewNotes || "",
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      EOD Report Details
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedReport.teacherName} •{" "}
                      {new Date(selectedReport.date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Classes */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Classes ({selectedReport.classes.length})
                  </h4>
                  <div className="space-y-4">
                    {selectedReport.classes.map((cls, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-semibold text-gray-900">
                              {cls.subject}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {cls.classLevel} - {cls.batch} • {cls.startTime} -{" "}
                              {cls.endTime}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              cls.wasHeld
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {cls.wasHeld ? "Held" : "Not Held"}
                          </span>
                        </div>

                        {cls.wasHeld && (
                          <div className="space-y-2 text-sm">
                            {cls.topicsCovered && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Topics:
                                </span>
                                <p className="text-gray-600 mt-1">
                                  {cls.topicsCovered}
                                </p>
                              </div>
                            )}
                            {cls.homework && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Homework:
                                </span>
                                <p className="text-gray-600 mt-1">
                                  {cls.homework}
                                </p>
                              </div>
                            )}
                            {(cls.studentsPresent !== undefined ||
                              cls.studentsAbsent !== undefined) && (
                              <div className="flex gap-4">
                                {cls.studentsPresent !== undefined && (
                                  <span className="text-green-600">
                                    ✓ Present: {cls.studentsPresent}
                                  </span>
                                )}
                                {cls.studentsAbsent !== undefined && (
                                  <span className="text-red-600">
                                    ✗ Absent: {cls.studentsAbsent}
                                  </span>
                                )}
                              </div>
                            )}
                            {cls.remarks && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Remarks:
                                </span>
                                <p className="text-gray-600 mt-1">
                                  {cls.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {!cls.wasHeld && cls.remarks && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">
                              Reason:
                            </span>
                            <p className="text-gray-600 mt-1">{cls.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                {selectedReport.additionalNotes && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Additional Notes
                    </h4>
                    <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                      {selectedReport.additionalNotes}
                    </p>
                  </div>
                )}

                {/* Review Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Review Status
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            setReviewData({ ...reviewData, status: "reviewed" })
                          }
                          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            reviewData.status === "reviewed"
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() =>
                            setReviewData({ ...reviewData, status: "flagged" })
                          }
                          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            reviewData.status === "flagged"
                              ? "bg-red-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          ⚠ Flag for Review
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Notes (Optional)
                      </label>
                      <textarea
                        value={reviewData.notes}
                        onChange={(e) =>
                          setReviewData({ ...reviewData, notes: e.target.value })
                        }
                        rows={3}
                        placeholder="Add any comments or feedback..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {selectedReport.reviewedBy && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <strong>Previously reviewed by:</strong>{" "}
                          {selectedReport.reviewedBy.name} on{" "}
                          {new Date(
                            selectedReport.reviewedAt!
                          ).toLocaleString()}
                        </p>
                        {selectedReport.reviewNotes && (
                          <p className="text-sm text-blue-800 mt-2">
                            <strong>Notes:</strong> {selectedReport.reviewNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setReviewModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
