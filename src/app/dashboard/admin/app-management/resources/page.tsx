"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { InlineLoader } from "@/components/ElegantLoader";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudyResource {
  _id: string;
  title: string;
  description: string;
  type: "video" | "pdf";
  resourceUrl: string;
  thumbnailUrl?: string;
  category: string;
  subject: string;
  classLevel: string;
  batch?: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  isPublic: boolean;
  isFeatured: boolean;
  duration?: number;
  fileSize?: number;
  pageCount?: number;
  viewCount?: number;
  downloadCount?: number;
  youtubeVideoId?: string;
  uploadedBy: { name: string; email: string };
  createdAt: string;
}

interface FormState {
  title: string;
  description: string;
  resourceUrl: string;
  thumbnailUrl: string;
  category: string;
  subject: string;
  classLevel: string;
  batch: string;
  tags: string;
  duration: string;
  viewCount: string;
  pageCount: string;
  isPublic: boolean;
  isFeatured: boolean;
  status: "draft" | "published" | "archived";
}

interface YouTubeMetadataResponse {
  videoId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  viewCount?: number;
  tags?: string[];
  canonicalUrl?: string;
}

interface PlImportPreview {
  playlistId: string;
  meta: { title: string; channelName: string; thumbnail: string; totalVideos: number };
  videos: { videoId: string; title: string; thumbnail: string; durationSec: number }[];
  totalVideos: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  "Physics","Chemistry","Mathematics","Biology","English","Hindi",
  "Accounts","Economics","Business Studies","History","Geography","Civics","Computer Science",
];
const CLASSES = ["8","9","10","11","12"];

const EMPTY_FORM: FormState = {
  title:"", description:"", resourceUrl:"", thumbnailUrl:"",
  category:"", subject:"", classLevel:"", batch:"", tags:"",
  duration:"", viewCount:"", pageCount:"",
  isPublic: true, isFeatured: false, status: "published",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(sec?: number) {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function fmtSize(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ytThumb(videoId?: string) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
}

function extractYouTubeId(urlOrId: string): string | null {
  const input = (urlOrId || "").trim();
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id?.length === 11 ? id : null;
    }
    if (host.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v?.length === 11) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if ((parts[0] === "shorts" || parts[0] === "embed") && parts[1]?.length === 11) return parts[1];
    }
  } catch {}
  const m = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700",
    draft: "bg-amber-100 text-amber-700",
    archived: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

