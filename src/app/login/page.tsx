"use client";
import React from "react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-bg font-poppins">
      <div
        className="w-full max-w-md p-6 bg-white rounded-md shadow"
        style={{ border: "1px solid var(--beige-sand)" }}
      >
        <h1 className="text-xl font-semibold text-accent mb-2">
          Choose Login Type
        </h1>
        <div className="flex gap-3">
          <a
            className="px-4 py-2 rounded-md bg-primary text-white"
            href="/login/student"
          >
            Student
          </a>
          <a
            className="px-4 py-2 rounded-md bg-cta text-white"
            href="/login/teacher"
          >
            Teacher
          </a>
          <a
            className="px-4 py-2 rounded-md border text-accent"
            style={{ borderColor: "var(--beige-sand)" }}
            href="/login/admin"
          >
            Admin
          </a>
        </div>
      </div>
    </main>
  );
}
