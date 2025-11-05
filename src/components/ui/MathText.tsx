"use client";
import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css"; // ensure proper spacing/metrics for equations

export function MathText({
  text,
  inline = false,
}: {
  text: string;
  inline?: boolean;
}) {
  const content = useMemo(() => {
    if (!text) return null;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const displayMathRegex = /\$\$(.*?)\$\$/g;
    const displayMatches: Array<{
      start: number;
      end: number;
      content: string;
    }> = [];
    let displayMatch: RegExpExecArray | null;
    while ((displayMatch = displayMathRegex.exec(text)) !== null) {
      displayMatches.push({
        start: displayMatch.index,
        end: displayMatch.index + displayMatch[0].length,
        content: displayMatch[1],
      });
    }
    const inlineMathRegex = /\$([^$]+?)\$/g;
    const inlineMatches: Array<{
      start: number;
      end: number;
      content: string;
    }> = [];
    let inlineMatch: RegExpExecArray | null;
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
  }, [text]);
  if (inline) return <span>{content}</span>;
  return <div>{content}</div>;
}

export default MathText;
