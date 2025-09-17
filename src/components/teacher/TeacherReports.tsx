"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../lib/api";

interface AttendanceRow {
  userId: string;
  startedAt?: string;
  submittedAt?: string;
  status?: string;
}
interface AttemptLogEntry {
  ts?: string;
  type?: string;
  meta?: Record<string, unknown>;
}
interface AttemptWithLogs {
  userId: string;
  activityLogs?: AttemptLogEntry[];
}

export default function TeacherReports() {
  const [examId, setExamId] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AttemptWithLogs[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

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

  const loadLogs = useCallback(async () => {
    if (!examId) {
      setLogs([]);
      return;
    }
    setLogLoading(true);
    try {
      const data = (await apiFetch(`/api/reports/exams/${examId}/logs`)) as {
        attempts?: AttemptWithLogs[];
      };
      setLogs(data.attempts || []);
    } catch {
      setLogs([]);
    } finally {
      setLogLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (showLogs) loadLogs();
  }, [showLogs, loadLogs]);

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
      <div className="flex items-center gap-4 mb-4 text-xs">
        <button
          onClick={() => setShowLogs(false)}
          className={`px-3 py-1 rounded-md border ${
            !showLogs ? "bg-primary text-white border-primary" : "bg-white"
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => setShowLogs(true)}
          className={`px-3 py-1 rounded-md border ${
            showLogs ? "bg-primary text-white border-primary" : "bg-white"
          }`}
        >
          Suspicious Logs
        </button>
      </div>
      {!showLogs && (
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
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                attendance.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-mono">
                      {row.userId}
                    </td>
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
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-gray-400"
                  >
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showLogs && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">User</th>
                <th className="text-left px-3 py-2 font-medium">Events</th>
              </tr>
            </thead>
            <tbody>
              {logLoading && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {!logLoading &&
                logs.map((a, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="px-3 py-2 font-mono w-36">{a.userId}</td>
                    <td className="px-3 py-2">
                      <ul className="space-y-1">
                        {a.activityLogs?.slice(-20).map((ev, j) => (
                          <li key={j} className="flex gap-2">
                            <span className="text-[10px] text-gray-500 w-32">
                              {ev.ts
                                ? new Date(ev.ts).toLocaleTimeString()
                                : "-"}
                            </span>
                            <span className="text-[10px] font-medium">
                              {ev.type}
                            </span>
                            {ev.meta && (
                              <code className="text-[10px] bg-gray-100 rounded px-1">
                                {Object.keys(ev.meta).slice(0, 3).join(",")}
                              </code>
                            )}
                          </li>
                        ))}
                        {!a.activityLogs?.length && (
                          <li className="text-[10px] text-gray-400">
                            No events
                          </li>
                        )}
                      </ul>
                    </td>
                  </tr>
                ))}
              {!logLoading && !logs.length && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-4 text-center text-gray-400"
                  >
                    No logs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
