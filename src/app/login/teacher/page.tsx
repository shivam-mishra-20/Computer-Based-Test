"use client";
import React from "react";
import LoginForm from "../../../components/LoginForm";

export default function TeacherLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg font-poppins">
      <div
        className="w-full max-w-md p-6 bg-white rounded-md shadow"
        style={{ border: "1px solid var(--beige-sand)" }}
      >
        <h1 className="text-xl font-semibold text-accent mb-2">
          Teacher Login
        </h1>
        <p className="text-sm text-muted mb-4">
          Enter your teacher credentials to access the dashboard.
        </p>
        <LoginForm role="teacher" />
      </div>
    </main>
  );
}
