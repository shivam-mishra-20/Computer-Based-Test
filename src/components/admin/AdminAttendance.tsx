/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import HolidayManagementV2 from './HolidayManagement';

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

// Helpers - preserved from original
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
  const [isDragging, setIsDragging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('accessToken');
      const isValid = token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
      setIsAuthenticated(!!isValid);
    };
    checkAuth();
  }, []);

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('');
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setStatus('');
    } else {
      setStatus('⚠️ Please drop an Excel file (.xlsx or .xls)');
    }
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
      const result = await apiFetch('/attendance/upload', {
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
      const result = await apiFetch('/attendance/sync', {
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

  // Auto-sync: Fetch external attendance from biometric system
  const handleAutoSync = async () => {
    setIsSyncing(true);
    setSyncProgress('Connecting to attendance system...');

    try {
      setSyncProgress('Starting sync from server...');
      await apiFetch('/attendance/auto-sync', { method: 'POST' });
      
      // Simulate progress steps since actual sync happens in background
      setSyncProgress('Fetching attendance data...');
      await new Promise(r => setTimeout(r, 1500));
      setSyncProgress('Processing records...');
      await new Promise(r => setTimeout(r, 2000));
      setSyncProgress('Sync initiated successfully!');
      await new Promise(r => setTimeout(r, 1000));
      
      setStatus('✅ Auto-sync started! Check back in a few minutes for updated records.');
    } catch (e) {
      console.error(e);
      setStatus('❌ Auto-sync failed.');
    } finally {
      setIsSyncing(false);
      setSyncProgress('');
    }
  };

  // Load class attendance data and filters for modal
  useEffect(() => {
    if (!showClassAttendance) return;
    
    (async () => {
      try {
        const [allData, filterData] = await Promise.all([
          apiFetch('/attendance/all') as Promise<LeaveData[]>,
          apiFetch('/attendance/filters') as Promise<Filters>,
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

  const getStatusStyles = () => {
    if (status.startsWith('❌')) return 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200 text-red-700';
    if (status.startsWith('⚠️')) return 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200 text-amber-700';
    if (status.startsWith('⏳')) return 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200 text-blue-700';
    return 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Attendance Management
              </h1>
              <p className="text-slate-500 text-sm sm:text-base">Upload and manage attendance records</p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowClassAttendance(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">View Analytics</span>
            <span className="sm:hidden">Analytics</span>
          </motion.button>
        </motion.div>

        {/* Status Message */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-4 rounded-xl border backdrop-blur-sm ${getStatusStyles()}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{status.slice(0, 2)}</span>
                <span className="font-medium">{status.slice(3)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden"
        >
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upload Attendance Records</h2>
                <p className="text-sm text-slate-500">Import data from Excel spreadsheets</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragging 
                  ? 'border-emerald-400 bg-emerald-50/50 scale-[1.02]' 
                  : file 
                    ? 'border-emerald-400 bg-emerald-50/30' 
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50'
              }`}
            >
              <input
                id="attendance-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="p-8 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  file ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  {file ? (
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <p className={`text-lg font-medium mb-1 ${file ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {file ? file.name : 'Drop your Excel file here'}
                </p>
                <p className={`text-sm ${file ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB ready to upload` : 'or click to browse • .xlsx, .xls supported'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                onClick={handleUpload}
                className={`relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium transition-all duration-300 ${
                  isSubmitting 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30'
                }`}
              >
                {!isSubmitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                <span className="relative flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Process & Upload</span>
                    </>
                  )}
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                onClick={handleSyncStudents}
                className={`relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium transition-all duration-300 ${
                  isLoading 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
                }`}
              >
                {!isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                <span className="relative flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Sync Students</span>
                    </>
                  )}
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSyncing}
                onClick={handleAutoSync}
                className={`relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium transition-all duration-300 ${
                  isSyncing 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30'
                }`}
              >
                {!isSyncing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                <span className="relative flex items-center gap-2">
                  {isSyncing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>Auto-Syncing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Auto-Sync</span>
                    </>
                  )}
                </span>
              </motion.button>
            </div>

            {/* Auto-Sync Info */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 rounded-xl p-4 border border-purple-100/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-purple-900 mb-1">Auto-Sync Feature</p>
                  <p className="text-sm text-purple-700">
                    Click &quot;Auto-Sync&quot; to fetch latest attendance from biometric system. 
                    <strong> Automatic sync runs daily at 9:00 PM.</strong>
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl p-4 border border-blue-100/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-blue-900 mb-2">Excel Format Requirements</p>
                  <ol className="text-sm text-blue-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-200/50 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                      <span>Columns: Name, Class, Clock In, Clock Out, Day and Date</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-200/50 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                      <span>Ensure all required fields are properly formatted</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-200/50 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                      <span>Use &apos;Sync Students&apos; to link attendance with student records</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Holiday Management - Only render when authenticated */}
        {isAuthenticated && (
          <div className="mt-8">
            <HolidayManagementV2 />
          </div>
        )}{/* Class Attendance Modal */}
        <AnimatePresence>
          {showClassAttendance && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && setShowClassAttendance(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Attendance Analytics</h3>
                        <p className="text-sm text-slate-500">View attendance summary by class and batch</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowClassAttendance(false)}
                      className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all outline-none"
                      value={selectedClass}
                      onChange={(e) => { setSelectedClass(e.target.value); setSelectedBatch(''); }}
                    >
                      <option value="">All Classes</option>
                      {filters.classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                    <select
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all outline-none"
                    >
                      <option value="latest">Sort by Latest</option>
                      <option value="name">Sort by Name</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Class</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Batch</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.map((item, idx) => (
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{item.name}</p>
                                <p className="text-sm text-slate-500 sm:hidden">{item.class} • {item.batch}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 hidden sm:table-cell">{item.class}</td>
                          <td className="px-6 py-4 text-slate-600 hidden md:table-cell">{item.batch}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-100">
                              {item.totalAttendanceDays} days
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">
                            {item.lastAttendanceDate || '—'}
                          </td>
                        </motion.tr>
                      ))}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                            </div>
                            <p className="text-slate-500 font-medium">No attendance records found</p>
                            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span><strong>{filteredData.length}</strong> students</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowClassAttendance(false)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full-screen sync loading overlay */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Syncing Attendance</h3>
                <p className="text-slate-600 mb-4">{syncProgress}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Please wait, this may take a few minutes...</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
