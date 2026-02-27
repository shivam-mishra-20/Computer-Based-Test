"use client";
import React, { useEffect, useState, useCallback } from "react";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Course {
  _id: string;
  title: string;
  subject: string;
  classLevel: string;
  status: string;
  lectureCount: number;
  isFree?: boolean;
  syllabus?: { title: string; lectures: unknown[] }[];
}

export default function CoursesListPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmCourse, setConfirmCourse] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params — backend now returns ALL courses for admins
      const params = new URLSearchParams();
      if (filterClass) params.set("classLevel", filterClass);
      if (filterSubject) params.set("subject", filterSubject);
      if (filterStatus) params.set("status", filterStatus);
      const qs = params.toString();
      const data = await apiFetch(`/courses${qs ? `?${qs}` : ""}`) as Course[];
      setCourses(data);
    } catch (error) {
      console.error("Failed to fetch courses", error);
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterSubject, filterStatus]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filtered = courses.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  );

  const hasActiveFilters = !!(search || filterClass || filterSubject || filterStatus);

  const clearFilters = () => {
    setSearch("");
    setFilterClass("");
    setFilterSubject("");
    setFilterStatus("");
  };

  const moduleCount = (c: Course) => c.syllabus?.length ?? 0;

  const deleteCourse = async (course: Course) => {
    setDeletingId(course._id);
    try {
      await apiFetch(`/courses/${course._id}`, { method: "DELETE" });
      setCourses(prev => prev.filter(c => c._id !== course._id));
      toast.success(`"${course.title}" deleted successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete course");
    } finally {
      setDeletingId(null);
      setConfirmCourse(null);
    }
  };

  return (
    <Protected requiredRole="admin">
      <main className="p-6 font-poppins">
        <DashboardHeader
          title="Course Management"
          subtitle="Create and manage your courses"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          breadcrumbs={[
            { label: "App Management", href: "/dashboard/admin/app-management" },
            { label: "Courses" },
          ]}
        />

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] flex-1"
          />
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Classes</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
          </select>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Biology">Biology</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
          <button
            onClick={() => router.push("/dashboard/admin/app-management/courses/new")}
            className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Course
          </button>
        </div>

        {/* Stats */}
        <div className="mt-3 flex gap-4 text-sm text-slate-500 flex-wrap items-center">
          <span>Total: <strong className="text-slate-800">{courses.length}</strong></span>
          <span>Published: <strong className="text-emerald-700">{courses.filter(c => c.status === 'published').length}</strong></span>
          <span>Draft: <strong className="text-amber-600">{courses.filter(c => c.status === 'draft').length}</strong></span>
          {search && filtered.length !== courses.length && (
            <span className="text-slate-400">Showing: <strong className="text-slate-600">{filtered.length}</strong></span>
          )}
          {(filterClass || filterSubject || filterStatus) && (
            <span className="text-xs text-slate-400 italic">
              Filtered by:{" "}
              {[filterClass && `Class ${filterClass}`, filterSubject, filterStatus].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>

        <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mb-2" />
              <p>Loading courses...</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Title</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Subject</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Class</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Modules</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Lectures</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      {courses.length === 0
                        ? "No courses found. Create one to get started."
                        : "No courses match your filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((course) => (
                    <motion.tr
                      key={course._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{course.title}</div>
                        {course.isFree && (
                          <span className="text-xs text-blue-600 font-medium">Free</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{course.subject}</td>
                      <td className="px-6 py-4 text-slate-600">Class {course.classLevel}</td>
                      <td className="px-6 py-4 text-slate-600">{moduleCount(course)}</td>
                      <td className="px-6 py-4 text-slate-600">{course.lectureCount || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.status === 'published'
                            ? 'bg-emerald-100 text-emerald-700'
                            : course.status === 'archived'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => router.push(`/dashboard/admin/app-management/courses/${course._id}`)}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmCourse(course)}
                            disabled={deletingId === course._id}
                            className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-40"
                          >
                            {deletingId === course._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmCourse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setConfirmCourse(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-md"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Delete Course</h3>
                      <p className="text-sm text-slate-500">This action cannot be undone</p>
                    </div>
                  </div>
                  <p className="text-slate-700 mb-2">
                    Are you sure you want to permanently delete:
                  </p>
                  <div className="bg-slate-50 rounded-lg px-4 py-3 mb-5">
                    <p className="font-semibold text-slate-900">{confirmCourse.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {confirmCourse.subject} · Class {confirmCourse.classLevel} ·{" "}
                      {moduleCount(confirmCourse)} modules · {confirmCourse.lectureCount ?? 0} lectures
                    </p>
                  </div>
                  <p className="text-sm text-red-600 mb-6">
                    All modules, lectures, and enrolled student progress will be permanently removed.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setConfirmCourse(null)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteCourse(confirmCourse)}
                      disabled={deletingId === confirmCourse._id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {deletingId === confirmCourse._id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Course"
                      )}
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
