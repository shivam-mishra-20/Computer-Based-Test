"use client";
import React, { useEffect, useState, useCallback } from "react";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface YoutubeMeta {
  durationSec: number;
  thumbnail: string;
  title: string;
  fetchedAt: string;
}

interface Lecture {
  title: string;
  videoUrl?: string;
  youtubeVideoId?: string;
  duration?: number;
  order: number;
  youtubeMeta?: YoutubeMeta;
}

interface Module {
  title: string;
  description?: string;
  lectures: Lecture[];
}

interface Course {
  _id: string;
  title: string;
  description: string;
  subject: string;
  classLevel: string;
  batch?: string;
  status: string;
  isFree: boolean;
  syllabus: Module[];
  lectureCount: number;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Module modal state
  const [moduleModal, setModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [editingModuleIndex, setEditingModuleIndex] = useState<number | null>(null);
  
  // Lecture modal state
  const [lectureModal, setLectureModal] = useState(false);
  const [lectureTitle, setLectureTitle] = useState("");
  const [lectureUrl, setLectureUrl] = useState("");
  const [targetModuleIndex, setTargetModuleIndex] = useState<number | null>(null);
  const [editingLectureIndex, setEditingLectureIndex] = useState<number | null>(null);

  // Course edit modal state
  const [courseEditModal, setCourseEditModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    subject: "",
    classLevel: "",
    isFree: false,
  });

  const fetchCourse = useCallback(async () => {
    try {
      const data = await apiFetch(`/courses/${courseId}`) as Course;
      setCourse(data);
    } catch (error) {
      console.error("Failed to fetch course", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId && courseId !== "new") {
      fetchCourse();
    } else {
      setLoading(false);
    }
  }, [courseId, fetchCourse]);

  const saveCourse = async (updates: Partial<Course>) => {
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      await fetchCourse();
    } catch (error) {
      console.error("Failed to save course", error);
    } finally {
      setSaving(false);
    }
  };

