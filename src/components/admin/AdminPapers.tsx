"use client";
import React from "react";
import dynamic from "next/dynamic";

const QuestionPapers = dynamic(() => import("../teacher/QuestionPapers"), {
  ssr: false,
});

export default function AdminPapers() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2 text-sm">
        Admin view: Showing question papers created by all teachers. You can
        view, rename, generate solutions, download, create exams, and delete any
        paper.
      </div>
      <QuestionPapers />
    </div>
  );
}
