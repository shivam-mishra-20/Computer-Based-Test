'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';
import { FaFileExcel, FaSync, FaUpload, FaFilter, FaCalendarAlt, FaTimes } from 'react-icons/fa';

interface LeaveData {
  name: string;
  class: string;
  batch: string;
  totalAttendanceDays: number;
  totalRecords: number;
  lastAttendanceDate: string | null;
}

interface Filters {
  classes: string[];
  batches: string[];
}

// Helpers
const excelDateToISO = (value: any): string => {
  if (!value) return '';
  if (!isNaN(value)) {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const parsed = new Date(value);
  return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : '';
};

const normalizeTime = (t: string): string => {
  if (!t) return '--:--';
  const s = String(t).trim();
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(s)) {
    const [hm, ap] = s.split(/\s+/);
    const [h, m] = hm.split(':');
    return `${Number(h)}:${m} ${ap.toUpperCase()}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':');
    let hh = Number(h);
    const ap = hh >= 12 ? 'PM' : 'AM';
    if (hh === 0) hh = 12;
    if (hh > 12) hh -= 12;
    return `${hh}:${m} ${ap}`;
  }
  return s || '--:--';
};

export default function AdminAttendance() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showClassAttendance, setShowClassAttendance] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [leaveData, setLeaveData] = useState<LeaveData[]>([]);
  const [filters, setFilters] = useState<Filters>({ classes: [], batches: [] });
  const [adminSort, setAdminSort] = useState<'latest' | 'name'>('latest');

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('');
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  // Parse Excel and upload via API
  const handleUpload = async () => {
    if (!file) {
      setStatus('⚠️ Please select an Excel file first.');
      return;
    }
    try {
      setIsSubmitting(true);
      setStatus('⏳ Processing...');

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' }) as Record<string, any>[];

      // Parse rows
      const records = rows.map((row) => {
        const norm: Record<string, any> = {};
        Object.entries(row).forEach(([k, v]) => {
          norm[k.trim().toLowerCase()] = v;
        });
        return {
          name: norm['name']?.toString().trim() || '',
          class: norm['class']?.toString().trim() || '',
          clockIn: normalizeTime(norm['clock in']?.toString().trim() || ''),
          clockOut: normalizeTime(norm['clock out']?.toString().trim() || ''),
          dayAndDate: excelDateToISO(norm['day and date']),
        };
      }).filter(r => r.name && r.class && r.dayAndDate);

      if (records.length === 0) {
        setStatus('⚠️ No valid records found in the file.');
        return;
      }

      // Upload via backend API
      const result = await apiFetch('/api/attendance/upload', {
        method: 'POST',
        body: JSON.stringify({ records }),
      }) as { success: boolean; upsertedCount: number; studentsAffected: number };

      setStatus(`✅ Uploaded ${result.upsertedCount} entries for ${result.studentsAffected} students!`);
      setFile(null);
      const input = document.getElementById('attendance-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (e) {
      console.error(e);
      setStatus('❌ Failed to upload attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sync students via backend API
  const handleSyncStudents = async () => {
    setIsLoading(true);
    setStatus('⏳ Syncing students...');

    try {
      const result = await apiFetch('/api/attendance/sync', {
        method: 'POST',
      }) as { success: boolean; syncedCount: number };

      setStatus(`✅ Synced ${result.syncedCount} students to attendance records.`);
    } catch (e) {
      console.error(e);
      setStatus('❌ Sync failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load class attendance data and filters for modal
  useEffect(() => {
    if (!showClassAttendance) return;
    
    (async () => {
      try {
        const [allData, filterData] = await Promise.all([
          apiFetch('/api/attendance/all') as Promise<LeaveData[]>,
          apiFetch('/api/attendance/filters') as Promise<Filters>,
        ]);
        setLeaveData(allData || []);
        setFilters(filterData || { classes: [], batches: [] });
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      }
    })();
  }, [showClassAttendance]);

  // Filter and sort for modal
  const filteredData = leaveData
    .filter((d) => (!selectedClass || d.class === selectedClass) && (!selectedBatch || d.batch === selectedBatch))
    .sort((a, b) => {
      if (adminSort === 'name') return a.name.localeCompare(b.name);
      const dateA = a.lastAttendanceDate ? new Date(a.lastAttendanceDate).getTime() : 0;
      const dateB = b.lastAttendanceDate ? new Date(b.lastAttendanceDate).getTime() : 0;
      return dateB - dateA;
    });

  const uniqueBatches = filters.batches.filter(b => 
    !selectedClass || leaveData.some(d => d.class === selectedClass && d.batch === b)
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-3 mb-6">
        <FaCalendarAlt className="text-emerald-600 text-2xl" />
        <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`mb-6 p-4 rounded-lg border ${
          status.startsWith('❌') ? 'bg-red-50 border-red-200 text-red-700' :
          status.startsWith('⚠️') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
          status.startsWith('⏳') ? 'bg-blue-50 border-blue-200 text-blue-700' :
          'bg-green-50 border-green-200 text-green-700'
        }`}>
          {status}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-700">
          <FaUpload className="mr-2 text-emerald-600" />
          Upload Attendance Records
        </h3>

        <div className="relative mb-4">
          <input
            id="attendance-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex items-center border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-lg p-4">
            <FaFileExcel className="text-emerald-500 text-xl mr-3" />
            <div className="flex-1">
              <p className="font-medium text-emerald-700">
                {file ? file.name : 'Select Excel File'}
              </p>
              <p className="text-sm text-emerald-600 opacity-70">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Click or drag file here'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            disabled={isSubmitting}
            onClick={handleUpload}
            className={`${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
            } text-white py-3 px-4 rounded-lg shadow transition flex items-center justify-center`}
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FaUpload className="mr-2" />
                <span>Process & Upload</span>
              </>
            )}
          </button>

          <button
            disabled={isLoading}
            onClick={handleSyncStudents}
            className={`${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } text-white py-3 px-4 rounded-lg shadow transition flex items-center justify-center`}
          >
            {isLoading ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <FaSync className="mr-2" />
                <span>Sync Students</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
          <p className="font-medium text-blue-700 mb-1">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Upload Excel file with columns: Name, Class, Clock In, Clock Out, Day and Date</li>
            <li>Ensure all required fields are filled correctly</li>
            <li>Use &apos;Sync Students&apos; to create missing student records</li>
          </ol>
        </div>
      </div>

      <button
        className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg shadow transition flex items-center"
        onClick={() => setShowClassAttendance(true)}
      >
        <FaFilter className="mr-2" /> View Class Attendance
      </button>

      {/* Modal */}
      {showClassAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-indigo-700">Class Attendance Summary</h3>
              <button onClick={() => setShowClassAttendance(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <select
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedBatch(''); }}
              >
                <option value="">All Classes</option>
                {filters.classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <select
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                disabled={!selectedClass}
              >
                <option value="">All Batches</option>
                {uniqueBatches.map((batch) => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
              <select
                value={adminSort}
                onChange={(e) => setAdminSort(e.target.value as 'latest' | 'name')}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="latest">Latest updates</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            <div className="overflow-auto flex-1">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-indigo-100">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Class</th>
                    <th className="px-4 py-2 text-left">Batch</th>
                    <th className="px-4 py-2 text-center">Days Present</th>
                    <th className="px-4 py-2 text-left">Last Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-2 font-medium">{item.name}</td>
                      <td className="px-4 py-2">{item.class}</td>
                      <td className="px-4 py-2">{item.batch}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold">
                          {item.totalAttendanceDays}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {item.lastAttendanceDate || '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">{filteredData.length} students</span>
              <button
                onClick={() => setShowClassAttendance(false)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