  // Delete course
  const deleteCourse = async () => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}`, { method: "DELETE" });
      router.push("/dashboard/admin/app-management/courses");
    } catch (error) {
      console.error("Failed to delete course", error);
      alert("Failed to delete course");
    } finally {
      setSaving(false);
    }
  };

  // Open edit course modal
  const openEditCourse = () => {
    if (course) {
      setCourseForm({
        title: course.title,
        description: course.description,
        subject: course.subject,
        classLevel: course.classLevel,
        isFree: course.isFree,
      });
      setCourseEditModal(true);
    }
  };

  // Save course edits
  const saveEditCourse = async () => {
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify(courseForm),
      });
      await fetchCourse();
      setCourseEditModal(false);
    } catch (error) {
      console.error("Failed to update course", error);
    } finally {
      setSaving(false);
    }
  };

  // Module CRUD
  const addModule = async () => {
    if (!moduleTitle.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}/modules`, {
        method: "POST",
        body: JSON.stringify({ title: moduleTitle, description: moduleDesc }),
      });
      await fetchCourse();
      resetModuleModal();
    } catch (error) {
      console.error("Failed to add module", error);
    } finally {
      setSaving(false);
    }
  };

  const updateModule = async () => {
    if (editingModuleIndex === null) return;
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}/modules/${editingModuleIndex}`, {
        method: "PUT",
        body: JSON.stringify({ title: moduleTitle, description: moduleDesc }),
      });
      await fetchCourse();
      resetModuleModal();
    } catch (error) {
      console.error("Failed to update module", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (index: number) => {
    if (!confirm("Delete this module and all its lectures?")) return;
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}/modules/${index}`, {
        method: "DELETE",
      });
      await fetchCourse();
    } catch (error) {
      console.error("Failed to delete module", error);
    } finally {
      setSaving(false);
    }
  };

  // Lecture CRUD
  const addLecture = async () => {
    if (!lectureTitle.trim() || targetModuleIndex === null) return;
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}/modules/${targetModuleIndex}/lectures`, {
        method: "POST",
        body: JSON.stringify({ title: lectureTitle, videoUrl: lectureUrl }),
      });
      await fetchCourse();
      resetLectureModal();
    } catch (error) {
      console.error("Failed to add lecture", error);
    } finally {
      setSaving(false);
    }
  };

  const updateLecture = async () => {
    if (targetModuleIndex === null || editingLectureIndex === null) return;
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}/modules/${targetModuleIndex}/lectures/${editingLectureIndex}`, {
        method: "PUT",
        body: JSON.stringify({ title: lectureTitle, videoUrl: lectureUrl }),
      });
      await fetchCourse();
      resetLectureModal();
    } catch (error) {
      console.error("Failed to update lecture", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteLecture = async (moduleIndex: number, lectureIndex: number) => {
    if (!confirm("Delete this lecture?")) return;
    setSaving(true);
    try {
      await apiFetch(`/courses/${courseId}/modules/${moduleIndex}/lectures/${lectureIndex}`, {
        method: "DELETE",
      });
      await fetchCourse();
    } catch (error) {
      console.error("Failed to delete lecture", error);
    } finally {
      setSaving(false);
    }
  };

  const resetModuleModal = () => {
    setModuleModal(false);
    setModuleTitle("");
    setModuleDesc("");
    setEditingModuleIndex(null);
  };

  const resetLectureModal = () => {
    setLectureModal(false);
    setLectureTitle("");
    setLectureUrl("");
    setTargetModuleIndex(null);
    setEditingLectureIndex(null);
  };

  const openEditModule = (index: number, mod: Module) => {
    setEditingModuleIndex(index);
    setModuleTitle(mod.title);
    setModuleDesc(mod.description || "");
    setModuleModal(true);
  };

  const openAddLecture = (moduleIndex: number) => {
    setTargetModuleIndex(moduleIndex);
    setEditingLectureIndex(null);
    setLectureTitle("");
    setLectureUrl("");
    setLectureModal(true);
  };

  const openEditLecture = (moduleIndex: number, lectureIndex: number, lec: Lecture) => {
    setTargetModuleIndex(moduleIndex);
    setEditingLectureIndex(lectureIndex);
    setLectureTitle(lec.title);
    setLectureUrl(lec.videoUrl || lec.youtubeVideoId || "");
    setLectureModal(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <Protected requiredRole="admin">
        <main className="p-6 font-poppins">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        </main>
      </Protected>
    );
  }

  if (!course && courseId !== "new") {
    return (
      <Protected requiredRole="admin">
        <main className="p-6 font-poppins">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-slate-800">Course not found</h2>
            <button onClick={() => router.back()} className="mt-4 text-emerald-600 hover:text-emerald-700">
              ← Go back
            </button>
          </div>
        </main>
      </Protected>
    );
  }

  return (
    <Protected requiredRole="admin">
      <main className="p-6 font-poppins min-h-screen">
        <DashboardHeader
          title={course?.title || "New Course"}
          subtitle={course ? `${course.subject} • Class ${course.classLevel}` : "Create a new course"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          breadcrumbs={[
            { label: "App Management", href: "/dashboard/admin/app-management" },
            { label: "Courses", href: "/dashboard/admin/app-management/courses" },
            { label: course?.title || "New" },
          ]}
        />

        {/* Course Info Card */}
        {course && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">{course.title}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    course.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {course.status}
                  </span>
                  {course.isFree && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Free
                    </span>
                  )}
                </div>
                <p className="text-slate-600 mt-2 max-w-2xl">{course.description}</p>
                <div className="flex items-center gap-6 mt-4 text-sm text-slate-500">
                  <span>📚 {course.syllabus?.length || 0} Modules</span>
                  <span>🎬 {course.lectureCount || 0} Lectures</span>
                  <span>📖 {course.subject}</span>
                  <span>🎓 Class {course.classLevel}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openEditCourse}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  Edit Details
                </button>
                <button
                  onClick={() => saveCourse({ status: course.status === 'published' ? 'draft' : 'published' })}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    course.status === 'published' 
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {course.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={deleteCourse}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Modules Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Modules & Lectures</h3>
            <button
              onClick={() => { setEditingModuleIndex(null); setModuleTitle(""); setModuleDesc(""); setModuleModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Module
            </button>
          </div>

          <div className="space-y-4">
            {course?.syllabus?.map((mod, modIndex) => (
              <motion.div
                key={modIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: modIndex * 0.05 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800">Module {modIndex + 1}: {mod.title}</h4>
                    {mod.description && <p className="text-sm text-slate-500 mt-0.5">{mod.description}</p>}
                    <span className="text-xs text-slate-400 mt-1">{mod.lectures.length} lectures</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddLecture(modIndex)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Add Lecture"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModule(modIndex, mod)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Module"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteModule(modIndex)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Module"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Lectures List */}
                <div className="divide-y divide-slate-100">
                  {mod.lectures.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No lectures yet. Click + to add one.
                    </div>
                  ) : (
                    mod.lectures.map((lec, lecIndex) => (
                      <div key={lecIndex} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                        {/* Thumbnail or placeholder */}
                        <div className="w-24 h-14 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                          {lec.youtubeMeta?.thumbnail ? (
                            <Image
                              src={lec.youtubeMeta.thumbnail}
                              alt=""
                              fill
                              sizes="100px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Lecture Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">{modIndex + 1}.{lecIndex + 1}</span>
                            <h5 className="font-medium text-slate-800 truncate">{lec.title}</h5>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {lec.youtubeMeta?.durationSec && (
                              <span>⏱ {formatDuration(lec.youtubeMeta.durationSec)}</span>
                            )}
                            {lec.youtubeVideoId && (
                              <span className="text-red-500">▶ YouTube</span>
                            )}
                            {lec.youtubeMeta?.fetchedAt && (
                              <span className="text-emerald-500">✓ Metadata synced</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditLecture(modIndex, lecIndex, lec)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteLecture(modIndex, lecIndex)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ))}

            {(!course?.syllabus || course.syllabus.length === 0) && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h4 className="mt-4 text-slate-600 font-medium">No modules yet</h4>
                <p className="text-slate-400 text-sm mt-1">Start by adding your first module</p>
              </div>
            )}
          </div>
        </div>

        {/* Module Modal */}
        <AnimatePresence>
          {moduleModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={resetModuleModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-md"
              >
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {editingModuleIndex !== null ? "Edit Module" : "Add Module"}
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g. Introduction to Physics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                    <textarea
                      value={moduleDesc}
                      onChange={(e) => setModuleDesc(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      rows={3}
                      placeholder="Brief description of this module..."
                    />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                  <button
                    onClick={resetModuleModal}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingModuleIndex !== null ? updateModule : addModule}
                    disabled={saving || !moduleTitle.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingModuleIndex !== null ? "Update" : "Add"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lecture Modal */}
        <AnimatePresence>
          {lectureModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={resetLectureModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-md"
              >
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {editingLectureIndex !== null ? "Edit Lecture" : "Add Lecture"}
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g. Newton's Laws of Motion"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">YouTube URL or Video ID</label>
                    <input
                      type="text"
                      value={lectureUrl}
                      onChange={(e) => setLectureUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g. https://youtube.com/watch?v=... or dQw4w9WgXcQ"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Video metadata will be fetched automatically
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                  <button
                    onClick={resetLectureModal}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingLectureIndex !== null ? updateLecture : addLecture}
                    disabled={saving || !lectureTitle.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingLectureIndex !== null ? "Update" : "Add"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Course Edit Modal */}
        <AnimatePresence>
          {courseEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setCourseEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-lg"
              >
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800">Edit Course Details</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={courseForm.description}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <select
                        value={courseForm.subject}
                        onChange={(e) => setCourseForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Biology">Biology</option>
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Class Level</label>
                      <select
                        value={courseForm.classLevel}
                        onChange={(e) => setCourseForm(prev => ({ ...prev, classLevel: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="9">Class 9</option>
                        <option value="10">Class 10</option>
                        <option value="11">Class 11</option>
                        <option value="12">Class 12</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="editIsFree"
                      checked={courseForm.isFree}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, isFree: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="editIsFree" className="text-sm text-slate-700">
                      This is a free course
                    </label>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                  <button
                    onClick={() => setCourseEditModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditCourse}
                    disabled={saving || !courseForm.title.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </Protected>
  );
}
