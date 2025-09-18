"use client";
import React, { useEffect } from "react";
import Protected from "../../../components/Protected";
import { useSearchParams, useRouter } from "next/navigation";
import TeacherDashboardHome from "@/components/teacher/TeacherDashboardHome";
import TeacherQuestionBank from "@/components/teacher/TeacherQuestionBank";
import TeacherExams from "@/components/teacher/TeacherExams";
import TeacherAITools from "@/components/teacher/TeacherAITools";
import TeacherAnalytics from "@/components/teacher/TeacherAnalytics";
import TeacherReports from "@/components/teacher/TeacherReports";

const TABS = [
  "dashboard",
  "bank",
  "exams",
  "ai",
  "analytics",
  "reports",
] as const;
type Tab = (typeof TABS)[number];

function TabNav({ current }: { current: Tab }) {
  const router = useRouter();
  function go(tab: Tab) {
    router.push(`/dashboard/teacher?tab=${tab}`);
  }
  return (
    <div className="mt-6 flex flex-wrap gap-2 items-center w-full">
      <div className="flex flex-wrap gap-2">
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
            {t === "bank" ? "Question Bank" : t === "ai" ? "AI Tools" : t}
          </button>
        ))}
      </div>
      <button
        onClick={() => router.push("/dashboard/teacher/reviews")}
        className="ml-auto px-3 py-1.5 rounded-md text-sm font-medium border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        title="Review & publish student attempts"
      >
        Pending Reviews
      </button>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const search = useSearchParams();
  const router = useRouter();
  // Ensure a default tab is always present in URL
  useEffect(() => {
    if (!search.get("tab")) {
      router.replace("/dashboard/teacher?tab=dashboard");
    }
  }, [search, router]);
  const tabParam = (search.get("tab") || "dashboard") as Tab;
  const tab: Tab = TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "dashboard";

  let content: React.ReactNode = null;
  switch (tab) {
    case "dashboard":
      content = <TeacherDashboardHome />;
      break;
    case "bank":
      content = <TeacherQuestionBank />;
      break;
    case "exams":
      content = <TeacherExams />;
      break;
    case "ai":
      content = <TeacherAITools />;
      break;
    case "analytics":
      content = <TeacherAnalytics />;
      break;
    case "reports":
      content = <TeacherReports />;
      break;
  }

  return (
    <Protected requiredRole="teacher">
      <main className="min-h-screen p-6 bg-bg font-poppins">
        <h1 className="text-2xl font-semibold text-accent">Teacher Panel</h1>
        <p className="mt-1 text-sm text-muted">
          Manage questions, exams and AI generation.
        </p>
        <TabNav current={tab} />
        <div className="mt-6">{content}</div>
      </main>
    </Protected>
  );
}
