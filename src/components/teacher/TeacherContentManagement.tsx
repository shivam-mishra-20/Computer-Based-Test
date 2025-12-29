"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";

interface Lecture {
  _id: string;
  title: string;
  description?: string;
  youtubeVideoId: string;
  duration?: number;
  subject: string;
  classLevel: string;
  chapter?: string;
  topic?: string;
  status: "draft" | "published" | "archived";
  order: number;
}

interface ContentHierarchy {
  _id: string;
  subjects: {
    subject: string;
    chapters: {
      chapter: string;
      lectures: Lecture[];
      count: number;
    }[];
    totalLectures: number;
  }[];
  grandTotal: number;
}

export default function TeacherContentManagement() {
  const [hierarchy, setHierarchy] = useState<ContentHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtubeVideoId: "",
    duration: "",
    subject: "",
    classLevel: "",
    chapter: "",
    topic: "",
    status: "draft" as "draft" | "published",
  });
  const [saving, setSaving] = useState(false);

  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await apiFetch("/api/lectures/hierarchy") as ContentHierarchy[];
      setHierarchy(res || []);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
      };

      if (editingLecture) {
        await apiFetch(`/api/lectures/${editingLecture._id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/lectures", { method: "POST", body: JSON.stringify(payload) });
      }

      setShowAddModal(false);
      setEditingLecture(null);
      setFormData({
        title: "",
        description: "",
        youtubeVideoId: "",
        duration: "",
        subject: "",
        classLevel: "",
        chapter: "",
        topic: "",
        status: "draft",
      });
      fetchHierarchy();
    } catch (error) {
      console.error("Error saving lecture:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lecture?")) return;
    try {
      await apiFetch(`/api/lectures/${id}`, { method: "DELETE" });
      fetchHierarchy();
    } catch (error) {
      console.error("Error deleting lecture:", error);
    }
  };

  const handleEdit = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setFormData({
      title: lecture.title,
      description: lecture.description || "",
      youtubeVideoId: lecture.youtubeVideoId,
      duration: lecture.duration?.toString() || "",
      subject: lecture.subject,
      classLevel: lecture.classLevel,
      chapter: lecture.chapter || "",
      topic: lecture.topic || "",
      status: lecture.status === "archived" ? "draft" : lecture.status,
    });
    setShowAddModal(true);
  };

  const toggleStatus = async (lecture: Lecture) => {
    try {
      await apiFetch(`/api/lectures/${lecture._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: lecture.status === "published" ? "draft" : "published" }),
      });
      fetchHierarchy();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with gradient */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 mb-8 shadow-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Content Management
            </h1>
            <p className="text-white/80 mt-1">
              Manage your recorded video lectures
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingLecture(null);
              setFormData({
                title: "",
                description: "",
                youtubeVideoId: "",
                duration: "",
                subject: "",
                classLevel: "",
                chapter: "",
                topic: "",
                status: "draft",
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Lecture
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Classes", value: hierarchy.length, color: "bg-teal" },
          { label: "Total Subjects", value: hierarchy.reduce((acc, h) => acc + h.subjects.length, 0), color: "bg-primary" },
          { label: "Published", value: hierarchy.reduce((acc, h) => acc + h.subjects.reduce((a, s) => a + s.chapters.reduce((c, ch) => c + ch.lectures.filter(l => l.status === "published").length, 0), 0), 0), color: "bg-success" },
          { label: "Drafts", value: hierarchy.reduce((acc, h) => acc + h.subjects.reduce((a, s) => a + s.chapters.reduce((c, ch) => c + ch.lectures.filter(l => l.status === "draft").length, 0), 0), 0), color: "bg-amber" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white font-bold">{stat.value}</span>
              </div>
              <span className="text-gray-600 text-sm">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hierarchical Content */}
      <div className="space-y-4">
        {hierarchy.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300"
          >
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No lectures yet</h3>
            <p className="text-gray-400 mb-4">Start by adding your first video lecture</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-primary font-medium hover:underline"
            >
              + Add your first lecture
            </button>
          </motion.div>
        ) : (
          hierarchy.map((classLevel) => (
            <motion.div
              key={classLevel._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Class Level Header */}
              <button
                onClick={() => setExpandedClass(expandedClass === classLevel._id ? null : classLevel._id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal to-teal-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">{classLevel._id}</h3>
                    <p className="text-sm text-gray-500">
                      {classLevel.subjects.length} subjects · {classLevel.grandTotal} lectures
                    </p>
                  </div>
                </div>
                <motion.svg
                  animate={{ rotate: expandedClass === classLevel._id ? 180 : 0 }}
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {expandedClass === classLevel._id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    {classLevel.subjects.map((subject) => (
                      <div key={subject.subject} className="border-b border-gray-50 last:border-0">
                        {/* Subject Header */}
                        <button
                          onClick={() => setExpandedSubject(
                            expandedSubject === `${classLevel._id}-${subject.subject}` 
                              ? null 
                              : `${classLevel._id}-${subject.subject}`
                          )}
                          className="w-full flex items-center justify-between p-4 pl-8 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                              <span className="text-primary-600 font-semibold text-sm">
                                {subject.subject.charAt(0)}
                              </span>
                            </div>
                            <div className="text-left">
                              <h4 className="font-medium text-gray-700">{subject.subject}</h4>
                              <p className="text-xs text-gray-400">
                                {subject.chapters.length} chapters · {subject.totalLectures} lectures
                              </p>
                            </div>
                          </div>
                          <motion.svg
                            animate={{ rotate: expandedSubject === `${classLevel._id}-${subject.subject}` ? 180 : 0 }}
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </motion.svg>
                        </button>

                        <AnimatePresence>
                          {expandedSubject === `${classLevel._id}-${subject.subject}` && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden bg-gray-50/50"
                            >
                              {subject.chapters.map((chapter) => (
                                <div key={chapter.chapter} className="border-t border-gray-100">
                                  {/* Chapter Header */}
                                  <button
                                    onClick={() => setExpandedChapter(
                                      expandedChapter === `${subject.subject}-${chapter.chapter}`
                                        ? null
                                        : `${subject.subject}-${chapter.chapter}`
                                    )}
                                    className="w-full flex items-center justify-between p-3 pl-12 hover:bg-gray-100"
                                  >
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="text-sm text-gray-600">{chapter.chapter || "General"}</span>
                                      <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                                        {chapter.count}
                                      </span>
                                    </div>
                                    <motion.svg
                                      animate={{ rotate: expandedChapter === `${subject.subject}-${chapter.chapter}` ? 180 : 0 }}
                                      className="w-4 h-4 text-gray-400"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </motion.svg>
                                  </button>

                                  <AnimatePresence>
                                    {expandedChapter === `${subject.subject}-${chapter.chapter}` && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto" }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="p-4 pl-16 space-y-2">
                                          {chapter.lectures.map((lecture) => (
                                            <div
                                              key={lecture._id}
                                              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors group"
                                            >
                                              {/* YouTube Preview */}
                                              <div className="relative w-24 h-14 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                                                <img
                                                  src={`https://img.youtube.com/vi/${lecture.youtubeVideoId}/mqdefault.jpg`}
                                                  alt={lecture.title}
                                                  className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                  </svg>
                                                </div>
                                              </div>
                                              
                                              <div className="flex-1 min-w-0">
                                                <h5 className="font-medium text-gray-800 truncate">{lecture.title}</h5>
                                                <div className="flex items-center gap-2 mt-1">
                                                  {lecture.duration && (
                                                    <span className="text-xs text-gray-400">{lecture.duration} min</span>
                                                  )}
                                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    lecture.status === "published"
                                                      ? "bg-green-100 text-green-700"
                                                      : "bg-amber-100 text-amber-700"
                                                  }`}>
                                                    {lecture.status}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Actions */}
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => toggleStatus(lecture)}
                                                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg"
                                                  title={lecture.status === "published" ? "Unpublish" : "Publish"}
                                                >
                                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={lecture.status === "published" ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                                                  </svg>
                                                </button>
                                                <button
                                                  onClick={() => handleEdit(lecture)}
                                                  className="p-2 text-gray-400 hover:text-teal hover:bg-teal-50 rounded-lg"
                                                >
                                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                  </svg>
                                                </button>
                                                <button
                                                  onClick={() => handleDelete(lecture._id)}
                                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingLecture ? "Edit Lecture" : "Add New Lecture"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Video Preview */}
                {formData.youtubeVideoId && (
                  <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${formData.youtubeVideoId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      YouTube Video ID *
                    </label>
                    <input
                      type="text"
                      value={formData.youtubeVideoId}
                      onChange={(e) => setFormData({ ...formData, youtubeVideoId: e.target.value })}
                      placeholder="e.g., dQw4w9WgXcQ"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">Only the video ID, not the full URL</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class Level *
                    </label>
                    <input
                      type="text"
                      value={formData.classLevel}
                      onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                      placeholder="e.g., Class 10"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Mathematics"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chapter
                    </label>
                    <input
                      type="text"
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                      placeholder="e.g., Trigonometry"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g., Sin, Cos, Tan"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 45"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "draft" | "published" })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl font-medium shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    {saving ? "Saving..." : editingLecture ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
