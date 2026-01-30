"use client";
import React, { useState, useEffect } from "react";
import Protected from "@/components/Protected";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  CalendarOff, 
  Briefcase,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'holiday' | 'working';
  description?: string;
}

export default function HolidayManagementPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: "",
    type: "holiday" as "holiday" | "working",
    description: ""
  });

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      
      // Use apiFetch which handles token automatically
      const data = await apiFetch(`/holidays?year=${currentYear}`) as { success: boolean; holidays: Holiday[]; error?: string };
      
      if (data.success) {
        setHolidays(data.holidays);
      } else {
        toast.error(data.error || "Failed to fetch holidays");
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      toast.error("Network error while fetching holidays");
    } finally {
      setLoading(false);
    }
  };

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

  // Fetch holidays only when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchHolidays();
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      
      const data = await apiFetch('/holidays', {
        method: "POST",
        body: JSON.stringify(formData)
      }) as { success: boolean; error?: string };
      
      if (data.success) {
        toast.success("Holiday created successfully");
        setIsModalOpen(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          name: "",
          type: "holiday",
          description: ""
        });
        fetchHolidays();
      } else {
        toast.error(data.error || "Failed to create holiday");
      }
    } catch (error) {
      console.error("Error creating holiday:", error);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    
    try {
      const data = await apiFetch(`/holidays/${id}`, {
        method: "DELETE"
      }) as { success: boolean; error?: string };
      
      if (data.success) {
        toast.success("Holiday deleted");
        setHolidays(prev => prev.filter(h => h.id !== id));
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast.error("Network error");
    }
  };

  // Group holidays by month
  const groupedHolidays = holidays.reduce((acc, holiday) => {
    const date = new Date(holiday.date);
    const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  // Sort months chronologically
  const sortedMonths = Object.keys(groupedHolidays).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <Protected requiredRole="admin">
      <main className="p-4 pt-5 lg:pt-6 sm:p-6 lg:p-8 font-poppins min-h-screen bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard/admin/app-management" 
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App Management
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <CalendarOff className="w-6 h-6 text-red-600" />
                  </div>
                  Holiday Management
                </h1>
                <p className="text-slate-500 mt-2 ml-1">
                  Manage holidays and working days for attendance calculation
                </p>
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Holiday
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-slate-300 animate-spin mb-4" />
              <p className="text-slate-500">Loading calendar data...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Holidays Found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">
                There are no holidays or custom working days defined for this year yet.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
              >
                Create First Holiday
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedMonths.map(month => (
                <div key={month} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-800">{month}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {groupedHolidays[month].map(holiday => (
                      <motion.div 
                        layout
                        key={holiday.id}
                        className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`
                            w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm
                            ${holiday.type === 'working' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-red-100 text-red-700'}
                          `}>
                            {new Date(holiday.date).getDate()}
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">{holiday.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className={`px-1.5 py-0.5 rounded ${
                                holiday.type === 'working' 
                                  ? 'bg-emerald-50 text-emerald-600' 
                                  : 'bg-red-50 text-red-600'
                              }`}>
                                {holiday.type === 'working' ? 'Working Day' : 'Holiday'}
                              </span>
                              {holiday.description && (
                                <>
                                  <span>•</span>
                                  <span>{holiday.description}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleDelete(holiday.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Add Holiday Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900">Add New Calendar Event</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Event Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'holiday'})}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                          formData.type === 'holiday'
                            ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CalendarOff className="w-4 h-4" />
                        Holiday
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'working'})}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                          formData.type === 'working'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Briefcase className="w-4 h-4" />
                        Working Day
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {formData.type === 'holiday' 
                        ? 'Marks a regular working day as a holiday.' 
                        : 'Marks a holiday (like Sunday) as a working day.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date
                    </label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Event Name
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder={formData.type === 'holiday' ? "e.g., Republic Day" : "e.g., Extra Class Sunday"}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Additional details..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Event
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </Protected>
  );
}
