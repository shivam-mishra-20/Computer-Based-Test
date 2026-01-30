"use client";
import React, { useEffect, useState, useCallback } from "react";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { InlineLoader } from "@/components/ElegantLoader";

interface StudyResource {
  _id: string;
  title: string;
  description: string;
  type: 'video' | 'pdf';
  resourceUrl: string;
  thumbnailUrl?: string;
  category: string;
  subject: string;
  classLevel: string;
  batch?: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  isPublic: boolean;
  isFeatured: boolean;
  duration?: number;
  fileSize?: number;
  pageCount?: number;
  viewCount?: number;
  downloadCount?: number;
  uploadedBy: { name: string; email: string };
  createdAt: string;
}

export default function ResourcesManagementPage() {
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'pdf'>('video');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'video' as 'video' | 'pdf',
    resourceUrl: '',
    thumbnailUrl: '',
    category: '',
    subject: '',
    classLevel: '',
    batch: '',
    tags: '',
    pageCount: '',
    duration: '',
    isPublic: true,
    isFeatured: false
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/resources/admin/all?type=${activeTab}`) as StudyResource[];
      setResources(data);
    } catch (error) {
      console.error("Failed to fetch resources", error);
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUploadProgress(0);

    try {
      if (formData.type === 'pdf' && pdfFile) {
        // Upload PDF with form data
        const formDataObj = new FormData();
        formDataObj.append('file', pdfFile);
        formDataObj.append('title', formData.title);
        formDataObj.append('description', formData.description);
        formDataObj.append('category', formData.category);
        formDataObj.append('subject', formData.subject);
        formDataObj.append('classLevel', formData.classLevel);
        if (formData.batch) formDataObj.append('batch', formData.batch);
        if (formData.tags) formDataObj.append('tags', JSON.stringify(formData.tags.split(',').map(t => t.trim())));
        if (formData.pageCount) formDataObj.append('pageCount', formData.pageCount);
        formDataObj.append('isPublic', String(formData.isPublic));
        formDataObj.append('isFeatured', String(formData.isFeatured));

        await apiFetch('/resources/upload-pdf', {
          method: 'POST',
          body: formDataObj
        });
      } else {
        // Create video resource
        const payload = {
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          duration: formData.duration ? parseInt(formData.duration) : undefined
        };

        await apiFetch('/resources', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      toast.success(`${formData.type === 'video' ? 'Video' : 'PDF'} added successfully`);
      setShowForm(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error("Failed to add resource", error);
      toast.error(error instanceof Error ? error.message : "Failed to add resource");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: activeTab,
      resourceUrl: '',
      thumbnailUrl: '',
      category: '',
      subject: '',
      classLevel: '',
      batch: '',
      tags: '',
      pageCount: '',
      duration: '',
      isPublic: true,
      isFeatured: false
    });
    setPdfFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      await apiFetch(`/resources/${id}`, { method: 'DELETE' });
      toast.success('Resource deleted successfully');
      fetchResources();
    } catch (error) {
      console.error("Failed to delete resource", error);
      toast.error("Failed to delete resource");
    }
  };

  const handleToggleStatus = async (resource: StudyResource) => {
    try {
      const newStatus = resource.status === 'published' ? 'archived' : 'published';
      await apiFetch(`/resources/${resource._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(`Resource ${newStatus}`);
      fetchResources();
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Protected requiredRole="admin">
      <main className="p-6 font-poppins">
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

        {/* Tabs */}
        <div className="mt-6 flex gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit">
          <button
            onClick={() => { setActiveTab('video'); setFormData({ ...formData, type: 'video' }); }}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'video'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => { setActiveTab('pdf'); setFormData({ ...formData, type: 'pdf' }); }}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'pdf'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Study Materials (PDFs)
          </button>
        </div>

        {/* Action Bar */}
        <div className="mt-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-600">
            {resources.length} {activeTab === 'video' ? 'videos' : 'study materials'}
          </div>
          <button
            onClick={() => { setShowForm(!showForm); resetForm(); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add {activeTab === 'video' ? 'Video' : 'PDF'}
          </button>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Add New {activeTab === 'video' ? 'Video' : 'Study Material'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Mathematics, Physics"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Algebra, Mechanics"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class Level *</label>
                    <select
                      required
                      value={formData.classLevel}
                      onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Class</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Batch (Optional)</label>
                    <input
                      type="text"
                      value={formData.batch}
                      onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                      placeholder="e.g., Morning, Evening"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., NCERT, JEE, NEET"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {activeTab === 'video' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">YouTube URL *</label>
                      <input
                        type="url"
                        required
                        value={formData.resourceUrl}
                        onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Duration (seconds)</label>
                        <input
                          type="number"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          placeholder="e.g., 600 for 10 minutes"
                          className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Thumbnail URL (Optional)</label>
                        <input
                          type="url"
                          value={formData.thumbnailUrl}
                          onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                          placeholder="Custom thumbnail URL"
                          className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">PDF File *</label>
                      <input
                        type="file"
                        required
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {pdfFile && (
                        <p className="mt-1 text-sm text-slate-600">
                          Selected: {pdfFile.name} ({formatFileSize(pdfFile.size)})
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Page Count (Optional)</label>
                      <input
                        type="number"
                        value={formData.pageCount}
                        onChange={(e) => setFormData({ ...formData, pageCount: e.target.value })}
                        placeholder="Number of pages"
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Public (Visible to guests)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Featured</span>
                  </label>
                </div>

                {uploadProgress > 0 && (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? <InlineLoader /> : null}
                    {submitting ? 'Uploading...' : 'Add Resource'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resources List */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading resources...</div>
          ) : resources.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No {activeTab === 'video' ? 'videos' : 'study materials'} found. Add one to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {resources.map((resource) => (
                <motion.div
                  key={resource._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900">{resource.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          resource.status === 'published' ? 'bg-green-100 text-green-700' :
                          resource.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {resource.status}
                        </span>
                        {resource.isFeatured && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                            ⭐ Featured
                          </span>
                        )}
                        {resource.isPublic && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            🌐 Public
                          </span>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-slate-600 mb-3">{resource.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>📚 {resource.subject}</span>
                        <span>🏷️ {resource.category}</span>
                        <span>🎓 Class {resource.classLevel}</span>
                        {resource.batch && <span>👥 {resource.batch}</span>}
                        {resource.type === 'video' && resource.duration && (
                          <span>⏱️ {formatDuration(resource.duration)}</span>
                        )}
                        {resource.type === 'video' && resource.viewCount !== undefined && (
                          <span>👁️ {resource.viewCount} views</span>
                        )}
                        {resource.type === 'pdf' && resource.fileSize && (
                          <span>📄 {formatFileSize(resource.fileSize)}</span>
                        )}
                        {resource.type === 'pdf' && resource.pageCount && (
                          <span>📃 {resource.pageCount} pages</span>
                        )}
                        {resource.type === 'pdf' && resource.downloadCount !== undefined && (
                          <span>⬇️ {resource.downloadCount} downloads</span>
                        )}
                      </div>
                      {resource.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {resource.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-500">
                        Uploaded by {resource.uploadedBy.name} • {new Date(resource.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <a
                        href={resource.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View Resource"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                      <button
                        onClick={() => handleToggleStatus(resource)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title={resource.status === 'published' ? 'Archive' : 'Publish'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(resource._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}
