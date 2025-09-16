"use client";
import React from "react";
import { useParams } from "next/navigation";

export default function ExamPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <main style={{ padding: 20 }}>
      <h1>Exam: {id}</h1>
      <p>Exam details, sections, start button, and assignments go here.</p>
    </main>
  );
}
