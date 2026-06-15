"use client";
import React from "react";
import TeacherReviewDashboard from "../../../../components/teacher/TeacherReviewDashboard";
import Protected from "../../../../components/Protected";

export default function ReviewsPage() {
  return (
    <Protected requiredRole="teacher">
      <main className="p-5">
        <TeacherReviewDashboard />
      </main>
    </Protected>
  );
}
