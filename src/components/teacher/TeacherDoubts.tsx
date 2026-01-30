"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";

interface Doubt {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
    classLevel?: string;
    batch?: string;
  };
  teacher?: {
    name: string;
    email: string;
  };
  subject: string;
  topic?: string;
  chapter?: string;
  question: string;
  images?: string[];
  status: "pending" | "in-progress" | "resolved";
  reply?: string;
  replyImages?: string[];
  repliedAt?: string;
  priority: "low" | "normal" | "high";
  createdAt: string;
}

interface DoubtStats {
  pending?: number;
  "in-progress"?: number;
  resolved?: number;
}

export default function TeacherDoubts() {
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [stats, setStats] = useState<DoubtStats>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "resolved">("all");
  const [selectedDoubt, setSelectedDoubt] = useState<Doubt | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchDoubts = useCallback(async () => {
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await apiFetch(`/doubts/teacher${params}`) as { doubts: Doubt[]; stats: DoubtStats };
      setDoubts(res?.doubts || []);
      setStats(res?.stats || {});
    } catch (error) {
      console.error("Error fetching doubts:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDoubts();
  }, [fetchDoubts]);

  const handleReply = async () => {
    if (!selectedDoubt || !reply.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/doubts/${selectedDoubt._id}/reply`, { method: "PUT", body: JSON.stringify({ reply }) });
      setReply("");
      setSelectedDoubt(null);
      fetchDoubts();
    } catch (error) {
      console.error("Error replying:", error);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await apiFetch(`/doubts/${id}/resolve`, { method: "PUT" });
      fetchDoubts();
      if (selectedDoubt?._id === id) {
        setSelectedDoubt(null);
      }
    } catch (error) {
      console.error("Error resolving:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "resolved":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full"
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
        className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-8 shadow-lg"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white">Doubt Management</h1>
        <p className="text-white/80 mt-1">Help your students by resolving their doubts</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending", value: stats.pending || 0, color: "amber", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
          { label: "In Progress", value: stats["in-progress"] || 0, color: "blue", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
          { label: "Resolved", value: stats.resolved || 0, color: "green", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <svg className={`w-5 h-5 text-${stat.color}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["all", "pending", "in-progress", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              filter === f
                ? "bg-amber-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Doubts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {doubts.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center border border-dashed border-gray-300">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No doubts found</h3>
            <p className="text-gray-400">
              {filter === "all"
                ? "No student doubts to show"
                : `No ${filter.replace("-", " ")} doubts`}
            </p>
          </div>
        ) : (
          doubts.map((doubt, index) => (
            <motion.div
              key={doubt._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-md cursor-pointer ${
                selectedDoubt?._id === doubt._id
                  ? "border-amber-400"
                  : "border-gray-100 hover:border-amber-200"
              }`}
              onClick={() => {
                setSelectedDoubt(doubt);
                setReply(doubt.reply || "");
              }}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-medium">
                      {doubt.student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{doubt.student.name}</p>
                      <p className="text-xs text-gray-500">
                        {doubt.student.batch} · {formatDate(doubt.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(doubt.status)}`}>
                    {doubt.status}
                  </span>
                </div>

                {/* Subject & Topic */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {doubt.subject}
                  </span>
                  {doubt.chapter && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {doubt.chapter}
                    </span>
                  )}
                  {doubt.topic && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">
                      {doubt.topic}
                    </span>
                  )}
                </div>

                {/* Question */}
                <p className="text-gray-700 text-sm line-clamp-2">{doubt.question}</p>

                {/* Images indicator */}
                {doubt.images && doubt.images.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {doubt.images.length} image{doubt.images.length > 1 ? "s" : ""} attached
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedDoubt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDoubt(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedDoubt.student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{selectedDoubt.student.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedDoubt.student.email} · {selectedDoubt.student.batch}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoubt(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-sm px-3 py-1 rounded-full border ${getStatusColor(selectedDoubt.status)}`}>
                    {selectedDoubt.status}
                  </span>
                  <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {selectedDoubt.subject}
                  </span>
                  {selectedDoubt.chapter && (
                    <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      {selectedDoubt.chapter}
                    </span>
                  )}
                </div>

                {/* Question */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Question</p>
                  <p className="text-gray-800">{selectedDoubt.question}</p>
                </div>

                {/* Images */}
                {selectedDoubt.images && selectedDoubt.images.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Attached Images</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedDoubt.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Attachment ${i + 1}`}
                          className="rounded-lg border border-gray-200 w-full h-40 object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Reply */}
                {selectedDoubt.reply && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-sm font-medium text-green-700 mb-2">Your Previous Reply</p>
                    <p className="text-gray-800">{selectedDoubt.reply}</p>
                    {selectedDoubt.repliedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Replied on {formatDate(selectedDoubt.repliedAt)}
                      </p>
                    )}
                  </div>
                )}

                {/* Reply Input */}
                {selectedDoubt.status !== "resolved" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedDoubt.reply ? "Update Reply" : "Your Reply"}
                    </label>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={4}
                      placeholder="Type your reply to help the student..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                {selectedDoubt.status !== "resolved" && (
                  <>
                    <button
                      onClick={() => handleResolve(selectedDoubt._id)}
                      className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors"
                    >
                      Mark as Resolved
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={!reply.trim() || sending}
                      className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      {sending ? "Sending..." : "Send Reply"}
                    </button>
                  </>
                )}
                {selectedDoubt.status === "resolved" && (
                  <button
                    onClick={() => setSelectedDoubt(null)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
