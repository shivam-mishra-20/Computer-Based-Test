"use client";
import React, { useMemo } from "react";
import katex from "katex";
// KaTeX CSS is loaded from CDN in layout.tsx to avoid font bundling issues

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
    
    // First, find all display math ($$...$$) to avoid conflicts with inline math
    const displayMathRegex = /\$\$((?:(?!\$\$).)+?)\$\$/gs;
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
    
    // Then find all inline math ($...$), but skip those inside display math
    const inlineMathRegex = /\$([^\$\n]+?)\$/g;
    const inlineMatches: Array<{
      start: number;
      end: number;
      content: string;
    }> = [];
    let inlineMatch: RegExpExecArray | null;
    
    while ((inlineMatch = inlineMathRegex.exec(text)) !== null) {
      // Check if this inline match is inside a display match
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
    
    // Combine and sort all matches by position
    const allMatches = [
      ...displayMatches.map((m) => ({ ...m, type: "display" as const })),
      ...inlineMatches.map((m) => ({ ...m, type: "inline" as const })),
    ].sort((a, b) => a.start - b.start);
    
    // Build the result by interleaving text and math
    allMatches.forEach((match, index) => {
      // Add text before this math expression
      if (lastIndex < match.start) {
        const textContent = text.substring(lastIndex, match.start);
        if (textContent) {
          parts.push(
            <span key={`text-${index}`}>
              {textContent}
            </span>
          );
        }
      }
      
      // Render the math expression
      try {
        const html = katex.renderToString(match.content, {
          displayMode: match.type === "display",
          throwOnError: false,
          output: "html",
          strict: false,
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
              className="inline-block"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
      } catch (error) {
        // If KaTeX fails, show the raw LaTeX with error styling
        parts.push(
          <code
            key={`error-${index}`}
            className="text-red-500 bg-red-50 px-1 rounded text-xs"
            title={error instanceof Error ? error.message : "LaTeX error"}
          >
            ${match.content}$
          </code>
        );
      }
      
      lastIndex = match.end;
    });
    
    // Add any remaining text after the last math expression
    if (lastIndex < text.length) {
      const textContent = text.substring(lastIndex);
      if (textContent) {
        parts.push(<span key="text-final">{textContent}</span>);
      }
    }
    
    // If no math was found, just return the text
    if (parts.length === 0) {
      return <span>{text}</span>;
    }
    
    return <>{parts}</>;
  }, [text]);
  
  if (inline) return <span className="inline-flex items-baseline gap-0.5">{content}</span>;
  return <div className="flex flex-wrap items-baseline gap-0.5">{content}</div>;
}

export default MathText;
