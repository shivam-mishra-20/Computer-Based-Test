"use client";
import React from "react";
import TeacherReviewPanel from "../../../../components/teacher/TeacherReviewPanel";
import Protected from "../../../../components/Protected";

export default function ReviewsPage() {
  return (
    <Protected requiredRole="teacher">
      <main className="p-5">
        <TeacherReviewPanel />
      </main>
    </Protected>
  );
}
