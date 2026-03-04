"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { motion } from "framer-motion";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

// Quick Action Card
const QuickAction = ({ 
  title, 
  description, 
  icon, 
  href, 
  color 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  href: string;
  color: string;
}) => (
  <Link href={href}>
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h4 className="font-semibold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500">{description}</p>
    </motion.div>
  </Link>
);

const MetricCard = ({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) => {
  const content = (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-colors">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
};

export default function AppManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{
    users: number | null;
    pendingRegistrations: number | null;
    courses: number | null;
    resources: number | null;
  }>({
    users: null,
    pendingRegistrations: null,
    courses: null,
    resources: null,
  });

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, pending, courses, resourcesVideo, resourcesPdf] = await Promise.all([
        apiFetch("/users") as Promise<unknown>,
        apiFetch("/users/pending") as Promise<unknown>,
        apiFetch("/courses") as Promise<unknown>,
        apiFetch("/resources/admin/all?type=video") as Promise<unknown>,
        apiFetch("/resources/admin/all?type=pdf") as Promise<unknown>,
      ]);

      const usersCount = Array.isArray(users) ? users.length : null;
      const pendingCount = Array.isArray(pending) ? pending.length : null;
      const coursesCount = Array.isArray(courses) ? courses.length : null;
      const resourcesCount =
        (Array.isArray(resourcesVideo) ? resourcesVideo.length : 0) +
        (Array.isArray(resourcesPdf) ? resourcesPdf.length : 0);

      setCounts({
        users: usersCount,
        pendingRegistrations: pendingCount,
        courses: coursesCount,
        resources: Number.isFinite(resourcesCount) ? resourcesCount : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
      setCounts({ users: null, pendingRegistrations: null, courses: null, resources: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const metrics = useMemo(
    () => [
      {
        label: "Total users",
        value:
          loading ? "…" : counts.users === null ? "—" : counts.users.toLocaleString("en-IN"),
        href: "/dashboard/admin/app-management/users",
      },
      {
        label: "Pending registrations",
        value:
          loading
            ? "…"
            : counts.pendingRegistrations === null
              ? "—"
              : counts.pendingRegistrations.toLocaleString("en-IN"),
        href: "/dashboard/admin/app-management/registrations",
      },
      {
        label: "Courses",
        value:
          loading ? "…" : counts.courses === null ? "—" : counts.courses.toLocaleString("en-IN"),
        href: "/dashboard/admin/app-management/courses",
      },
      {
        label: "Resources (videos + PDFs)",
        value:
          loading
            ? "…"
            : counts.resources === null
              ? "—"
              : counts.resources.toLocaleString("en-IN"),
        href: "/dashboard/admin/app-management/resources",
      },
    ],
    [counts, loading]
  );

  const quickActions = [
    {
      title: "Pending Registrations",
      description: "Review & approve users",
      href: "/dashboard/admin/app-management/registrations",
      color: "bg-orange-100",
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "User Management",
      description: "View and manage users",
      href: "/dashboard/admin/app-management/users",
      color: "bg-emerald-100",
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: "Manage Courses",
      description: "Add or edit courses",
      href: "/dashboard/admin/app-management/courses",
      color: "bg-blue-100",
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      title: "Study Resources",
      description: "Videos & study materials",
      href: "/dashboard/admin/app-management/resources",
      color: "bg-violet-100",
      icon: (
        <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: "Manage Batches",
      description: "Create & edit batches",
      href: "/dashboard/admin/app-management/batches",
      color: "bg-teal-100",
      icon: (
        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: "Schedule",
      description: "Manage timetables",
      href: "/dashboard/admin/app-management/schedule",
      color: "bg-amber-100",
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Leaves",
      description: "Manage teacher leaves",
      href: "/dashboard/admin/app-management/leaves",
      color: "bg-indigo-100",
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Holidays",
      description: "Holidays & working days",
      href: "/dashboard/admin/app-management/holidays",
      color: "bg-red-100",
      icon: (
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Firebase Sync",
      description: "Sync with Firebase DB",
      href: "/dashboard/admin/app-management/sync",
      color: "bg-rose-100",
      icon: (
        <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      title: "EPUB Automation",
      description: "Configure automation",
      href: "/dashboard/admin/automation",
      color: "bg-purple-100",
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <Protected requiredRole="admin">
      <main className="p-4 pt-5 lg:pt-6 sm:p-6 lg:p-8 font-poppins min-h-screen">
        <DashboardHeader
          title="App Management"
          subtitle="Manage users, courses, resources, and daily operations"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard/admin" },
            { label: "App Management" },
          ]}
          actions={
            <button
              onClick={loadOverview}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          }
        />

        {error && (
          <div className="mb-6 bg-white rounded-xl border border-rose-200 text-rose-700 p-4">
            <div className="font-semibold">Overview unavailable</div>
            <div className="text-sm text-rose-600 mt-1">{error}</div>
          </div>
        )}

        <section className="mb-8">
          <h3 className="font-semibold text-slate-800 mb-3">At a glance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MetricCard label={m.label} value={m.value} href={m.href} />
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Counts are fetched live from the backend. If the backend is offline or endpoints are restricted, values show as “—”.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <motion.div key={action.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <QuickAction {...action} />
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </Protected>
  );
}
