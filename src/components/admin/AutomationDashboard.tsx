'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AutomationStatus {
  isEnabled: boolean;
  currentlyRunning: boolean;
  lastRun?: string;
  totalRuns: number;
  successfulRuns: number;
}

interface ProcessingStat {
  _id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalQuestions: number;
  questionsImported: number;
  questionsWithDiagrams: number;
  questionsWithCorrectAnswers: number;
  questionsWithOptions: number;
  startTime: string;
  endTime?: string;
  bookMetadata?: {
    title: string;
    subject: string;
    class: string;
    board: string;
  };
}

interface Summary {
  totalBooks: number;
  totalQuestions: number;
  totalImported: number;
  withDiagrams: number;
  withCorrectAnswers: number;
  withOptions: number;
  completed: number;
  failed: number;
}

interface FolderFile {
  name: string;
  path: string;
  size: number;
  type: 'epub' | 'pdf';
}

interface FolderInfo {
  name: string;
  path: string;
  fileCount: number;
  files: FolderFile[];
}

// ── small helpers ──────────────────────────────────────────────────────────────

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusColor(s: ProcessingStat['status']) {
  return {
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-gray-100 text-gray-700 border-gray-200',
  }[s];
}

// ── component ──────────────────────────────────────────────────────────────────

export default function AutomationDashboard() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [stats, setStats] = useState<ProcessingStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const [availableFolders, setAvailableFolders] = useState<FolderInfo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderInfo | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [aiProvider, setAiProvider] = useState<'ollama' | 'gemini'>('ollama');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const connectSSE = useCallback((token: string) => {
    sseRef.current?.close();
    const url = `${API_BASE_URL}/api/automation/logs`;
    const es = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
    es.onmessage = (e) => {
      try {
        const line = JSON.parse(e.data) as string;
        setProcessingLogs(prev => {
          const next = [...prev, line];
          return next.length > 500 ? next.slice(-500) : next;
        });
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => {
      es.close();
      setTimeout(() => {
        const t = getToken();
        if (t) connectSSE(t);
      }, 5000);
    };
    sseRef.current = es;
  }, []); // stable — no reactive deps needed

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = getToken();
    if (!token) {
      setError('Please log in to access the automation dashboard');
      setLoading(false);
      return;
    }
    fetchData();
    fetchAvailableFolders();
    connectSSE(token);
    const interval = setInterval(fetchData, 10000);
    return () => {
      clearInterval(interval);
      sseRef.current?.close();
    };
  }, [connectSSE]);

  // auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [processingLogs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const fetchAvailableFolders = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/automation/folders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableFolders(data.folders || []);
      }
    } catch { /* silent */ }
  };

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const token = getToken();
      if (!token) { setError('No authentication token found'); return; }

      const [statusRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/automation/status`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/automation/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statusRes.ok) {
        const d = await statusRes.json();
        if (d.success) setStatus(d.status);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        if (d.success) { setStats(d.stats || []); setSummary(d.summary); }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleAutomation = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/automation/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !status?.isEnabled }),
      });
      const data = await res.json();
      if (data.success) setStatus(data.status);
    } catch { setError('Failed to toggle automation'); }
  };

  const stopProcessing = async () => {
    if (!window.confirm('Stop the current automation process?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/automation/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) { addLog('Automation stopped by user'); setProcessingStartTime(null); fetchData(); }
      else setError(data.message || 'Failed to stop');
    } catch { setError('Failed to stop automation'); }
  };

  const startProcessing = async (folderName: string, files: string[] = [], provider: 'ollama' | 'gemini' = 'ollama') => {
    try {
      const token = getToken();
      const uniqueFiles = Array.from(new Set(files.filter(Boolean)));
      setProcessingLogs([]);
      setProcessingStartTime(Date.now());
      addLog(`Starting automation for ${folderName}...`);
      addLog(uniqueFiles.length > 0 ? `Processing ${uniqueFiles.length} selected file(s)` : 'Processing all EPUB/PDF files in folder');

      const res = await fetch(`${API_BASE_URL}/api/automation/trigger`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folderName, selectedFiles: uniqueFiles, aiProvider: provider }),
      });

      const data = await res.json();
      if (data.success) {
        addLog(`Processing started successfully`);
        addLog(`Folder: ${data.folder}`);
        if (Array.isArray(data.selectedFiles) && data.selectedFiles.length > 0) {
          addLog(`Selected files: ${data.selectedFiles.length}`);
        }
        addLog(provider === 'gemini' ? `AI: Google Gemini ${process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash'} (cloud)` : `AI: Ollama Qwen3:8b (local, JSON mode)`);
        startPolling();
      } else {
        addLog(`Failed to start: ${data.message}`);
        setProcessingStartTime(null);
      }
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Failed to trigger automation'}`);
      setProcessingStartTime(null);
    }
  };

  const startPolling = () => {
    const poll = setInterval(async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/automation/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          if (d.success) {
            const newStatus = d.status;
            if (status?.currentlyRunning && !newStatus.currentlyRunning) {
              clearInterval(poll);
              if (processingStartTime) {
                const duration = ((Date.now() - processingStartTime) / 1000).toFixed(1);
                addLog(`Completed in ${duration}s`);
              }
              const token2 = getToken();
              const statsRes = await fetch(`${API_BASE_URL}/api/automation/stats?limit=1`, {
                headers: { Authorization: `Bearer ${token2}` },
              });
              if (statsRes.ok) {
                const sd = await statsRes.json();
                if (sd.success && sd.stats?.length > 0) {
                  const s = sd.stats[0];
                  addLog(`Results: ${s.questionsImported}/${s.totalQuestions} imported · ${s.questionsWithDiagrams} diagrams · ${s.status.toUpperCase()}`);
                }
              }
              setProcessingStartTime(null);
              fetchData();
            }
            setStatus(newStatus);
          }
        }
      } catch { /* silent */ }
    }, 30000);
  };

  const handleFolderSelection = (folder: FolderInfo) => {
    setSelectedFolder(folder);
    setSelectedFiles((folder.files || []).map(f => f.name));
  };

  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  };

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading automation dashboard...</p>
        </div>
      </div>
    );
  }

  const successRate = status && status.totalRuns > 0
    ? ((status.successfulRuns / status.totalRuns) * 100).toFixed(1)
    : '—';
  const importRate = summary && summary.totalQuestions > 0
    ? ((summary.totalImported / summary.totalQuestions) * 100).toFixed(1)
    : '—';

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EPUB Question Extractor</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Powered by{' '}
                  <span className="font-semibold text-violet-700">Ollama · Qwen3:8b</span>
                  {' '}— local, private, zero cloud cost
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* AI badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-xs font-medium text-violet-700">qwen3:8b · local</span>
              </div>

              <Button
                onClick={fetchData}
                variant="outline"
                disabled={refreshing}
                className="flex items-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <span className={refreshing ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
                <span className="hidden sm:inline text-sm">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"
            >
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Status + Controls ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Automation Status</h2>
              <div className="flex flex-wrap gap-3">
                {/* Enabled badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
                  status?.isEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${status?.isEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {status?.isEnabled ? 'Enabled' : 'Disabled'}
                </div>

                {/* Running badge */}
                {status?.currentlyRunning && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Running
                  </div>
                )}
              </div>

              {status?.lastRun && (
                <p className="text-xs text-gray-500 mt-2">
                  Last run: {new Date(status.lastRun).toLocaleString()}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={toggleAutomation}
                disabled={status?.currentlyRunning}
                className={`${status?.isEnabled
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {status?.isEnabled ? '⏸ Disable' : '▶ Enable'}
              </Button>

              {status?.currentlyRunning ? (
                <Button onClick={stopProcessing} className="bg-red-600 hover:bg-red-700 text-white">
                  ⏹ Stop
                </Button>
              ) : (
                <Button
                  onClick={() => { setSelectedFolder(null); setSelectedFiles([]); setShowModal(true); }}
                  disabled={!status?.isEnabled}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  ▶ Run Now
                </Button>
              )}
            </div>
          </div>

          {/* Run metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-gray-100">
            {[
              { label: 'Total Runs', value: status?.totalRuns ?? 0, color: 'text-gray-900' },
              { label: 'Successful', value: status?.successfulRuns ?? 0, color: 'text-emerald-700' },
              { label: 'Failed', value: (status?.totalRuns ?? 0) - (status?.successfulRuns ?? 0), color: 'text-red-600' },
              { label: 'Success Rate', value: `${successRate}%`, color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Summary Stats ───────────────────────────────────────────────────── */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { label: 'Books Processed', value: summary.totalBooks, sub: null, accent: false },
              { label: 'Questions Extracted', value: summary.totalQuestions.toLocaleString(), sub: null, accent: false },
              { label: 'Successfully Imported', value: summary.totalImported.toLocaleString(), sub: `${importRate}% success rate`, accent: true },
              { label: 'With Diagrams', value: summary.withDiagrams.toLocaleString(), sub: `${summary.totalQuestions > 0 ? ((summary.withDiagrams / summary.totalQuestions) * 100).toFixed(1) : 0}% of total`, accent: false },
            ].map(({ label, value, sub, accent }) => (
              <div
                key={label}
                className={`rounded-2xl border p-5 shadow-sm ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}
              >
                <div className={`text-sm mb-1 ${accent ? 'text-emerald-700' : 'text-gray-500'}`}>{label}</div>
                <div className={`text-3xl font-bold ${accent ? 'text-emerald-800' : 'text-gray-900'}`}>{value}</div>
                {sub && <div className={`text-xs mt-1 ${accent ? 'text-emerald-600' : 'text-gray-500'}`}>{sub}</div>}
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Processing Logs ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {processingLogs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Processing Logs</h2>
                <div className="flex items-center gap-3">
                  {status?.currentlyRunning && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Running…
                    </span>
                  )}
                  {processingStartTime && (
                    <span className="text-xs text-gray-500">
                      {((Date.now() - processingStartTime) / 1000).toFixed(0)}s elapsed
                    </span>
                  )}
                  <button
                    onClick={() => setProcessingLogs([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="bg-gray-950 p-4 font-mono text-xs max-h-72 overflow-y-auto">
                {processingLogs.map((log, i) => {
                  const isError = log.includes('Error') || log.includes('Failed') || log.includes('❌');
                  const isSuccess = log.includes('✓') || log.includes('completed') || log.includes('imported');
                  return (
                    <div
                      key={i}
                      className={`mb-0.5 leading-relaxed ${
                        isError ? 'text-red-400' : isSuccess ? 'text-emerald-400' : 'text-gray-300'
                      }`}
                    >
                      {log}
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recent Processing ───────────────────────────────────────────────── */}
        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Processing</h2>
            <div className="space-y-2">
              {stats.slice(0, 10).map((stat) => (
                <div
                  key={stat._id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{stat.fileName}</div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="text-xs text-gray-500">{stat.totalQuestions} extracted</span>
                      <span className="text-xs text-emerald-600 font-medium">{stat.questionsImported} imported</span>
                      <span className="text-xs text-gray-500">{stat.questionsWithDiagrams} diagrams</span>
                      {stat.bookMetadata?.subject && (
                        <span className="text-xs text-violet-600">{stat.bookMetadata.subject}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wide ${statusColor(stat.status)}`}
                  >
                    {stat.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────────── */}
        {!loading && stats.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No processing runs yet. Enable automation and click Run Now.</p>
          </div>
        )}
      </div>

      {/* ── Folder / File Selection Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Select Files to Process</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Choose a class folder and the EPUB/PDF files to extract questions from
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* AI Provider toggle */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Provider</p>
                  </div>
                  <div className="p-3 flex gap-2">
                    <button
                      onClick={() => setAiProvider('ollama')}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                        aiProvider === 'ollama'
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${aiProvider === 'ollama' ? 'bg-violet-500' : 'bg-gray-300'}`} />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Ollama (Local)</div>
                        <div className="text-xs text-gray-500">Qwen3:8b · private · zero cost</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setAiProvider('gemini')}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                        aiProvider === 'gemini'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${aiProvider === 'gemini' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Gemini (Cloud)</div>
                        <div className="text-xs text-gray-500">gemini-2.0-flash · Google API</div>
                      </div>
                    </button>
                  </div>
                </div>

                {availableFolders.length > 0 ? (
                  <>
                    {/* Folder list */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Class Folders</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {availableFolders.map(folder => (
                          <button
                            key={folder.name}
                            onClick={() => handleFolderSelection(folder)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              selectedFolder?.name === folder.name
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'
                            }`}
                          >
                            <div className="text-lg mb-1">📚</div>
                            <div className="text-sm font-semibold text-gray-900 leading-tight">
                              {folder.name.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* File list */}
                    {selectedFolder && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-gray-200 rounded-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <div>
                            <span className="text-sm font-semibold text-gray-900">
                              {selectedFolder.name.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {selectedFiles.length}/{selectedFolder.files.length} selected
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setSelectedFiles(selectedFolder.files.map(f => f.name))}
                              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                            >
                              All
                            </button>
                            <button
                              onClick={() => setSelectedFiles([])}
                              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                            >
                              None
                            </button>
                          </div>
                        </div>

                        {selectedFolder.files.length > 0 ? (
                          <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                            {selectedFolder.files.map(file => {
                              const checked = selectedFiles.includes(file.name);
                              return (
                                <label
                                  key={file.path}
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                    checked ? 'bg-emerald-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleFileSelection(file.name)}
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {file.type.toUpperCase()} · {formatFileSize(file.size)}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-gray-500">
                            No EPUB/PDF files in this folder
                          </div>
                        )}
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500">
                    <p className="font-medium mb-1">No class folders found</p>
                    <p className="text-xs">Add folders named class_11, class_12, etc. on the server</p>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 p-6 border-t border-gray-100">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedFolder) return;
                    setShowModal(false);
                    startProcessing(selectedFolder.name, selectedFiles, aiProvider);
                  }}
                  disabled={!selectedFolder || selectedFiles.length === 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                >
                  Run {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}` : 'Selected'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
