/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-calendar/dist/Calendar.css';

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'holiday' | 'working';
  description?: string;
  createdBy?: any;
}

interface HolidayFormData {
  date: Date;
  name: string;
  type: 'holiday' | 'working';
  description: string;
}

export default function HolidayManagementV2() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    date: new Date(),
    name: '',
    type: 'holiday',
    description: '',
  });
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Fetch holidays
  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const year = new Date().getFullYear();
      console.log('[HolidayManagement] Fetching holidays for year:', year);
      
      const response = await apiFetch(`/holidays?year=${year}`) as { success: boolean; holidays: Holiday[] };
      console.log('[HolidayManagement] Fetched holidays:', response);
      setHolidays(response.holidays || []);
    } catch (error: any) {
      console.error('[HolidayManagement] Error fetching holidays:', error);
      
      // Check for authentication errors
      if (error.status === 401) {
        setStatus('❌ Session expired or invalid. Please log in again.');
      } else if (error.status === 403) {
        setStatus('❌ Access denied. Admin privileges required.');
      } else {
        setStatus('❌ Failed to load holidays');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch holidays only after component is mounted on client AND token is valid
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    
    // Verify token exists and is valid before fetching
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      console.warn('[HolidayManagement] Skipping fetch - no valid token in localStorage');
      setIsLoading(false);
      return;
    }
    
    fetchHolidays();
  }, [isMounted]);

  // Check if a date is a holiday
  const getHolidayForDate = (date: Date): Holiday | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.find(h => h.date === dateStr);
  };

  // Handle calendar tile click
  const handleDateClick = (date: Date) => {
    const holiday = getHolidayForDate(date);
    const isSunday = date.getDay() === 0;

    if (holiday) {
      // Edit existing holiday
      setEditingHoliday(holiday);
      setFormData({
        date: new Date(holiday.date),
        name: holiday.name,
        type: holiday.type,
        description: holiday.description || '',
      });
    } else {
      // Add new holiday
      setEditingHoliday(null);
      setFormData({
        date,
        name: '',
        type: isSunday ? 'working' : 'holiday',
        description: '',
      });
    }
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('');

    try {
      const payload = {
        date: formData.date.toISOString().split('T')[0],
        name: formData.name,
        type: formData.type,
        description: formData.description,
      };

      if (editingHoliday) {
        // Update existing
        await apiFetch(`/holidays/${editingHoliday.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatus('✅ Holiday updated successfully!');
      } else {
        // Create new
        await apiFetch('/holidays', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatus('✅ Holiday added successfully!');
      }

      setShowModal(false);
      await fetchHolidays();
      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error saving holiday:', error);
      setStatus(`❌ ${error.message || 'Failed to save holiday'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      setIsSubmitting(true);
      await apiFetch(`/holidays/${id}`, { method: 'DELETE' });
      setStatus('✅ Holiday deleted successfully!');
      setShowModal(false);
      await fetchHolidays();
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error deleting holiday:', error);
      setStatus('❌ Failed to delete holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar tile className
  const tileClassName = ({ date }: { date: Date }) => {
    const holiday = getHolidayForDate(date);
    const isSunday = date.getDay() === 0;

    if (holiday?.type === 'working') {
      return 'working-day';
    }
    if (holiday?.type === 'holiday') {
      return 'holiday-day';
    }
    if (isSunday) {
      return 'sunday';
    }
    return '';
  };

  // Calendar tile content
  const tileContent = ({ date }: { date: Date }) => {
    const holiday = getHolidayForDate(date);
    if (holiday) {
      return (
        <div className="tile-marker">
          {holiday.type === 'holiday' ? '🔴' : '🟢'}
        </div>
      );
    }
    return null;
  };

  const getStatusStyles = () => {
    if (status.startsWith('❌')) return 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200 text-red-700';
    return 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700';
  };

  return (
    <div className="space-y-6">
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

      {/* Holiday Management Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden"
      >
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Holiday Management (Live)</h2>
              <p className="text-sm text-slate-500">Mark dates as holidays or working days</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500">Loading holidays...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="calendar-container">
                <Calendar
                  value={selectedDate}
                  onChange={(value) => {
                    if (value instanceof Date) {
                      setSelectedDate(value);
                    }
                  }}
                  onClickDay={handleDateClick}
                  tileClassName={tileClassName}
                  tileContent={tileContent}
                  className="professional-calendar"
                />
                <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span>
                    <span className="text-slate-600">Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span>
                    <span className="text-slate-600">Working Sunday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-slate-100 border border-slate-200 rounded"></span>
                    <span className="text-slate-600">Regular Sunday</span>
                  </div>
                </div>
              </div>

              {/* Holiday List */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Holidays</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {holidays.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>No holidays marked yet</p>
                      <p className="text-sm mt-1">Click on a date in the calendar to add</p>
                    </div>
                  ) : (
                    holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((holiday) => (
                      <motion.div
                        key={holiday.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                          holiday.type === 'holiday'
                            ? 'bg-red-50/50 border-red-200 hover:bg-red-50'
                            : 'bg-green-50/50 border-green-200 hover:bg-green-50'
                        }`}
                        onClick={() => handleDateClick(new Date(holiday.date))}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                holiday.type === 'holiday'
                                  ? 'bg-red-200 text-red-700'
                                  : 'bg-green-200 text-green-700'
                              }`}>
                                {holiday.type === 'holiday' ? '🔴 Holiday' : '🟢 Working'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900">{holiday.name}</p>
                            {holiday.description && (
                              <p className="text-sm text-slate-600 mt-1">{holiday.description}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(holiday.id);
                            }}
                            className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && !isSubmitting && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {formData.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Holiday Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all outline-none"
                    placeholder="e.g., Republic Day"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'holiday' })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.type === 'holiday'
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">🔴</div>
                      <div className="text-sm font-medium">Holiday</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'working' })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.type === 'working'
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">🟢</div>
                      <div className="text-sm font-medium">Working</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all outline-none resize-none"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !isSubmitting && setShowModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </span>
                    ) : (
                      editingHoliday ? 'Update' : 'Add Holiday'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .professional-calendar {
          width: 100%;
          border: none !important;
          font-family: inherit;
        }

        .professional-calendar .react-calendar__tile {
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin: 0.125rem;
          transition: all 0.2s;
        }

        .professional-calendar .react-calendar__tile:hover {
          background-color: #f1f5f9 !important;
        }

        .professional-calendar .react-calendar__tile.sunday {
          background-color: #f8fafc;
        }

        .professional-calendar .react-calendar__tile.holiday-day {
          background-color: #fee2e2 !important;
          font-weight: 600 !important;
          color: #991b1b !important;
        }

        .professional-calendar .react-calendar__tile.working-day {
          background-color: #d1fae5 !important;
          font-weight: 600 !important;
          color: #065f46 !important;
        }

        .professional-calendar .react-calendar__tile--active {
          background-color: #0ea5e9 !important;
          color: white !important;
        }

        .professional-calendar .react-calendar__month-view__days__day--weekend {
          color: #64748b;
        }

        .professional-calendar .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 1rem;
          margin: 0.25rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .professional-calendar .react-calendar__navigation button:hover {
          background-color: #f1f5f9;
        }

        .tile-marker {
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 0.5rem;
        }
      `}</style>
    </div>
  );
}
