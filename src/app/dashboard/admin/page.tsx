"use client";
import React from "react";
import Protected from "../../../components/Protected";
import { useSearchParams, useRouter } from "next/navigation";
import AdminDashboardHome from "@/components/admin/AdminDashboardHome";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminExams from "@/components/admin/AdminExams";
import AdminReports from "@/components/admin/AdminReports";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

const TABS = ["dashboard", "users", "exams", "reports", "analytics"] as const;
type Tab = (typeof TABS)[number];

function TabNav({ current }: { current: Tab }) {
  const router = useRouter();
  function go(tab: Tab) {
    router.push(`/dashboard/admin?tab=${tab}`);
  }
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => go(t)}
          className={`px-3 py-1.5 rounded-md text-sm capitalize border transition-colors ${
            t === current
              ? "bg-primary text-white border-primary"
              : "bg-white hover:bg-gray-50 border-gray-200"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const search = useSearchParams();
  const tabParam = (search.get("tab") || "dashboard") as Tab;
  const tab: Tab = TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "dashboard";

  let content: React.ReactNode = null;
  switch (tab) {
    case "dashboard":
      content = <AdminDashboardHome />;
      break;
    case "users":
      content = <AdminUsers />;
      break;
    case "exams":
      content = <AdminExams />;
      break;
    case "reports":
      content = <AdminReports />;
      break;
    case "analytics":
      content = <AdminAnalytics />;
      break;
  }

  return (
    <Protected requiredRole="admin">
      <main className="min-h-screen p-6 bg-bg font-poppins">
        <h1 className="text-2xl font-semibold text-accent">Admin Panel</h1>
        <p className="mt-1 text-sm text-muted">
          Manage platform entities and view insights.
        </p>
        <TabNav current={tab} />
        <div className="mt-6">{content}</div>
      </main>
    </Protected>
  );
}
