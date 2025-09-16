"use client";
import React from "react";
import Protected from "../../../components/Protected";

export default function StudentDashboard() {
  return (
    <Protected requiredRole="student">
      <main style={{ padding: 20 }}>
        <h1>Student Dashboard</h1>
        <p>
          Assigned exams, progress and upcoming schedules will be displayed
          here.
        </p>
      </main>
    </Protected>
  );
}
