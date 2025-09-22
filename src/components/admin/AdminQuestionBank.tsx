"use client";
import React from "react";
import dynamic from "next/dynamic";

// Reuse teacher's Question Bank for identical behavior
const TeacherQuestionBank = dynamic(
  () => import("../teacher/TeacherQuestionBank"),
  { ssr: false }
);

export default function AdminQuestionBank() {
  return <TeacherQuestionBank />;
}
