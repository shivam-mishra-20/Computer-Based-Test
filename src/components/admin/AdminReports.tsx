"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../lib/api";

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

  const load = useCallback(async () => {
    if (!examId) {
      setAttendance([]);
      return;
    }
    setLoading(true);
    try {
      const data = (await apiFetch(
        `/api/reports/exams/${examId}/attendance`
      )) as { attended?: AttendanceRow[] };
      setAttendance(data.attended || []);
    } catch {
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Reports</h2>
      <div className="flex gap-2 items-center mb-4">
        <input
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          placeholder="Exam ID"
          className="border rounded-md px-3 py-2 text-sm"
        />
        <button
          onClick={load}
          className="px-4 py-2 rounded-md bg-primary text-white text-sm"
        >
          Load
        </button>
        {examId && (
          <a
            href={`#`}
            onClick={(e) => {
              e.preventDefault();
              window.open(`/api/reports/exams/${examId}/results.csv`, "_blank");
            }}
            className="text-sm text-primary underline"
          >
            Download CSV
          </a>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">User</th>
              <th className="text-left px-3 py-2 font-medium">Started</th>
              <th className="text-left px-3 py-2 font-medium">Submitted</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading &&
              attendance.map((row, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs font-mono">{row.userId}</td>
                  <td className="px-3 py-2">
                    {row.startedAt
                      ? new Date(row.startedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {row.submittedAt
                      ? new Date(row.submittedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">{row.status || "-"}</td>
                </tr>
              ))}
            {!loading && !attendance.length && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
