"use client";
import React from "react";
import Protected from "../../../components/Protected";

export default function TeacherDashboard() {
  return (
    <Protected requiredRole="teacher">
      <main style={{ padding: 20 }}>
        <h1>Teacher Dashboard</h1>
        <p>
          Question bank, exam management, AI tools, and reports will appear
          here.
        </p>
      </main>
    </Protected>
  );
}
