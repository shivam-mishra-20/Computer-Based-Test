"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

interface SyncStats {
  firebase: {
    students: number;
    teachers: number;
    batches: number;
    classes: number;
  };
  mongodb: {
    students: number;
    teachers: number;
    batches: number;
  };
  synced: {
    students: number;
    teachers: number;
  };
}

interface SyncResult {
  success: boolean;
  synced?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
  results?: Record<string, {
    synced: number;
    skipped: number;
    errors?: string[];
  }>;
}

export default function AdminFirebaseSync() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/admin/firebase/stats");
      setStats(data as SyncStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSync = async (type: "students" | "teachers" | "batches" | "all", dryRun = false) => {
    try {
      setSyncing(type);
      setLastSyncResult(null);
      
      let endpoint = "";
      const body = { dryRun };

      switch (type) {
        case "students":
          endpoint = "/admin/firebase/sync/students";
          break;
        case "teachers":
          endpoint = "/admin/firebase/sync/teachers";
          break;
        case "batches":
          endpoint = "/admin/firebase/sync/batches";
          break;
        case "all":
          endpoint = "/admin/firebase/sync/all";
          break;
      }

      const result = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setLastSyncResult(result as SyncResult);
      
      // Refresh stats after sync
      await loadStats();
    } catch (error) {
      const err = error as Error;
      setLastSyncResult({
        success: false,
        message: err.message || "Sync failed",
        errors: [err.message],
        synced: 0,
        skipped: 0
      });
    } finally {
      setSyncing(null);
    }
  };

  const StatCard = ({
    title,
    firebase,
    mongodb,
    synced,
    icon,
    color,
  }: {
    title: string;
    firebase: number;
    mongodb: number;
    synced?: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border-2 ${color} p-6 shadow-sm hover:shadow-md transition-all`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color.replace('border', 'bg').replace('500', '100')}`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Firebase:</span>
          <span className="text-2xl font-bold text-slate-900">{firebase}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">MongoDB:</span>
          <span className="text-2xl font-bold text-slate-900">{mongodb}</span>
        </div>
        {synced !== undefined && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-sm text-emerald-600 font-medium">Synced:</span>
            <span className="text-xl font-bold text-emerald-600">{synced}</span>
          </div>
        )}
      </div>
      
      {firebase > mongodb && (
        <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">{firebase - mongodb}</span> items in Firebase not yet synced
          </p>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Firebase Sync Management
          </h1>
          <p className="text-slate-600">
            Sync students, teachers, and batches from Firebase to MongoDB
          </p>
        </motion.div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Students"
              firebase={stats.firebase.students}
              mongodb={stats.mongodb.students}
              synced={stats.synced.students}
              color="border-blue-500"
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
            
            <StatCard
              title="Teachers"
              firebase={stats.firebase.teachers}
              mongodb={stats.mongodb.teachers}
              synced={stats.synced.teachers}
              color="border-purple-500"
              icon={
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            
            <StatCard
              title="Batches"
              firebase={stats.firebase.batches}
              mongodb={stats.mongodb.batches}
              color="border-emerald-500"
              icon={
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
          </div>
        ) : null}

        {/* Sync Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Sync Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SyncButton
              title="Sync Students"
              description="Sync all students from Firebase"
              icon="👨‍🎓"
              onClick={() => handleSync("students")}
              loading={syncing === "students"}
              color="blue"
            />
            
            <SyncButton
              title="Sync Teachers"
              description="Sync all teachers from Firebase"
              icon="👨‍🏫"
              onClick={() => handleSync("teachers")}
              loading={syncing === "teachers"}
              color="purple"
            />
            
            <SyncButton
              title="Sync Batches"
              description="Sync all batches from Firebase"
              icon="📚"
              onClick={() => handleSync("batches")}
              loading={syncing === "batches"}
              color="emerald"
            />
            
            <SyncButton
              title="Sync All"
              description="Sync students, teachers & batches"
              icon="🔄"
              onClick={() => handleSync("all")}
              loading={syncing === "all"}
              color="indigo"
            />
          </div>
        </motion.div>

        {/* Sync Results */}
        <AnimatePresence>
          {lastSyncResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-xl shadow-lg p-6 mb-8 ${
                lastSyncResult.success
                  ? "bg-emerald-50 border-2 border-emerald-500"
                  : "bg-rose-50 border-2 border-rose-500"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {lastSyncResult.success ? (
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div>
                    <h3 className={`text-xl font-bold ${lastSyncResult.success ? "text-emerald-900" : "text-rose-900"}`}>
                      {lastSyncResult.success ? "Sync Successful!" : "Sync Failed"}
                    </h3>
                    <p className={`text-sm ${lastSyncResult.success ? "text-emerald-700" : "text-rose-700"}`}>
                      {lastSyncResult.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLastSyncResult(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {lastSyncResult.results ? (
                <div className="space-y-3">
                  {Object.entries(lastSyncResult.results || {}).map(([key, result]) => (
                    <div key={key} className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-slate-800 capitalize mb-2">{key}</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Synced:</span>
                          <span className="ml-2 font-bold text-emerald-600">{result.synced}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Skipped:</span>
                          <span className="ml-2 font-bold text-amber-600">{result.skipped}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Errors:</span>
                          <span className="ml-2 font-bold text-rose-600">{result.errors?.length || 0}</span>
                        </div>
                      </div>
                      {result.errors && result.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-rose-600 hover:text-rose-700">
                            View Errors ({result.errors.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-rose-700 bg-rose-50 p-3 rounded">
                            {result.errors.map((err: string, idx: number) => (
                              <li key={idx}>• {err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {lastSyncResult.synced !== undefined && (
                    <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <span className="text-slate-600 block mb-1">Synced</span>
                        <span className="text-2xl font-bold text-emerald-600">{lastSyncResult.synced}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <span className="text-slate-600 block mb-1">Skipped</span>
                        <span className="text-2xl font-bold text-amber-600">{lastSyncResult.skipped}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <span className="text-slate-600 block mb-1">Errors</span>
                        <span className="text-2xl font-bold text-rose-600">{lastSyncResult.errors?.length || 0}</span>
                      </div>
                    </div>
                  )}
                  
                  {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-rose-600 hover:text-rose-700 font-medium">
                        View Errors ({lastSyncResult.errors.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-rose-700 bg-rose-50 p-4 rounded-lg">
                        {lastSyncResult.errors.map((err: string, idx: number) => (
                          <li key={idx} className="border-b border-rose-200 pb-2 last:border-0">• {err}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refresh Button */}
        <div className="flex justify-center">
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
}

interface SyncButtonProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  loading: boolean;
  color: string;
}

const SyncButton: React.FC<SyncButtonProps> = ({ title, description, icon, onClick, loading, color }) => {
  const colorClasses = {
    blue: "bg-blue-500 hover:bg-blue-600 border-blue-600",
    purple: "bg-purple-500 hover:bg-purple-600 border-purple-600",
    emerald: "bg-emerald-500 hover:bg-emerald-600 border-emerald-600",
    indigo: "bg-indigo-500 hover:bg-indigo-600 border-indigo-600",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className={`p-6 rounded-xl border-2 ${
        colorClasses[color as keyof typeof colorClasses]
      } text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm opacity-90">{description}</p>
      {loading && (
        <div className="mt-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="text-xs">Syncing...</span>
        </div>
      )}
    </motion.button>
  );
};
