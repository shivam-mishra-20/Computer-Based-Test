"use client";
import React from "react";
import ExamWaitingRoom from "../../../../components/student/ExamWaitingRoom";

interface Params {
  examId: string;
}

export default function ExamWaitingPage({ params }: { params: Promise<Params> }) {
  // Next.js 15: route params are async and must be unwrapped before use.
  const { examId } = React.use(params);
  return <ExamWaitingRoom examId={examId} />;
}
