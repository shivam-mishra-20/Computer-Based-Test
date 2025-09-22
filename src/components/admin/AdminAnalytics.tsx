"use client";
import React from "react";
import dynamic from "next/dynamic";

// Reuse the teacher analytics view for identical behavior
const TeacherAnalytics = dynamic(() => import("../teacher/TeacherAnalytics"), {
  ssr: false,
});

export default function AdminAnalytics() {
  return <TeacherAnalytics />;
}
