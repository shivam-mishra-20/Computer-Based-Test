"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ClassReport {
  scheduleId: string;
  subject: string;
  classLevel: string;
  batch: string;
  wasHeld: boolean;
  topicsCovered?: string;
  homework?: string;
  remarks?: string;
}

interface EODReport {
  _id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  classes: ClassReport[];
  additionalNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: { _id: string; name: string; email: string };
  reviewedAt?: string;
}

interface EODResponse {
  eods: EODReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface TeacherUser {
  firebaseUid?: string;
  _id: string;
  name: string;
}

interface UsersResponse {
  users: TeacherUser[];
}

// Custom Calendar Component
const Calendar = ({ value, onChange, onClose }: { value: string; onChange: (date: string) => void; onClose: () => void }) => {
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const days = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) arr.push(null);
    for (let i = 1; i <= daysInMonth; i++) arr.push(i);
    return arr;
  }, [firstDayOfMonth, daysInMonth]);
  
  const selectedYear = value ? parseInt(value.split('-')[0]) : null;
  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null;
  const selectedDay = value ? parseInt(value.split('-')[2]) : null;
  
  const todayDate = new Date();
  const todayYear = todayDate.getFullYear();
  const todayMonth = todayDate.getMonth();
  const todayDay = todayDate.getDate();
  
  const handleDayClick = (day: number) => {
    const yyyy = year.toString();
    const mm = (month + 1).toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    onClose();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-72"
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-slate-800">
          {monthNames[month]} {year}
        </span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          
          const isSelected = selectedDay === day && selectedMonth === month && selectedYear === year;
          const isToday = todayDay === day && todayMonth === month && todayYear === year;
          
          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`
                w-8 h-8 rounded-lg text-sm font-medium transition-all
                ${isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 
                  isToday ? 'bg-emerald-100 text-emerald-700' : 
                  'text-slate-700 hover:bg-slate-100'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
      
      <button
        onClick={() => {
          const yyyy = todayYear.toString();
          const mm = (todayMonth + 1).toString().padStart(2, '0');
          const dd = todayDay.toString().padStart(2, '0');
          onChange(`${yyyy}-${mm}-${dd}`);
          onClose();
        }}
        className="w-full mt-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
      >
        Today
      </button>
    </motion.div>
  );
};

// Custom Dropdown Component
const Dropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: { value: string; label: string; icon?: string }[]; 
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-left flex items-center justify-between gap-2 hover:border-slate-300 transition-colors shadow-sm"
      >
        <span className={`text-sm ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                    value === opt.value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.icon && <span>{opt.icon}</span>}
                  {opt.label}
                  {value === opt.value && (
                    <svg className="w-4 h-4 ml-auto text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function AdminEODPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<EODReport[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Last 30 days by default
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [teacherFilter, setTeacherFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Teacher list for filter dropdown
  const [teachers, setTeachers] = useState<{ firebaseUid: string; name: string }[]>([]);

  const fetchEODs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (teacherFilter) params.append("teacherId", teacherFilter);
      if (statusFilter) params.append("status", statusFilter);
      params.append("page", currentPage.toString());
      params.append("limit", "10");
      
      console.log('[AdminEOD] Fetching with params:', params.toString());
      console.log('[AdminEOD] Date range:', startDate || 'none', 'to', endDate || 'none');
      const res = await apiFetch(`/eod/admin/all?${params.toString()}`) as EODResponse;
      console.log('[AdminEOD] API Response:', res);
      
      if (res && res.eods) {
        console.log('[AdminEOD] Found', res.eods.length, 'reports. Total:', res.pagination.total);
        setReports(res.eods);
        setTotalPages(res.pagination.pages);
        setTotal(res.pagination.total);
      } else {
        console.warn('[AdminEOD] No eods in response:', res);
        setReports([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('[AdminEOD] Error fetching EODs:', err);
      const errorMsg = err instanceof Error ? err.message : 
                       (typeof err === 'object' && err !== null && 'error' in err) ? String((err as {error: unknown}).error) :
                       "Failed to load EOD reports";
      toast.error(errorMsg);
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, teacherFilter, statusFilter, currentPage]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await apiFetch('/users?role=teacher') as UsersResponse;
      if (res && res.users) {
        setTeachers(res.users.map((u: TeacherUser) => ({ 
          firebaseUid: u.firebaseUid || u._id, 
          name: u.name 
        })));
      }
    } catch (err) {
      console.error('[AdminEOD] Failed to fetch teachers:', err);
    }
  }, []);
  const handleUpdateStatus = async (eodId: string, status: 'approved' | 'rejected') => {
    try {
      await apiFetch(`/eod/admin/${eodId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      
      toast.success(`EOD ${status} successfully!`);
      fetchEODs(); // Refresh the list
    } catch (err) {
      console.error('[AdminEOD] Failed to update status:', err);
      toast.error(`Failed to ${status} EOD`);
    }
  };
  useEffect(() => {
    fetchEODs();
  }, [fetchEODs]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEODs();
  };

  const handleClearFilters = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setStartDate(d.toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);
    setTeacherFilter("");
    setStatusFilter("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Stats
  const stats = {
    total: total,
    pending: reports.filter(r => r.status === 'pending').length,
    approved: reports.filter(r => r.status === 'approved').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  const getStatusStyles = (status: string) => {
    if (status === 'approved') return { bg: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50', border: 'border-emerald-200' };
    if (status === 'pending') return { bg: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50', border: 'border-amber-200' };
    if (status === 'rejected') return { bg: 'bg-red-500', text: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-200' };
    return { bg: 'bg-slate-400', text: 'text-slate-700', bgLight: 'bg-slate-50', border: 'border-slate-200' };
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const getAvatarGradient = (name: string) => {
    const gradients = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-red-600', 'from-pink-500 to-rose-600'];
    return gradients[name.charCodeAt(0) % gradients.length];
  };

  const statusOptions = [
    { value: '', label: 'All Statuses', icon: '📊' },
    { value: 'pending', label: 'Pending', icon: '⏳' },
    { value: 'approved', label: 'Approved', icon: '✅' },
    { value: 'rejected', label: 'Rejected', icon: '❌' },
  ];

  const teacherOptions = [
    { value: '', label: 'All Teachers', icon: '👨‍🏫' },
    ...teachers.map(t => ({ value: t.firebaseUid, label: t.name }))
  ];

  // Filtered reports based on search query
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const query = searchQuery.toLowerCase();
    return reports.filter(r => 
      r.teacherName.toLowerCase().includes(query) ||
      r.classes.some(c => 
        c.subject.toLowerCase().includes(query) ||
        c.batch.toLowerCase().includes(query) ||
        c.classLevel.toLowerCase().includes(query)
      )
    );
  }, [reports, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              EOD Reports
            </h1>
            <p className="text-slate-500 text-sm mt-1">View and manage end-of-day reports from teachers</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchEODs}
              disabled={loading}
              className="px-4 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTeacherFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Show All
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Reports</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pending</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Approved</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Start Date */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <button
                  type="button"
                  onClick={() => setShowStartCalendar(!showStartCalendar)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-left flex items-center justify-between gap-2 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <span className="text-sm text-slate-800">
                    {formatDisplayDate(startDate)}
                  </span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <AnimatePresence>
                  {showStartCalendar && (
                    <Calendar value={startDate} onChange={setStartDate} onClose={() => setShowStartCalendar(false)} />
                  )}
                </AnimatePresence>
              </div>

              {/* End Date */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <button
                  type="button"
                  onClick={() => setShowEndCalendar(!showEndCalendar)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-left flex items-center justify-between gap-2 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <span className="text-sm text-slate-800">
                    {formatDisplayDate(endDate)}
                  </span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <AnimatePresence>
                  {showEndCalendar && (
                    <Calendar value={endDate} onChange={setEndDate} onClose={() => setShowEndCalendar(false)} />
                  )}
                </AnimatePresence>
              </div>

              {/* Teacher Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Teacher</label>
                <Dropdown
                  value={teacherFilter}
                  onChange={setTeacherFilter}
                  options={teacherOptions}
                  placeholder="Select teacher"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <Dropdown
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={statusOptions}
                  placeholder="Select status"
                />
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by teacher name, subject, batch, or class..."
                  className="w-full px-4 py-2.5 pl-10 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium text-sm flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            </div>
          </form>
        </motion.div>

        {/* Reports List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 text-lg">No EOD reports found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report, idx) => {
                const statusStyles = getStatusStyles(report.status);
                const isExpanded = expandedReportId === report._id;
                
                return (
                  <motion.div
                    key={report._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Report Header */}
                    <div
                      onClick={() => setExpandedReportId(isExpanded ? null : report._id)}
                      className="p-5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Teacher Avatar */}
                          <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(report.teacherName)} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                            <span className="text-white font-bold text-sm">
                              {getInitials(report.teacherName)}
                            </span>
                          </div>
                          
                          {/* Report Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-lg font-semibold text-slate-800">
                                {report.teacherName}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles.bgLight} ${statusStyles.text} border ${statusStyles.border}`}>
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDisplayDate(report.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Submitted at {formatTime(report.submittedAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                {report.classes.length} {report.classes.length === 1 ? 'class' : 'classes'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expand Icon */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </motion.div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2 space-y-4 border-t border-slate-100">
                            {/* Classes */}
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Classes
                              </h4>
                              <div className="space-y-3">
                                {report.classes.map((cls, clsIdx) => (
                                  <div key={clsIdx} className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-semibold text-slate-800">{cls.subject}</span>
                                          <span className="text-sm text-slate-500">•</span>
                                          <span className="text-sm text-slate-600">{cls.classLevel}</span>
                                          <span className="text-sm text-slate-500">•</span>
                                          <span className="text-sm text-slate-600">{cls.batch}</span>
                                        </div>
                                        
                                        {cls.topicsCovered && (
                                          <div className="text-sm text-slate-600 mb-2">
                                            <span className="font-medium">Topics:</span> {cls.topicsCovered}
                                          </div>
                                        )}
                                        
                                        {cls.homework && (
                                          <div className="text-sm text-slate-600 mb-2">
                                            <span className="font-medium">Homework:</span> {cls.homework}
                                          </div>
                                        )}
                                        
                                        {cls.remarks && (
                                          <div className="text-sm text-slate-600">
                                            <span className="font-medium">Remarks:</span> {cls.remarks}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                        cls.wasHeld 
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                          : 'bg-red-50 text-red-700 border border-red-200'
                                      }`}>
                                        {cls.wasHeld ? '✓ Held' : '✗ Not Held'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Additional Notes */}
                            {report.additionalNotes && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                  Additional Notes
                                </h4>
                                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                                  {report.additionalNotes}
                                </div>
                              </div>
                            )}
                            
                            {/* Review Info */}
                            {report.reviewedBy && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Review Information
                                </h4>
                                <div className="bg-slate-50 rounded-xl p-4 text-sm">
                                  <p className="text-slate-700">
                                    Reviewed by <span className="font-semibold">{report.reviewedBy.name}</span>
                                  </p>
                                  {report.reviewedAt && (
                                    <p className="text-slate-500 text-xs mt-1">
                                      {formatDisplayDate(report.reviewedAt)} at {formatTime(report.reviewedAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            {report.status === 'pending' && (
                              <div className="flex gap-3 pt-2">
                                <button
                                  onClick={() => handleUpdateStatus(report._id, 'approved')}
                                  className="flex-1 px-4 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all font-medium text-sm flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Approve
                                </button>
                                
                                <button
                                  onClick={() => handleUpdateStatus(report._id, 'rejected')}
                                  className="flex-1 px-4 py-3 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all font-medium text-sm flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
