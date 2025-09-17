"use client";
import { useSearchParams } from "next/navigation";
import AttemptPlayer from "../../../../components/student/AttemptPlayer";
import React from "react";

interface Params {
  attemptId: string;
}

export default function AttemptPage({ params }: { params: Params }) {
  const search = useSearchParams();
  const review = search.get("review");
  return (
    <AttemptPlayer
      attemptId={params.attemptId}
      mode={review ? "review" : "attempt"}
    />
  );
}
