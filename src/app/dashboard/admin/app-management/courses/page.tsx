"use client";
import React, { useEffect, useState } from "react";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";

interface Course {
  _id: string;
  title: string;
  subject: string;
  classLevel: string;
  status: string;
  lectureCount: number;
}

export default function CoursesListPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await apiFetch('/courses') as Course[];
      setCourses(data);
    } catch (error) {
      console.error("Failed to fetch courses", error);
    } finally {
      setLoading(false);
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

        <div className="mt-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex gap-4">
                 <input type="text" placeholder="Search courses..." className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                 <select className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                     <option value="">All Classes</option>
                     <option value="12">Class 12</option>
                     <option value="11">Class 11</option>
                 </select>
             </div>
             <button 
                onClick={() => router.push("/dashboard/admin/app-management/courses/new")}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                 </svg>
                 New Course
             </button>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Loading courses...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Title</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Subject</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Class</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Lectures</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No courses found. Create one to get started.</td>
                    </tr>
                ) : (
                    courses.map((course) => (
                    <motion.tr 
                        key={course._id} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50 transition"
                    >
                        <td className="px-6 py-4 font-medium text-slate-900">{course.title}</td>
                        <td className="px-6 py-4 text-slate-600">{course.subject}</td>
                        <td className="px-6 py-4 text-slate-600">{course.classLevel}</td>
                        <td className="px-6 py-4 text-slate-600">{course.lectureCount || 0}</td>
                        <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            course.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {course.status}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                        <button 
                            onClick={() => router.push(`/dashboard/admin/app-management/courses/${course._id}`)}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                        >
                            Edit
                        </button>
                        </td>
                    </motion.tr>
                    ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </Protected>
  );
}