function ResourceThumbnail({ resource, className = "" }: { resource: StudyResource; className?: string }) {
  const thumb = resource.thumbnailUrl || ytThumb(resource.youtubeVideoId);
  if (thumb) {
    return (
      <div className={`relative bg-slate-200 overflow-hidden ${className}`}>
        <Image src={thumb} alt="" fill className="object-cover" unoptimized />
        {resource.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`bg-slate-100 flex items-center justify-center ${className}`}>
      {resource.type === "video" ? (
        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
      ) : (
        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResourcesManagementPage() {
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"video" | "pdf">("video");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Add / Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ytFetching, setYtFetching] = useState(false);
  const [ytStatus, setYtStatus] = useState("");
  const ytDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<StudyResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Playlist import
  const [showPlImport, setShowPlImport] = useState(false);
  const [plUrl, setPlUrl] = useState("");
  const [plSubject, setPlSubject] = useState("");
  const [plClass, setPlClass] = useState("");
  const [plCategory, setPlCategory] = useState("");
  const [plTags, setPlTags] = useState("");
  const [plBatch, setPlBatch] = useState("");
  const [plPublic, setPlPublic] = useState(true);
  const [plPreviewing, setPlPreviewing] = useState(false);
  const [plPreview, setPlPreview] = useState<PlImportPreview | null>(null);
  const [plImporting, setPlImporting] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/resources/admin/all?type=${activeTab}`) as StudyResource[];
      setResources(data);
    } catch {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = resources.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
        !r.category.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSubject && r.subject !== filterSubject) return false;
    if (filterClass && r.classLevel !== filterClass) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: resources.length,
    published: resources.filter(r => r.status === "published").length,
    draft: resources.filter(r => r.status === "draft").length,
  };

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setF = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

  const openAdd = () => {
    setEditingResource(null);
    setForm({ ...EMPTY_FORM, status: "published" });
    setPdfFile(null); setYtStatus("");
    setShowForm(true); setShowPlImport(false);
  };

  const openEdit = (r: StudyResource) => {
    setEditingResource(r);
    setForm({
      title: r.title, description: r.description || "",
      resourceUrl: r.resourceUrl || "", thumbnailUrl: r.thumbnailUrl || "",
      category: r.category, subject: r.subject, classLevel: r.classLevel,
      batch: r.batch || "", tags: r.tags.join(", "),
      duration: r.duration ? String(r.duration) : "",
      viewCount: r.viewCount !== undefined ? String(r.viewCount) : "",
      pageCount: r.pageCount ? String(r.pageCount) : "",
      isPublic: r.isPublic, isFeatured: r.isFeatured, status: r.status,
    });
    setPdfFile(null); setYtStatus("");
    setShowForm(true); setShowPlImport(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => { setShowForm(false); setEditingResource(null); };

  // YouTube metadata auto-fetch (debounced, add-mode video only)
  useEffect(() => {
    if (editingResource || activeTab !== "video" || !showForm) return;
    if (ytDebounceRef.current) clearTimeout(ytDebounceRef.current);
    const url = form.resourceUrl.trim();
    const vid = extractYouTubeId(url);
    if (!vid) { setYtStatus(""); return; }
    ytDebounceRef.current = setTimeout(async () => {
      setYtFetching(true); setYtStatus("Fetching YouTube details...");
      try {
        const res = await apiFetch(`/resources/youtube/metadata?url=${encodeURIComponent(url)}`) as YouTubeMetadataResponse;
        setF({
          title: res.title || form.title,
          description: res.description?.trim() || form.description,
          thumbnailUrl: res.thumbnailUrl || form.thumbnailUrl,
          duration: res.durationSec ? String(res.durationSec) : form.duration,
          viewCount: res.viewCount !== undefined ? String(res.viewCount) : form.viewCount,
        });
        setYtStatus(`✓ Details fetched — ${fmtDuration(res.durationSec) || ""}`);
      } catch { setYtStatus("Could not fetch details automatically."); }
      finally { setYtFetching(false); }
    }, 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.resourceUrl]);

  // ── Submit (add or edit) ───────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);

      if (editingResource) {
        // Edit: always PUT JSON (no file upload on edit)
        const payload: Record<string, unknown> = {
          title: form.title, description: form.description,
          category: form.category, subject: form.subject,
          classLevel: form.classLevel, batch: form.batch || undefined,
          tags, isPublic: form.isPublic, isFeatured: form.isFeatured,
          status: form.status,
        };
        if (editingResource.type === "video") {
          payload.resourceUrl = form.resourceUrl;
          if (form.thumbnailUrl) payload.thumbnailUrl = form.thumbnailUrl;
          if (form.duration) payload.duration = parseInt(form.duration, 10);
          if (form.viewCount) payload.viewCount = parseInt(form.viewCount, 10);
        }
        if (editingResource.type === "pdf") {
          if (form.pageCount) payload.pageCount = parseInt(form.pageCount, 10);
        }
        await apiFetch(`/resources/${editingResource._id}`, {
          method: "PUT", body: JSON.stringify(payload),
        });
        toast.success("Resource updated successfully");
      } else if (activeTab === "pdf" && pdfFile) {
        const fd = new FormData();
        fd.append("file", pdfFile);
        fd.append("title", form.title); fd.append("description", form.description);
        fd.append("category", form.category); fd.append("subject", form.subject);
        fd.append("classLevel", form.classLevel);
        if (form.batch) fd.append("batch", form.batch);
        fd.append("tags", JSON.stringify(tags));
        if (form.pageCount) fd.append("pageCount", form.pageCount);
        fd.append("isPublic", String(form.isPublic));
        fd.append("isFeatured", String(form.isFeatured));
        await apiFetch("/resources/upload-pdf", { method: "POST", body: fd });
        toast.success("PDF added successfully");
      } else {
        await apiFetch("/resources", {
          method: "POST",
          body: JSON.stringify({
            ...form, type: "video", tags,
            duration: form.duration ? parseInt(form.duration, 10) : undefined,
            viewCount: form.viewCount ? parseInt(form.viewCount, 10) : undefined,
          }),
        });
        toast.success("Video added successfully");
      }

      closeForm(); fetchResources();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save resource");
    } finally { setSubmitting(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/resources/${deleteTarget._id}`, { method: "DELETE" });
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      fetchResources();
    } catch { toast.error("Failed to delete resource"); }
    finally { setDeleting(false); }
  };

  // ── Toggle status ──────────────────────────────────────────────────────────

  const toggleStatus = async (r: StudyResource) => {
    const next = r.status === "published" ? "archived" : "published";
    try {
      await apiFetch(`/resources/${r._id}`, { method: "PUT", body: JSON.stringify({ status: next }) });
      toast.success(`Resource ${next}`);
      fetchResources();
    } catch { toast.error("Failed to update status"); }
  };

  // ── Playlist import ────────────────────────────────────────────────────────

  const resetPl = () => {
    setPlUrl(""); setPlSubject(""); setPlClass(""); setPlCategory("");
    setPlTags(""); setPlBatch(""); setPlPublic(true); setPlPreview(null);
  };

  const handlePlPreview = async () => {
    if (!plUrl.trim()) { toast.error("Paste a playlist URL first"); return; }
    setPlPreviewing(true); setPlPreview(null);
    try {
      const data = await apiFetch("/playlist/preview", {
        method: "POST", body: JSON.stringify({ playlistUrl: plUrl.trim() }),
      }) as PlImportPreview;
      setPlPreview(data);
      if (!plCategory) setPlCategory(data.meta.title);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to fetch playlist"); }
    finally { setPlPreviewing(false); }
  };

  const handlePlImport = async () => {
    if (!plSubject || !plClass || !plCategory.trim()) {
      toast.error("Subject, Class, and Category are required"); return;
    }
    setPlImporting(true);
    try {
      const res = await apiFetch("/playlist/import-resources", {
        method: "POST",
        body: JSON.stringify({
          playlistUrl: plUrl.trim(), subject: plSubject, classLevel: plClass,
          category: plCategory.trim(),
          tags: plTags.split(",").map(t => t.trim()).filter(Boolean),
          batch: plBatch.trim() || undefined, isPublic: plPublic,
        }),
      }) as { imported: number; message: string };
      toast.success(res.message);
      setShowPlImport(false); resetPl(); fetchResources();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Import failed"); }
    finally { setPlImporting(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isEditing = !!editingResource;
  const hasFilters = !!(search || filterSubject || filterClass || filterStatus);

  return (
    <Protected requiredRole="admin">
      <main className="p-4 md:p-6 font-poppins min-h-screen bg-slate-50">
        <DashboardHeader
          title="Study Resources"
          subtitle="Manage videos and study materials for students"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          breadcrumbs={[
            { label: "App Management", href: "/dashboard/admin/app-management" },
            { label: "Resources" },
          ]}
        />

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(["video","pdf"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearch(""); setFilterSubject(""); setFilterClass(""); setFilterStatus(""); setShowForm(false); setShowPlImport(false); }}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? "bg-emerald-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {tab === "video" ? "🎬 Videos" : "📄 Study Materials (PDFs)"}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {activeTab === "video" && (
              <button
                onClick={() => { setShowPlImport(v => { if (!v) { setShowForm(false); resetPl(); } return !v; }); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                Import Playlist
              </button>
            )}
            <button
              onClick={() => { if (showForm && !isEditing) { closeForm(); } else { openAdd(); } }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add {activeTab === "video" ? "Video" : "PDF"}
            </button>
          </div>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-slate-800", bg: "bg-white" },
            { label: "Published", value: stats.published, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Draft / Archived", value: stats.draft, color: "text-amber-700", bg: "bg-amber-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm`}>
              <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* ── Search + Filters ──────────────────────────────────────────────── */}
        <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All Subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All Classes</option>
            {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterSubject(""); setFilterClass(""); setFilterStatus(""); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
              title="Grid view">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
              title="List view">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Playlist Import Panel ─────────────────────────────────────────── */}
        <AnimatePresence>
          {showPlImport && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
              className="mt-4 bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Import from YouTube Playlist</p>
                    <p className="text-xs text-slate-500">All videos will be added as individual study resources</p>
                  </div>
                </div>
                <button onClick={() => { setShowPlImport(false); resetPl(); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex gap-2">
                  <input type="url" value={plUrl} onChange={e => { setPlUrl(e.target.value); setPlPreview(null); }}
                    onKeyDown={e => e.key === "Enter" && handlePlPreview()}
                    placeholder="https://youtube.com/playlist?list=PL..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  <button onClick={handlePlPreview} disabled={plPreviewing || !plUrl.trim()}
                    className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2">
                    {plPreviewing ? <><div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />Fetching...</> : "Preview"}
                  </button>
                </div>

                {plPreview && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
                    {plPreview.meta.thumbnail && (
                      <Image src={plPreview.meta.thumbnail} alt="" width={80} height={56} className="object-cover rounded-lg flex-shrink-0" unoptimized />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{plPreview.meta.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{plPreview.meta.channelName}</p>
                      <p className="text-sm font-medium text-emerald-700 mt-1">{plPreview.totalVideos} videos ready to import</p>
                    </div>
                    <div className="hidden lg:block text-xs text-slate-500 max-w-[200px] space-y-0.5">
                      {plPreview.videos.slice(0, 4).map(v => (
                        <p key={v.videoId} className="truncate">• {v.title}</p>
                      ))}
                      {plPreview.totalVideos > 4 && <p className="text-slate-400">+{plPreview.totalVideos - 4} more</p>}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Subject *</label>
                    <select value={plSubject} onChange={e => setPlSubject(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                      <option value="">Select subject</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Class Level *</label>
                    <select value={plClass} onChange={e => setPlClass(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                      <option value="">Select class</option>
                      {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
                    <input type="text" value={plCategory} onChange={e => setPlCategory(e.target.value)}
                      placeholder="e.g. Mechanics, Algebra"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tags</label>
                    <input type="text" value={plTags} onChange={e => setPlTags(e.target.value)}
                      placeholder="JEE, NEET, NCERT"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Batch (optional)</label>
                    <input type="text" value={plBatch} onChange={e => setPlBatch(e.target.value)}
                      placeholder="e.g. Morning"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={plPublic} onChange={e => setPlPublic(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded" />
                      <span className="text-sm text-slate-700">Public (visible to guests)</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={handlePlImport}
                    disabled={plImporting || !plUrl.trim() || !plSubject || !plClass || !plCategory.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                    {plImporting
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Importing{plPreview ? ` ${plPreview.totalVideos} videos` : ""}...</>
                      : <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Import {plPreview ? `${plPreview.totalVideos} Videos` : "All Videos"}
                        </>}
                  </button>
                  <button onClick={() => { setShowPlImport(false); resetPl(); }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add / Edit Form ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
              className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {isEditing ? `Edit Resource` : `Add New ${activeTab === "video" ? "Video" : "Study Material"}`}
                  </h3>
                  {isEditing && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{editingResource!.title}</p>}
                </div>
                <button onClick={closeForm} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Row 1: Title + Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
                    <input type="text" required value={form.title} onChange={e => setF({ title: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Subject *</label>
                    <select required value={form.subject} onChange={e => setF({ subject: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Select subject</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Category + Class + Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
                    <input type="text" required value={form.category} onChange={e => setF({ category: e.target.value })}
                      placeholder="e.g. Mechanics, Algebra"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Class Level *</label>
                    <select required value={form.classLevel} onChange={e => setF({ classLevel: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Select class</option>
                      {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                    <select value={form.status} onChange={e => setF({ status: e.target.value as FormState["status"] })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Batch + Tags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Batch (optional)</label>
                    <input type="text" value={form.batch} onChange={e => setF({ batch: e.target.value })}
                      placeholder="e.g. Morning, Evening"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                    <input type="text" value={form.tags} onChange={e => setF({ tags: e.target.value })}
                      placeholder="NCERT, JEE, NEET"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setF({ description: e.target.value })} rows={2}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>

                {/* Video-specific */}
                {(activeTab === "video" || editingResource?.type === "video") && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">YouTube URL *</label>
                      <input type="url" required={!isEditing} value={form.resourceUrl} onChange={e => setF({ resourceUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      {ytStatus && <p className={`mt-1 text-xs ${ytStatus.startsWith("✓") ? "text-emerald-600" : "text-slate-500"}`}>{ytFetching ? "Fetching..." : ytStatus}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Duration (seconds)</label>
                        <input type="number" min="0" value={form.duration} onChange={e => setF({ duration: e.target.value })}
                          placeholder="e.g. 600"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">View Count</label>
                        <input type="number" min="0" value={form.viewCount} onChange={e => setF({ viewCount: e.target.value })}
                          placeholder="Auto-filled"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Thumbnail URL</label>
                        <input type="url" value={form.thumbnailUrl} onChange={e => setF({ thumbnailUrl: e.target.value })}
                          placeholder="Custom thumbnail (optional)"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                  </>
                )}

                {/* PDF-specific */}
                {!isEditing && activeTab === "pdf" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">PDF File *</label>
                      <input type="file" required accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                      {pdfFile && <p className="text-xs text-slate-500 mt-1">{pdfFile.name} · {fmtSize(pdfFile.size)}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Page Count (optional)</label>
                      <input type="number" min="1" value={form.pageCount} onChange={e => setF({ pageCount: e.target.value })}
                        placeholder="Number of pages"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                )}

                {isEditing && editingResource?.type === "pdf" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Page Count</label>
                    <input type="number" min="1" value={form.pageCount} onChange={e => setF({ pageCount: e.target.value })}
                      className="w-48 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                )}

                {/* Toggles */}
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isPublic} onChange={e => setF({ isPublic: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-slate-700">Public (visible to guests)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isFeatured} onChange={e => setF({ isFeatured: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-slate-700">Featured ⭐</span>
                  </label>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2 border-t border-slate-100">
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                    {submitting ? <><InlineLoader />Saving...</> : isEditing ? "Save Changes" : "Add Resource"}
                  </button>
                  <button type="button" onClick={closeForm}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Resources ─────────────────────────────────────────────────────── */}
        <div className="mt-4">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Loading resources...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                {activeTab === "video"
                  ? <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                  : <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              </div>
              <p className="text-slate-700 font-medium mb-1">
                {hasFilters ? "No resources match your filters" : `No ${activeTab === "video" ? "videos" : "study materials"} yet`}
              </p>
              <p className="text-slate-400 text-sm">
                {hasFilters ? "Try adjusting your search or filters" : "Add your first resource to get started"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(r => (
                <motion.div key={r._id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  {/* Thumbnail */}
                  <ResourceThumbnail resource={r} className="w-full h-40 rounded-none flex-shrink-0" />

                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 flex-1">{r.title}</h4>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{r.subject}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">Class {r.classLevel}</span>
                      {r.category && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full truncate max-w-[120px]">{r.category}</span>}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      {r.type === "video" && r.duration && <span>⏱ {fmtDuration(r.duration)}</span>}
                      {r.type === "video" && r.viewCount !== undefined && <span>👁 {r.viewCount.toLocaleString()}</span>}
                      {r.type === "pdf" && r.pageCount && <span>📃 {r.pageCount}p</span>}
                      {r.type === "pdf" && r.fileSize && <span>📁 {fmtSize(r.fileSize)}</span>}
                      {r.isFeatured && <span className="text-amber-500">⭐</span>}
                      {r.isPublic && <span className="text-blue-500">🌐</span>}
                    </div>

                    {/* Tags */}
                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {r.tags.slice(0,3).map((t,i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">{t}</span>
                        ))}
                        {r.tags.length > 3 && <span className="text-xs text-slate-400">+{r.tags.length-3}</span>}
                      </div>
                    )}

                    <p className="text-xs text-slate-400 mb-3">{new Date(r.createdAt).toLocaleDateString()}</p>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-3">
                      <a href={r.resourceUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View
                      </a>
                      <button onClick={() => openEdit(r)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Edit">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button onClick={() => toggleStatus(r)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title={r.status === "published" ? "Archive" : "Publish"}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        {r.status === "published" ? "Archive" : "Publish"}
                      </button>
                      <button onClick={() => setDeleteTarget(r)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* List view */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 w-12"></th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600">Title</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 hidden md:table-cell">Subject / Category</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 hidden lg:table-cell">Class</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 hidden lg:table-cell">Info</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => (
                    <motion.tr key={r._id} initial={{ opacity:0 }} animate={{ opacity:1 }}
                      className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <ResourceThumbnail resource={r} className="w-12 h-8 rounded" />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                        {r.isFeatured && <span className="text-xs text-amber-500">⭐ Featured</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-slate-700">{r.subject}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[140px]">{r.category}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">Class {r.classLevel}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                        {r.type === "video" && r.duration && <span>{fmtDuration(r.duration)}</span>}
                        {r.type === "pdf" && r.pageCount && <span>{r.pageCount}p</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <a href={r.resourceUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button onClick={() => openEdit(r)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Edit">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => toggleStatus(r)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title={r.status === "published" ? "Archive" : "Publish"}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteTarget(r)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                Showing {filtered.length} of {resources.length} resources
              </div>
            </div>
          )}
        </div>

        {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => !deleting && setDeleteTarget(null)}>
              <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.95, opacity:0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Delete Resource</h3>
                      <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 mb-5">
                    <p className="font-medium text-slate-900 text-sm line-clamp-2">{deleteTarget.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{deleteTarget.subject} · Class {deleteTarget.classLevel} · {deleteTarget.type}</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm font-medium">
                      Cancel
                    </button>
                    <button onClick={confirmDelete} disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                      {deleting ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Deleting...</> : "Delete Resource"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </Protected>
  );
}
