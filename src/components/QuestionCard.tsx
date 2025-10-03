"use client";
import React, { useMemo } from "react";
import katex from "katex";

type Question = { id?: string; title?: string; body?: string };

// Render text with LaTeX math support using KaTeX directly
function renderMathText(text: string) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Match display math: $$...$$
  const displayMathRegex = /\$\$(.*?)\$\$/g;
  const displayMatches: Array<{ start: number; end: number; content: string }> =
    [];
  let displayMatch;

  while ((displayMatch = displayMathRegex.exec(text)) !== null) {
    displayMatches.push({
      start: displayMatch.index,
      end: displayMatch.index + displayMatch[0].length,
      content: displayMatch[1],
    });
  }

  // Match inline math: $...$
  const inlineMathRegex = /\$([^$]+?)\$/g;
  const inlineMatches: Array<{ start: number; end: number; content: string }> =
    [];
  let inlineMatch;

  while ((inlineMatch = inlineMathRegex.exec(text)) !== null) {
    const isInDisplay = displayMatches.some(
      (dm) => inlineMatch!.index >= dm.start && inlineMatch!.index < dm.end
    );
    if (!isInDisplay) {
      inlineMatches.push({
        start: inlineMatch.index,
        end: inlineMatch.index + inlineMatch[0].length,
        content: inlineMatch[1],
      });
    }
  }

  const allMatches = [
    ...displayMatches.map((m) => ({ ...m, type: "display" as const })),
    ...inlineMatches.map((m) => ({ ...m, type: "inline" as const })),
  ].sort((a, b) => a.start - b.start);

  allMatches.forEach((match, index) => {
    if (lastIndex < match.start) {
      parts.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, match.start)}
        </span>
      );
    }

    try {
      const html = katex.renderToString(match.content, {
        displayMode: match.type === "display",
        throwOnError: false,
        output: "html",
      });

      if (match.type === "display") {
        parts.push(
          <div
            key={`math-${index}`}
            className="my-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } else {
        parts.push(
          <span
            key={`math-${index}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    } catch {
      parts.push(
        <code
          key={`error-${index}`}
          className="text-red-500 bg-red-50 px-1 rounded text-xs"
        >
          ${match.content}$
        </code>
      );
    }

    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    parts.push(<span key="text-final">{text.substring(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

export default function QuestionCard({ question }: { question?: Question }) {
  const renderedTitle = useMemo(
    () => renderMathText(question?.title ?? "Question title"),
    [question?.title]
  );
  const renderedBody = useMemo(
    () => renderMathText(question?.body ?? "Question body / choices here"),
    [question?.body]
  );

  return (
    <article
      className="p-4 mb-3 rounded-md shadow-sm bg-white font-poppins"
      style={{ border: "1px solid var(--beige-sand)" }}
    >
      <h3 className="text-sm font-semibold mb-2 text-accent">
        {renderedTitle}
      </h3>
      <div className="text-sm text-muted">{renderedBody}</div>
    </article>
  );
}
