/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

/**
 * QuestMl Dashboard — drives the standalone Python ingestion engine.
 *
 * Talks DIRECTLY to the QuestMl FastAPI service (NEXT_PUBLIC_QUESTML_URL), not the
 * Node backend. QuestMl does the extraction and itself bridges the questions into
 * your existing bank via /api/automation/bulk-import-questions — so this UI only
 * triggers runs and streams logs/stats; the DB schema + review UI are unchanged.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getToken } from '@/lib/auth';

const QUESTML_URL = (process.env.NEXT_PUBLIC_QUESTML_URL || 'http://localhost:8200').replace(/\/$/, '');
const QUESTML_KEY = process.env.NEXT_PUBLIC_QUESTML_KEY || '';
const CLASS_OPTIONS = ['class_8', 'class_9', 'class_10', 'class_11', 'class_12'];

const AI_PROVIDERS = [
  { value: 'none',         label: 'None (skip)',            sub: 'No AI enrichment',              color: 'gray'   },
  { value: 'qwen',         label: 'Qwen3:8B',               sub: 'Local · Ollama · zero cost',    color: 'violet' },
  { value: 'gemini_flash', label: 'Gemini 2.5 Flash',       sub: 'Cloud · fast · low cost',       color: 'blue'   },
  { value: 'gemini_pro',   label: 'Gemini 2.5 Pro',         sub: 'Cloud · best quality · higher cost', color: 'indigo' },
] as const;
type AIProvider = typeof AI_PROVIDERS[number]['value'];

interface Ready {
  bridge_configured: boolean;
  mathpix_ready: boolean;
  low_conf_action: string;
  requires_key: boolean;
  classification_enabled: boolean;
  classification_provider: string;
  classifier_ready: boolean;
}
interface ClassifyHealth {
  ok: boolean;
  provider: string;
  message: string;
  label: string;
}
interface JobStats {
  pages: number; scanned_pages: number; raw_questions: number; accepted: number;
  imported: number; held: number; dropped: number; invalid: number; duplicates: number;
  mathpix_calls: number; by_type: Record<string, number>; by_confidence: Record<string, number>;
  classified: number; classification_failed: number; classification_pending: number;
  classification_provider: string; classification_total_latency_ms: number;
}
interface Job {
  id: string; status: 'queued' | 'running' | 'completed' | 'failed';
  file_name: string; target_collection: string; subject?: string | null;
  duration_s?: number | null; message?: string; errors?: string[]; stats: JobStats;
}

const keyHeaders = (): Record<string, string> => (QUESTML_KEY ? { 'X-Ingest-Key': QUESTML_KEY } : {});
const bridgeHeaders = (): Record<string, string> => {
  const t = getToken();
  return { ...keyHeaders(), ...(t ? { 'X-Node-Token': t } : {}) };
};

function StatTile({ label, value, accent, small }: { label: string; value: React.ReactNode; accent?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className={`font-bold ${small ? 'text-lg' : 'text-2xl'} ${accent ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function Chips({ data, palette }: { data: Record<string, number>; palette: Record<string, string> }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, v]) => (
        <span key={k} className={`text-xs px-2 py-0.5 rounded-full border ${palette[k] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
          {k} · {v}
        </span>
      ))}
    </div>
  );
}

function ClassifyBadge({ provider, status }: { provider: string; status: string }) {
  if (!provider || provider === 'none') return null;
  const labels: Record<string, string> = {
    qwen:         'Qwen3:8B',
    gemini_flash: 'Gemini Flash',
    gemini_pro:   'Gemini Pro',
  };
  const colors: Record<string, string> = {
    success:  'bg-violet-50 text-violet-700 border-violet-200',
    failed:   'bg-red-50 text-red-700 border-red-200',
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    disabled: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md border ${colors[status] || colors.disabled}`}>
      ✦ {labels[provider] || provider} · {status}
    </span>
  );
}

export default function QuestMlDashboard() {
  const [ready, setReady] = useState<Ready | null>(null);
  const [classifyHealth, setClassifyHealth] = useState<ClassifyHealth | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [held, setHeld] = useState<any[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shutdownBusy, setShutdownBusy] = useState(false);

  // form
  const [mode, setMode] = useState<'path' | 'upload'>('path');
  const [sourcePath, setSourcePath] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetCollection, setTargetCollection] = useState('class_12');
  const [subject, setSubject] = useState('');
  const [pageLimit, setPageLimit] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('none');

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ── data fetchers ─────────────────────────────────────────────────────────
  const fetchReady = useCallback(async () => {
    try {
      const res = await fetch(`${QUESTML_URL}/ready`, { headers: keyHeaders() });
      if (!res.ok) throw new Error();
      const data: Ready = await res.json();
      setReady(data);
      setOnline(true);
      // Sync the provider picker with what the server currently uses
      if (data.classification_provider && data.classification_provider !== 'none') {
        setAiProvider(data.classification_provider as AIProvider);
      }
    } catch {
      setOnline(false); setReady(null);
    }
  }, []);

  const fetchClassifyHealth = useCallback(async () => {
    try {
      const res = await fetch(`${QUESTML_URL}/classify/health`, { headers: keyHeaders() });
      if (res.ok) setClassifyHealth(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${QUESTML_URL}/api/v1/jobs?limit=15`, { headers: keyHeaders() });
      if (res.ok) setJobs((await res.json()).jobs || []);
    } catch { /* offline handled elsewhere */ }
  }, []);

  useEffect(() => {
    fetchReady(); fetchJobs(); fetchClassifyHealth();
    const t = setInterval(() => { fetchReady(); }, 15000);
    return () => {
      clearInterval(t);
      sseRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchReady, fetchJobs, fetchClassifyHealth]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // ── live stream + poll for a job ──────────────────────────────────────────
  const connectSSE = useCallback((jobId: string) => {
    sseRef.current?.close();
    const url = `${QUESTML_URL}/api/v1/jobs/${jobId}/logs/stream?key=${encodeURIComponent(QUESTML_KEY)}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const line = JSON.parse(e.data) as string;
        setLogs(prev => (prev.length > 600 ? [...prev.slice(-600), line] : [...prev, line]));
      } catch { /* keep-alive ping */ }
    };
    es.onerror = () => es.close();
    sseRef.current = es;
  }, []);

  const startPolling = useCallback((jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${QUESTML_URL}/api/v1/jobs/${jobId}`, { headers: keyHeaders() });
        if (!res.ok) return;
        const job: Job = await res.json();
        setActiveJob(job);
        if (job.status === 'completed' || job.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          fetchJobs();
          loadHeld(jobId);
        }
      } catch { /* transient */ }
    }, 1500);
  }, [fetchJobs]);

  const openJob = useCallback((jobId: string) => {
    setLogs([]); setHeld([]); setShowHeld(false);
    connectSSE(jobId);
    startPolling(jobId);
    fetch(`${QUESTML_URL}/api/v1/jobs/${jobId}`, { headers: keyHeaders() })
      .then(r => r.ok ? r.json() : null).then(j => j && setActiveJob(j)).catch(() => {});
  }, [connectSSE, startPolling]);

  const loadHeld = async (jobId: string) => {
    try {
      const res = await fetch(`${QUESTML_URL}/api/v1/jobs/${jobId}/held`, { headers: keyHeaders() });
      if (res.ok) setHeld((await res.json()).held || []);
    } catch { /* ignore */ }
  };

  // ── actions ───────────────────────────────────────────────────────────────
  const start = async () => {
    setError(null); setBusy(true);
    try {
      let res: Response;
      if (mode === 'upload') {
        if (!file) { setError('Choose a .pdf or .epub file'); setBusy(false); return; }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('target_collection', targetCollection);
        if (subject) fd.append('subject', subject);
        if (pageLimit) fd.append('page_limit', pageLimit);
        res = await fetch(`${QUESTML_URL}/api/v1/ingest/upload`, { method: 'POST', headers: bridgeHeaders(), body: fd });
      } else {
        if (!sourcePath.trim()) { setError('Enter a server file path'); setBusy(false); return; }
        res = await fetch(`${QUESTML_URL}/api/v1/ingest/path`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...bridgeHeaders() },
          body: JSON.stringify({
            source_path: sourcePath.trim(), target_collection: targetCollection,
            subject: subject || null, page_limit: pageLimit ? Number(pageLimit) : null,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.detail || `Failed (HTTP ${res.status})`); setBusy(false); return; }
      setActiveJob(data as Job);
      openJob((data as Job).id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start ingestion');
    } finally {
      setBusy(false);
    }
  };

  const replay = async (jobId: string) => {
    try {
      const res = await fetch(`${QUESTML_URL}/api/v1/jobs/${jobId}/replay`, { method: 'POST', headers: bridgeHeaders() });
      const d = await res.json();
      alert(`Replayed ${d.batches_replayed} batch(es) · imported ${d.imported} · still failing ${d.still_failing}`);
      fetch(`${QUESTML_URL}/api/v1/jobs/${jobId}`, { headers: keyHeaders() }).then(r => r.json()).then(setActiveJob);
    } catch { setError('Replay failed'); }
  };

  const handleShutdown = async () => {
    if (!window.confirm('Stop the QuestMl engine? You will need to restart it manually.')) return;
    setShutdownBusy(true);
    try {
      await fetch(`${QUESTML_URL}/api/v1/server/shutdown`, { method: 'POST', headers: bridgeHeaders() });
      setTimeout(() => { setOnline(false); setReady(null); setShutdownBusy(false); }, 800);
    } catch {
      setOnline(false); setReady(null); setShutdownBusy(false);
    }
  };

  const handleRestart = async () => {
    if (!window.confirm('Restart the QuestMl engine?')) return;
    setShutdownBusy(true);
    try {
      await fetch(`${QUESTML_URL}/api/v1/server/restart`, { method: 'POST', headers: bridgeHeaders() });
      setTimeout(async () => {
        await fetchReady();
        setShutdownBusy(false);
      }, 3000);
    } catch {
      setShutdownBusy(false);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const s = activeJob?.stats;
  const isRunning = activeJob && (activeJob.status === 'running' || activeJob.status === 'queued');
  const statusBadge = (st: Job['status']) => ({
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    running:   'bg-blue-100 text-blue-800 border-blue-200',
    queued:    'bg-amber-100 text-amber-800 border-amber-200',
    failed:    'bg-red-100 text-red-800 border-red-200',
  }[st]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QuestMl · Fast Ingestion</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Deterministic PDF/EPUB → question bank · <span className="font-semibold text-indigo-700">PyMuPDF + optional AI enrichment</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                online ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {online === null ? 'Checking…' : online ? 'Engine online' : 'Engine offline'}
              </span>
              <Button onClick={() => { fetchReady(); fetchJobs(); fetchClassifyHealth(); }} variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">↻ Refresh</Button>
              {online && (
                <>
                  <Button onClick={handleRestart} disabled={shutdownBusy} variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 text-sm">
                    {shutdownBusy ? '…' : '↺ Restart'}
                  </Button>
                  <Button onClick={handleShutdown} disabled={shutdownBusy} variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 text-sm">
                    {shutdownBusy ? '…' : '⏹ Stop'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* readiness chips */}
          {ready && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className={`text-xs px-2.5 py-1 rounded-lg border ${getToken() ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                Bridge: {getToken() ? 'your admin session' : 'log in as admin'}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg border bg-gray-50 text-gray-600 border-gray-200">
                Mathpix {ready.mathpix_ready ? 'enabled' : 'off'}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg border bg-gray-50 text-gray-600 border-gray-200">
                low-confidence → {ready.low_conf_action}
              </span>
              {/* Classification provider chip from server */}
              {ready.classification_enabled && ready.classification_provider !== 'none' ? (
                <span className={`text-xs px-2.5 py-1 rounded-lg border ${
                  ready.classifier_ready
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  ✦ {classifyHealth?.label || `AI: ${ready.classification_provider}`}
                  {!ready.classifier_ready && ' (not ready)'}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-lg border bg-gray-50 text-gray-400 border-gray-200">
                  AI enrichment off
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* offline help */}
        {online === false && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
            <p className="font-semibold mb-1">QuestMl engine not reachable at <code>{QUESTML_URL}</code></p>
            <p>Start it: <code className="bg-amber-100 px-1.5 py-0.5 rounded">uvicorn app.main:app --port 8200</code> in the QuestMl folder.
              Override the URL with <code>NEXT_PUBLIC_QUESTML_URL</code>.</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Trigger card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Ingestion</h2>

          {/* Source mode toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 mb-4">
            {(['path', 'upload'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {m === 'path' ? 'Server path' : 'Upload file'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mode === 'path' ? (
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">File path on the QuestMl server</label>
                <input value={sourcePath} onChange={e => setSourcePath(e.target.value)}
                  placeholder="C:\Users\Shivam\cbt-exam-be\class_12\book.pdf"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            ) : (
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Upload .pdf / .epub</label>
                <input type="file" accept=".pdf,.epub" onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target collection</label>
              <select value={targetCollection} onChange={e => setTargetCollection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject (optional)</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="auto-detect from metadata"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Page limit (optional)</label>
              <input value={pageLimit} onChange={e => setPageLimit(e.target.value.replace(/\D/g, ''))} placeholder="all pages"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>

            {/* AI Provider selector */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                AI Classification provider
                <span className="ml-1.5 text-gray-400 font-normal">(enriches subject · chapter · topic · difficulty — extraction always stays deterministic)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AI_PROVIDERS.map(p => {
                  const colorMap: Record<string, string> = {
                    gray:   'border-gray-300 bg-gray-50 text-gray-600',
                    violet: 'border-violet-500 bg-violet-50 text-violet-800',
                    blue:   'border-blue-500 bg-blue-50 text-blue-800',
                    indigo: 'border-indigo-500 bg-indigo-50 text-indigo-800',
                  };
                  const selectedRing: Record<string, string> = {
                    gray:   'ring-2 ring-gray-400',
                    violet: 'ring-2 ring-violet-500',
                    blue:   'ring-2 ring-blue-500',
                    indigo: 'ring-2 ring-indigo-500',
                  };
                  const isSelected = aiProvider === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setAiProvider(p.value)}
                      className={`flex flex-col items-start px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? colorMap[p.color] + ' ' + selectedRing[p.color]
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? {
                          gray: 'bg-gray-500', violet: 'bg-violet-500',
                          blue: 'bg-blue-500', indigo: 'bg-indigo-500',
                        }[p.color] : 'bg-gray-300'}`} />
                        <span className="text-sm font-semibold leading-tight">{p.label}</span>
                      </div>
                      <span className={`text-[11px] mt-1 leading-tight ${isSelected ? 'opacity-80' : 'text-gray-400'}`}>{p.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Provider health status */}
              {aiProvider !== 'none' && classifyHealth && (
                <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                  classifyHealth.ok
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <span>{classifyHealth.ok ? '✓' : '✗'}</span>
                  <span>{classifyHealth.message}</span>
                </div>
              )}
              {aiProvider !== 'none' && !classifyHealth && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ Set <code>CLASSIFICATION_ENABLED=true</code> and <code>CLASSIFICATION_PROVIDER={aiProvider}</code> in QuestMl&apos;s .env, then restart the engine.
                </p>
              )}
            </div>

            <div className="flex items-end">
              <Button onClick={start} disabled={busy || !online || !getToken()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                {busy ? 'Starting…' : '▶ Start ingestion'}
              </Button>
            </div>
          </div>
          {!getToken() && (
            <p className="text-xs text-red-600 mt-2">Log in as an admin — your session token is forwarded to QuestMl for the import.</p>
          )}
        </motion.div>

        {/* Active job */}
        {activeJob && s && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{activeJob.file_name}</h2>
                  <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold uppercase ${statusBadge(activeJob.status)}`}>
                    {activeJob.status}
                  </span>
                  {isRunning && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                  {/* Classification provider audit badge */}
                  {s.classification_provider && s.classification_provider !== 'none' && (
                    <ClassifyBadge
                      provider={s.classification_provider}
                      status={s.classified > 0 ? 'success' : s.classification_failed > 0 ? 'failed' : 'pending'}
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeJob.target_collection} · {activeJob.subject || 'auto subject'}
                  {activeJob.duration_s != null && ` · ${activeJob.duration_s}s`}
                </p>
              </div>
              {(activeJob.errors?.length ?? 0) > 0 && (
                <Button onClick={() => replay(activeJob.id)} variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 text-sm">↻ Replay failed batches</Button>
              )}
            </div>

            {/* Ingestion stats */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
              <StatTile label="Pages"    value={s.pages} />
              <StatTile label="Found"    value={s.raw_questions} />
              <StatTile label="Accepted" value={s.accepted} />
              <StatTile label="Imported" value={s.imported} accent />
              <StatTile label="Held"     value={s.held} />
              <StatTile label="Dupes"    value={s.duplicates} />
              <StatTile label="Mathpix"  value={s.mathpix_calls} />
            </div>

            {/* Classification stats — only shown when a provider was used */}
            {s.classification_provider && s.classification_provider !== 'none' && (
              <div className="mb-4 p-4 rounded-xl bg-violet-50 border border-violet-100">
                <div className="text-xs font-semibold text-violet-700 mb-2 uppercase tracking-wide">
                  ✦ AI Classification · {s.classification_provider}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StatTile label="Classified"  value={s.classified}             accent small />
                  <StatTile label="Failed"       value={s.classification_failed}  small />
                  <StatTile label="Pending"      value={s.classification_pending} small />
                </div>
                {s.classification_total_latency_ms > 0 && (
                  <p className="text-xs text-violet-600 mt-2">Total API time: {(s.classification_total_latency_ms / 1000).toFixed(1)}s</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1.5">By type</div>
                <Chips data={s.by_type} palette={{}} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1.5">By confidence</div>
                <Chips data={s.by_confidence} palette={{
                  high:   'bg-emerald-100 text-emerald-700 border-emerald-200',
                  medium: 'bg-amber-100 text-amber-700 border-amber-200',
                  low:    'bg-red-100 text-red-700 border-red-200',
                }} />
              </div>
            </div>
            {activeJob.message && <p className="text-xs text-gray-500 mt-3">{activeJob.message}</p>}

            {held.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => setShowHeld(v => !v)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  {showHeld ? '▾' : '▸'} {held.length} held (low-confidence) question{held.length > 1 ? 's' : ''}
                </button>
                <AnimatePresence>
                  {showHeld && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                      {held.map((h, i) => (
                        <div key={i} className="p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{h.type}</span>
                            <span className="text-xs text-red-600">conf {h.confidence}</span>
                            <span className="text-xs text-gray-400">p{h.page} · {(h.reasons || []).join(', ') || (h.errors || []).join(', ')}</span>
                          </div>
                          <p className="text-gray-700 line-clamp-2">{h.text}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Live logs */}
        {(logs.length > 0 || isRunning) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Live Logs</h2>
              <button onClick={() => setLogs([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
            </div>
            <div className="bg-gray-950 p-4 font-mono text-xs max-h-80 overflow-y-auto">
              {logs.map((line, i) => {
                const isErr  = /error|failed|fatal|rejected/i.test(line);
                const isOk   = /saved|completed|imported|done/i.test(line);
                const isAI   = /classify|classification|enriched/i.test(line);
                return (
                  <div key={i} className={`mb-0.5 leading-relaxed ${
                    isErr ? 'text-red-400' : isOk ? 'text-emerald-400' : isAI ? 'text-violet-400' : 'text-gray-300'
                  }`}>{line}</div>
                );
              })}
              {logs.length === 0 && <div className="text-gray-500">waiting for logs…</div>}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}

        {/* Recent jobs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No jobs yet. Start an ingestion above.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map(j => (
                <button key={j.id} onClick={() => openJob(j.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{j.file_name}</div>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{j.target_collection}</span>
                      <span className="text-emerald-600 font-medium">{j.stats.imported} imported</span>
                      <span>{j.stats.held} held</span>
                      <span>{j.stats.duplicates} dup</span>
                      {j.duration_s != null && <span>{j.duration_s}s</span>}
                      {/* Classification source on job card */}
                      {j.stats.classification_provider && j.stats.classification_provider !== 'none' && j.stats.classified > 0 && (
                        <span className="text-violet-600">✦ {j.stats.classified} classified by {j.stats.classification_provider}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold uppercase ${statusBadge(j.status)}`}>{j.status}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
