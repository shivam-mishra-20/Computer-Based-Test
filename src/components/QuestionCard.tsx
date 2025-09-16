"use client";
import React from "react";

type Question = { id?: string; title?: string; body?: string };

export default function QuestionCard({ question }: { question?: Question }) {
  return (
    <article
      className="p-4 mb-3 rounded-md shadow-sm bg-white font-poppins"
      style={{ border: "1px solid var(--beige-sand)" }}
    >
      <h3 className="text-sm font-semibold mb-2 text-accent">
        {question?.title ?? "Question title"}
      </h3>
      <div className="text-sm text-muted">
        {question?.body ?? "Question body / choices here"}
      </div>
    </article>
  );
}
