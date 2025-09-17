"use client";
import React, { useState } from "react";
import Protected from "../../../components/Protected";
import dynamic from "next/dynamic";

// Lazy load heavier components
const AssignedExams = dynamic(
  () => import("../../../components/student/StudentAssignedExams"),
  { ssr: false }
);
const ProgressTabReal = dynamic(
  () => import("../../../components/student/StudentProgress"),
  { ssr: false }
);
const ResultsTabReal = dynamic(
  () => import("@/components/student/StudentResults"),
  {
    ssr: false,
    loading: () => (
      <div className="text-xs text-gray-500">Loading results...</div>
    ),
  }
);
// Temporary placeholder for Practice
function PracticeTab() {
  return (
    <div className="text-sm text-gray-600">Practice mode coming soon.</div>
  );
}

type TabKey = "exams" | "progress" | "results" | "practice";

export default function StudentDashboard() {
  const [tab, setTab] = useState<TabKey>("exams");

  function renderTab() {
    switch (tab) {
      case "exams":
        return <AssignedExams />;
      case "progress":
        return <ProgressTabReal />;
      case "results":
        return <ResultsTabReal />;
      case "practice":
        return <PracticeTab />;
      default:
        return null;
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "exams", label: "Exams" },
    { key: "progress", label: "Progress" },
    { key: "results", label: "Results" },
    { key: "practice", label: "Practice" },
  ];

  return (
    <Protected requiredRole="student">
      <main className="p-5 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-semibold">Student Dashboard</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded text-sm border ${
                tab === t.key
                  ? "bg-primary text-white border-primary"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div>{renderTab()}</div>
      </main>
    </Protected>
  );
}
