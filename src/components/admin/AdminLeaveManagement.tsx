"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, X, Check, AlertCircle, Filter } from "lucide-react";

const LEAVE_TYPES: Record<string, { label: string; color: string }> = {
  sick: { label: "Sick Leave", color: "bg-red-100 text-red-800" },
  personal: { label: "Personal", color: "bg-blue-100 text-blue-800" },
  emergency: { label: "Emergency", color: "bg-orange-100 text-orange-800" },
  vacation: { label: "Vacation", color: "bg-purple-100 text-purple-800" },
  other: { label: "Other", color: "bg-gray-100 text-gray-800" },
};

interface StatusConfig {
  label: string;
  color: string;
  icon: typeof Clock;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: X },
};

interface Leave {
  _id: string;
  teacherName: string;
  teacherEmail: string;
  leaveType: keyof typeof LEAVE_TYPES;
  startDate: string;
  endDate: string;
  reason: string;
  status: keyof typeof STATUS_CONFIG;
  approvedBy?: {
    name: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function AdminLeaveManagement() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionModal, setActionModal] = useState<{ leave: Leave; action: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const url =
        filter === "all"
          ? `${apiUrl}/api/leaves`
          : `${apiUrl}/api/leaves?status=${filter}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch leaves");

      const data = await response.json();
      setLeaves(data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      alert("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleAction = async (leaveId: string, status: string, reason = "") => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(
        `${apiUrl}/api/leaves/${leaveId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, rejectionReason: reason }),
        }
      );

      if (!response.ok) throw new Error("Failed to update leave status");

      alert(`Leave ${status === "approved" ? "approved" : "rejected"} successfully`);
      setActionModal(null);
      setRejectionReason("");
      fetchLeaves();
    } catch (error) {
      console.error("Error updating leave:", error);
      alert("Failed to update leave status");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days === 1 ? "1 day" : `${days} days`;
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (filter === "all") return true;
    return leave.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Leave Management
        </h1>
        <p className="text-gray-600">
          Review and manage teacher leave requests
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {[
          { value: "all", label: "All Requests" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 font-medium transition-colors relative ${
              filter === tab.value
                ? "text-emerald-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {filter === tab.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></div>
            )}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {leaves.filter((l) => l.status === "pending").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-900">
                {leaves.filter((l) => l.status === "approved").length}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-800 text-sm font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-900">
                {leaves.filter((l) => l.status === "rejected").length}
              </p>
            </div>
            <X className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      {filteredLeaves.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No leave requests found</p>
          <p className="text-gray-400 text-sm mt-2">
            {filter === "pending"
              ? "There are no pending leave requests"
              : `No ${filter} leave requests`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((leave) => {
            const StatusIcon = STATUS_CONFIG[leave.status].icon;
            const leaveTypeConfig = LEAVE_TYPES[leave.leaveType];

            return (
              <div
                key={leave._id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {leave.teacherName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${leaveTypeConfig.color}`}
                      >
                        {leaveTypeConfig.label}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                          STATUS_CONFIG[leave.status].color
                        }`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_CONFIG[leave.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{leave.teacherEmail}</p>
                  </div>

                  {leave.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(leave._id, "approved")}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setActionModal({ leave, action: "reject" })}
                        disabled={processing}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {calculateDuration(leave.startDate, leave.endDate)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Applied {formatDate(leave.createdAt)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                  <p className="text-sm text-gray-600">{leave.reason}</p>
                </div>

                {leave.status === "approved" && leave.approvedBy && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                    <Check className="w-4 h-4" />
                    <span>
                      Approved by {leave.approvedBy.name} on{" "}
                      {formatDate(leave.approvedAt!)}
                    </span>
                  </div>
                )}

                {leave.status === "rejected" && leave.rejectionReason && (
                  <div className="mt-4 bg-red-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-700 mb-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-600">{leave.rejectionReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {actionModal && actionModal.action === "reject" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Reject Leave Request
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting {actionModal.leave.teacherName}&apos;s leave request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setActionModal(null);
                  setRejectionReason("");
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(
                    actionModal.leave._id,
                    "rejected",
                    rejectionReason
                  )
                }
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? "Processing..." : "Reject Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
