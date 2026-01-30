"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface AttendanceRecord {
  userId: string;
  name: string;
  role: string;
  empCode: string;
  inTime: string | null;
  outTime: string | null;
  state: string;
  statusCode?: string;
  lateMinutes?: number;
}

interface AttendanceResponse {
  date: string;
  lastSyncedAt?: string;
  data: AttendanceRecord[];
}

// Custom Calendar Component
const Calendar = ({ value, onChange, onClose }: { value: string; onChange: (date: string) => void; onClose: () => void }) => {
  const [viewDate, setViewDate] = useState(() => {
    // Parse the value as local date to avoid timezone issues
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
  
  // Parse selected date without timezone conversion
  const selectedYear = value ? parseInt(value.split('-')[0]) : null;
  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null;
  const selectedDay = value ? parseInt(value.split('-')[2]) : null;
  
  // Get today's date components
  const todayDate = new Date();
  const todayYear = todayDate.getFullYear();
  const todayMonth = todayDate.getMonth();
  const todayDay = todayDate.getDate();
  
  const handleDayClick = (day: number) => {
    // Format as YYYY-MM-DD using local date (no timezone conversion)
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
      {/* Month Navigation */}
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
      
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>
      
      {/* Days Grid */}
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
      
      {/* Today Button */}
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

export default function AdminAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Filters
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [role, setRole] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Sync modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncFromDate, setSyncFromDate] = useState("2026-01-01");
  const [syncToDate, setSyncToDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeSyncField, setActiveSyncField] = useState<'from' | 'to' | null>(null);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (role) params.append("role", role);
      if (search) params.append("search", search);
      
      const today = new Date().toISOString().split("T")[0];
      const endpoint = date === today 
        ? `/attendance/admin/today?${params.toString()}`
        : `/attendance/admin/by-date?${params.toString()}`;
      
      const res = await apiFetch(endpoint) as AttendanceResponse;
      
      if (res && res.data) {
        setRecords(res.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error('[AdminAttendance] Error:', err);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [date, role, search]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendance();
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setShowSyncModal(false);
      
      const formatDateForApi = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      };
      
      const formattedFromDate = formatDateForApi(syncFromDate);
      const formattedToDate = formatDateForApi(syncToDate);
      
      await apiFetch("/attendance/fetch-external", {
        method: "POST",
        body: JSON.stringify({ fromDate: formattedFromDate, toDate: formattedToDate })
      });
      
      toast.success(`Syncing attendance from ${formattedFromDate} to ${formattedToDate}`);
      
      setTimeout(() => {
        fetchAttendance();
        toast.success("Sync complete! Data refreshed.");
      }, 5000);
      
    } catch (err) {
      console.error('[AdminAttendance] Sync error:', err);
      toast.error("Failed to trigger sync");
    } finally {
      setSyncing(false);
    }
  };

  // Stats
  const stats = {
    total: records.length,
    present: records.filter(r => r.state === 'IN' || r.state === 'present').length,
    absent: records.filter(r => r.state === 'ABSENT' || r.state === 'absent').length,
    late: records.filter(r => r.lateMinutes && r.lateMinutes > 0).length,
  };

  const getStateStyles = (state: string) => {
    const s = state.toLowerCase();
    if (s === 'in' || s === 'present') return { bg: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50', border: 'border-emerald-200' };
    if (s === 'absent') return { bg: 'bg-red-500', text: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-200' };
    if (s === 'out') return { bg: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50', border: 'border-amber-200' };
    return { bg: 'bg-slate-400', text: 'text-slate-700', bgLight: 'bg-slate-50', border: 'border-slate-200' };
  };

  const getRoleStyles = (role: string) => {
    if (role === 'teacher') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (role === 'admin') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const getAvatarGradient = (name: string) => {
    const gradients = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-red-600', 'from-pink-500 to-rose-600'];
    return gradients[name.charCodeAt(0) % gradients.length];
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const roleOptions = [
    { value: '', label: 'All Roles', icon: '👥' },
    { value: 'student', label: 'Students', icon: '🎓' },
    { value: 'teacher', label: 'Teachers', icon: '👨‍🏫' },
    { value: 'admin', label: 'Admins', icon: '🛡️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        
        {/* Sync Modal */}
        <AnimatePresence>
          {showSyncModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && setShowSyncModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Sync eTimeOffice</h2>
                      <p className="text-sm text-white/80">Import attendance data</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">From</label>
                      <button
                        onClick={() => setActiveSyncField(activeSyncField === 'from' ? null : 'from')}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-sm hover:border-slate-300"
                      >
                        {formatDisplayDate(syncFromDate)}
                      </button>
                      <AnimatePresence>
                        {activeSyncField === 'from' && (
                          <Calendar 
                            value={syncFromDate} 
                            onChange={(d) => { setSyncFromDate(d); setActiveSyncField(null); }} 
                            onClose={() => setActiveSyncField(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">To</label>
                      <button
                        onClick={() => setActiveSyncField(activeSyncField === 'to' ? null : 'to')}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-sm hover:border-slate-300"
                      >
                        {formatDisplayDate(syncToDate)}
                      </button>
                      <AnimatePresence>
                        {activeSyncField === 'to' && (
                          <Calendar 
                            value={syncToDate} 
                            onChange={(d) => { setSyncToDate(d); setActiveSyncField(null); }} 
                            onClose={() => setActiveSyncField(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowSyncModal(false)}
                      className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSync}
                      disabled={syncing}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium disabled:opacity-50 shadow-lg shadow-emerald-500/25"
                    >
                      {syncing ? "Syncing..." : "Start Sync"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Attendance</h1>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Monitor and sync records</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSyncModal(true)}
              disabled={syncing}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium shadow-md ${syncing ? 'animate-pulse' : ''}`}
            >
              <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync"}</span>
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'from-slate-500 to-slate-600' },
            { label: 'Present', value: stats.present, color: 'from-emerald-500 to-teal-600' },
            { label: 'Absent', value: stats.absent, color: 'from-red-500 to-rose-600' },
            { label: 'Late', value: stats.late, color: 'from-amber-500 to-orange-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/80 rounded-xl border border-slate-200/60 p-2 sm:p-4 shadow-sm text-center">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500">{stat.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white/80 rounded-xl border border-slate-200/60 p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Date Picker */}
            <div className="relative">
              <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-left text-sm flex items-center justify-between hover:border-slate-300 shadow-sm"
              >
                <span className="text-slate-800">{formatDisplayDate(date)}</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <AnimatePresence>
                {showCalendar && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                    <Calendar value={date} onChange={setDate} onClose={() => setShowCalendar(false)} />
                  </>
                )}
              </AnimatePresence>
            </div>
            
            {/* Role Dropdown */}
            <div>
              <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
              <Dropdown value={role} onChange={setRole} options={roleOptions} placeholder="All Roles" />
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 uppercase mb-1">Search</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Name or code..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none shadow-sm"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchAttendance}
              className="hidden sm:flex px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 items-center justify-center self-end"
            >
              Apply
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/80 rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-900 font-semibold">No records found</p>
              <p className="text-slate-500 text-sm mt-1">Try syncing data or adjusting filters</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Role</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Clock In</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Clock Out</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => {
                    const stateStyles = getStateStyles(record.state);
                    return (
                      <tr key={record.userId} className="hover:bg-slate-50/50">
                        <td className="px-4 sm:px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 bg-gradient-to-br ${getAvatarGradient(record.name)} rounded-lg flex items-center justify-center text-white font-semibold text-xs shadow-sm`}>
                              {getInitials(record.name)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{record.name}</p>
                              <p className="text-xs text-slate-500">#{record.empCode || "N/A"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 hidden sm:table-cell">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRoleStyles(record.role)}`}>
                            {record.role}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <span className="font-mono text-sm text-slate-700">{record.inTime || "--:--"}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 hidden md:table-cell">
                          <span className="font-mono text-sm text-slate-700">{record.outTime || "--:--"}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stateStyles.bgLight} ${stateStyles.text} border ${stateStyles.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stateStyles.bg}`} />
                            {record.state}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {records.map((record) => {
                  const stateStyles = getStateStyles(record.state);
                  return (
                    <div key={record.userId} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 bg-gradient-to-br ${getAvatarGradient(record.name)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                            {getInitials(record.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{record.name}</p>
                            <p className="text-xs text-slate-500">#{record.empCode || "N/A"}</p>
                          </div>
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full ${stateStyles.bg}`} />
                      </div>
                      
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="text-slate-700 capitalize">{record.role}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Clock In</span><span className="font-mono text-slate-700">{record.inTime || "--:--"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Clock Out</span><span className="font-mono text-slate-700">{record.outTime || "--:--"}</span></div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-full justify-center ${stateStyles.bgLight} ${stateStyles.text} border ${stateStyles.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stateStyles.bg}`} />
                          {record.state}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && records.length > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-500 px-1">
            <p><strong className="text-slate-700">{records.length}</strong> records for {formatDisplayDate(date)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
