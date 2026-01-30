"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { InlineLoader } from "@/components/ElegantLoader";

interface PendingUser {
  _id: string;
  name: string;
  email: string;
  role: "student" | "teacher";
  phone?: string;
  classLevel?: string;
  batch?: string;
  board?: string;
  targetExams?: string[];
  createdAt: string;
}

export default function PendingRegistrationsPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Approval modal state
  const [approvalModal, setApprovalModal] = useState<{
    user: PendingUser | null;
    empCode: string;
  }>({ user: null, empCode: "" });

  const loadPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/users/pending") as PendingUser[];
      setUsers(data || []);
    } catch (err) {
      toast.error("Failed to load pending registrations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingUsers();
  }, [loadPendingUsers]);

  const handleApprove = async () => {
    if (!approvalModal.user || !approvalModal.empCode.trim()) {
      toast.error("Please enter a valid code");
      return;
    }

    setActionLoading(approvalModal.user._id);
    try {
      await apiFetch(`/users/${approvalModal.user._id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ empCode: approvalModal.empCode.trim() }),
      });
      toast.success(`${approvalModal.user.name} approved successfully`);
      setUsers(users.filter((u) => u._id !== approvalModal.user?._id));
      setApprovalModal({ user: null, empCode: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Approval failed";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (user: PendingUser) => {
    if (!confirm(`Reject registration for ${user.name}?`)) return;
    
    setActionLoading(user._id);
    try {
      await apiFetch(`/users/${user._id}/reject`, { method: "PUT" });
      toast.success(`${user.name} registration rejected`);
      setUsers(users.filter((u) => u._id !== user._id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rejection failed";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Protected requiredRole="admin">
      <main className="p-6 font-poppins">
        <DashboardHeader
          title="Pending Registrations"
          subtitle="Review and approve student and teacher registrations"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard/admin" },
            { label: "App Management", href: "/dashboard/admin/app-management" },
            { label: "Pending Registrations" },
          ]}
        />

        <div className="mt-6">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
              <InlineLoader />
              <span className="ml-3 text-slate-600">Loading pending registrations...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
              <p className="text-slate-500 mt-2">No pending registrations to review.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map((user, index) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.role === "teacher" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                        }`}>
                          {user.role === "teacher" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{user.name}</h3>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === "teacher" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {user.role === "teacher" ? "Teacher" : "Student"}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600 mt-3">
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {user.phone}
                          </span>
                        )}
                        {user.classLevel && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded">Class: {user.classLevel}</span>
                        )}
                        {user.batch && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded">Batch: {user.batch}</span>
                        )}
                        {user.board && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded">{user.board}</span>
                        )}
                        {user.targetExams && user.targetExams.length > 0 && (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                            {user.targetExams.join(", ")}
                          </span>
                        )}
                        <span className="text-slate-400">
                          Registered: {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setApprovalModal({ user, empCode: "" })}
                        disabled={actionLoading === user._id}
                        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {actionLoading === user._id ? <InlineLoader /> : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(user)}
                        disabled={actionLoading === user._id}
                        className="px-4 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Modal */}
        <AnimatePresence>
          {approvalModal.user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setApprovalModal({ user: null, empCode: "" })}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Approve {approvalModal.user.name}
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  Assign a unique code for this {approvalModal.user.role}. This code is required for attendance tracking.
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {approvalModal.user.role === "teacher" ? "Employee Code" : "Student Code"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={approvalModal.empCode}
                    onChange={(e) => setApprovalModal({ ...approvalModal, empCode: e.target.value })}
                    placeholder="e.g. T001 or S001"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={!approvalModal.empCode.trim() || actionLoading === approvalModal.user._id}
                    className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading === approvalModal.user._id ? (
                      <span className="flex items-center justify-center gap-2">
                        <InlineLoader /> Approving...
                      </span>
                    ) : (
                      "Approve User"
                    )}
                  </button>
                  <button
                    onClick={() => setApprovalModal({ user: null, empCode: "" })}
                    className="px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </Protected>
  );
}
