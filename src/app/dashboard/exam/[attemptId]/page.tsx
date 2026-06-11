"use client";
import { useSearchParams } from "next/navigation";
import AttemptPlayer from "../../../../components/student/AttemptPlayer";
import React from "react";

interface Params {
  attemptId: string;
}

export default function AttemptPage({ params }: { params: Promise<Params> }) {
  // Next.js 15: route params are async and must be unwrapped before use.
  const { attemptId } = React.use(params);
  const search = useSearchParams();
  const review = search?.get("review");
  return (
    <AttemptPlayer attemptId={attemptId} mode={review ? "review" : "attempt"} />
  );
}
