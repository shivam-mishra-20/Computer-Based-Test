'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { FaCalendarAlt, FaClock, FaChevronLeft, FaChevronRight, FaFilter } from 'react-icons/fa';

interface AttendanceEntry {
  clockIn: string;
  clockOut: string;
  dayAndDate: string;
}

interface AttendanceResponse {
  records: AttendanceEntry[];
  stats: {
    present: number;
    absent: number;
    total: number;
  };
}

interface AttendanceSummary {
  presentDays: number;
  totalDays: number;
  percentage: number;
  absentDays: number;
}

export default function StudentAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceEntry[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [studentSort, setStudentSort] = useState<'latest' | 'oldest'>('latest');
  const recordsPerPage = 10;
  
  const user = getUser();

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const [recordsData, summaryData] = await Promise.all([
          apiFetch(`/api/attendance/my?month=${selectedMonth}&year=${selectedYear}`) as Promise<AttendanceResponse>,
          apiFetch('/api/attendance/summary') as Promise<AttendanceSummary>,
        ]);
        
        setAttendanceRecords(recordsData?.records || []);
        setSummary(summaryData);
      } catch (e) {
        console.error('Error loading attendance:', e);
        setAttendanceRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendance();
  }, [selectedMonth, selectedYear]);

  // Filter by selected month (already filtered by API, but keep for client-side consistency)
  const filtered = attendanceRecords;

  // Sort
  const sortedFiltered = filtered.slice().sort((a, b) => {
    const da = new Date(a.dayAndDate).getTime();
    const ddb = new Date(b.dayAndDate).getTime();
    return studentSort === 'latest' ? ddb - da : da - ddb;
  });

  // Pagination
  const totalPages = Math.ceil(sortedFiltered.length / recordsPerPage) || 1;
  const paginated = sortedFiltered.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Analytics
  const getTotalDays = () => filtered.length;
  
  const getTotalHours = () => {
    return filtered.reduce((acc, rec) => {
      if (!rec.clockIn || !rec.clockOut || rec.clockIn === '--:--' || rec.clockOut === '--:--') return acc;

      const parseTime = (t: string) => {
        const [hm, period] = t.split(' ');
        const [h, m] = hm.split(':').map(Number);
        let hour = h;
        if (period === 'PM' && h !== 12) hour += 12;
        if (period === 'AM' && h === 12) hour = 0;
        return hour * 60 + m;
      };

      try {
        const startMinutes = parseTime(rec.clockIn);
        const endMinutes = parseTime(rec.clockOut);
        const durationHours = (endMinutes - startMinutes) / 60;
        return acc + (durationHours > 0 ? durationHours : 0);
      } catch {
        return acc;
      }
    }, 0).toFixed(1);
  };

  const getPresentDays = () => 
    filtered.filter((r) => r.clockIn !== '--:--' && r.clockOut !== '--:--').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Generate month options
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-3 mb-6">
        <FaCalendarAlt className="text-emerald-600 text-2xl" />
        <h2 className="text-2xl font-bold text-gray-800">My Attendance</h2>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{summary.percentage}%</p>
              <p className="text-sm text-gray-600">Attendance</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{summary.presentDays}</p>
              <p className="text-sm text-gray-600">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{summary.absentDays}</p>
              <p className="text-sm text-gray-600">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{summary.totalDays}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
          <p className="text-2xl font-bold text-emerald-600">{getPresentDays()}</p>
          <p className="text-sm text-gray-600">Days Present</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <p className="text-2xl font-bold text-blue-600">{getTotalDays()}</p>
          <p className="text-sm text-gray-600">Total Records</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
          <p className="text-2xl font-bold text-amber-600">{getTotalHours()}</p>
          <p className="text-sm text-gray-600">Hours</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>{m} {selectedYear}</option>
            ))}
          </select>
        </div>
        <select
          value={studentSort}
          onChange={(e) => setStudentSort(e.target.value as 'latest' | 'oldest')}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Table */}
      {attendanceRecords.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-50" />
          <p>No attendance records found for this month</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-emerald-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Clock In</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Clock Out</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((rec, idx) => {
                  const isPresent = rec.clockIn !== '--:--' && rec.clockOut !== '--:--';
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 font-medium">{formatDate(rec.dayAndDate)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          <FaClock className="text-emerald-500 text-xs" />
                          {rec.clockIn}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          <FaClock className="text-red-400 text-xs" />
                          {rec.clockOut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isPresent 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FaChevronLeft />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

