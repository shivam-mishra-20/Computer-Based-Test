"use client";
import React, { useMemo } from "react";
import katex from "katex";
// KaTeX CSS is loaded from CDN in layout.tsx to avoid font bundling issues

// Tokenize a math string at TOP-LEVEL word boundaries so a whole sentence
// stored in math mode can wrap (multi-line, growing height) instead of
// overflowing into a horizontal scrollbar.
//
// Boundaries are LaTeX inter-word spacing (`\ `, `\,`, `\;`, `\:`, `\quad`,
// `\qquad`, `~`) and plain whitespace, matched as whole units — crucially we do
// NOT split a bare space out of `\ `, which would orphan the backslash and make
// KaTeX render a red parse error (the bug this replaces). Braces are tracked so
// spaces inside `{...}` (e.g. `\text{a b}`) never split.
function tokenizeMath(content: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  // depth tracks {…} AND \left…\right groups, so we never split inside a math
  // group (splitting `\left( … \right)` at a space would orphan \left and make
  // KaTeX render a red error).
  let depth = 0;
  let i = 0;
  const flush = () => {
    if (buf) {
      tokens.push(buf);
      buf = "";
    }
  };
  const isLetter = (c: string) => /[a-zA-Z]/.test(c || "");
  while (i < content.length) {
    // \left( / \right) — but NOT \leftarrow / \leftrightarrow (followed by a letter)
    if (content.startsWith("\\left", i) && !isLetter(content[i + 5])) {
      depth++;
      buf += "\\left";
      i += 5;
      continue;
    }
    if (content.startsWith("\\right", i) && !isLetter(content[i + 6])) {
      depth = Math.max(0, depth - 1);
      buf += "\\right";
      i += 6;
      continue;
    }
    const ch = content[i];
    if (ch === "{") {
      depth++;
      buf += ch;
      i++;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      i++;
      continue;
    }
    if (depth === 0) {
      const m = content.slice(i).match(/^(\\qquad|\\quad|\\,|\\;|\\:|\\!|\\ |~|\s+)/);
      if (m) {
        flush();
        tokens.push(" ");
        i += m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return tokens;
}

// A token with no LaTeX-special characters is plain prose — render it as normal
// (upright, wrapping) text rather than math-italic via KaTeX.
function isPlainToken(t: string): boolean {
  return !/[\\^_{}$]/.test(t);
}

// Render plain text with newlines converted to <br/> so multi-line questions and
// bullet lists display on separate lines everywhere, independent of any parent
// white-space CSS.
function renderTextWithBreaks(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  text.split("\n").forEach((line, i) => {
    if (i > 0) out.push(<br key={`br-${i}`} />);
    if (line) out.push(<React.Fragment key={`ln-${i}`}>{line}</React.Fragment>);
  });
  return out;
}

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
            <span key={`text-${index}`}>{renderTextWithBreaks(textContent)}</span>
          );
        }
      }
      
      // Render one math chunk to a KaTeX span. throwOnError:true so a malformed
      // chunk falls back to readable plain text instead of KaTeX's red error.
      const renderChunk = (chunk: string, key: string) => {
        try {
          const html = katex.renderToString(chunk, {
            displayMode: false,
            throwOnError: true,
            output: "html",
            strict: false,
          });
          return (
            <span key={key} dangerouslySetInnerHTML={{ __html: html }} />
          );
        } catch {
          return <span key={key}>{chunk}</span>;
        }
      };

      if (match.type === "display") {
        try {
          const html = katex.renderToString(match.content, {
            displayMode: true,
            throwOnError: false,
            output: "html",
            strict: false,
          });
          parts.push(
            <div
              key={`math-${index}`}
              className="my-2 max-w-full overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (error) {
          parts.push(
            <code
              key={`error-${index}`}
              className="text-red-500 bg-red-50 px-1 rounded text-xs"
              title={error instanceof Error ? error.message : "LaTeX error"}
            >
              {`$$${match.content}$$`}
            </code>
          );
        }
      } else if (/\\begin|\\end|\\\\/.test(match.content)) {
        // Structured inline math (environments / line breaks): render whole.
        parts.push(renderChunk(match.content, `math-${index}`));
      } else {
        // Inline prose/formula: tokenize at word boundaries so it wraps. Plain
        // words render as upright text; only real math tokens go through KaTeX.
        tokenizeMath(match.content).forEach((tok, ti) => {
          if (tok === " ") {
            parts.push(<span key={`math-${index}-sp-${ti}`}> </span>);
          } else if (isPlainToken(tok)) {
            parts.push(<span key={`math-${index}-t-${ti}`}>{tok}</span>);
          } else {
            parts.push(renderChunk(tok, `math-${index}-${ti}`));
          }
        });
      }

      lastIndex = match.end;
    });
    
    // Add any remaining text after the last math expression
    if (lastIndex < text.length) {
      const textContent = text.substring(lastIndex);
      if (textContent) {
        parts.push(<span key="text-final">{renderTextWithBreaks(textContent)}</span>);
      }
    }

    // If no math was found, just return the text (with line breaks preserved)
    if (parts.length === 0) {
      return <span>{renderTextWithBreaks(text)}</span>;
    }
    
    return <>{parts}</>;
  }, [text]);
  
  // Normal flow (no flex): flex rows treat each math/text part as an atomic
  // item, which prevents mid-text wrapping and clips long formulas inside
  // overflow-hidden cards. overflow-x-auto is the safety net for formulas
  // too long to wrap at all.
  if (inline) return <span className="break-words">{content}</span>;
  // Words are split into atomic KaTeX spans (see splitTopLevelSpaces), so a long
  // question wraps onto multiple lines and the card grows in height instead of
  // scrolling. overflow-x-auto stays only as a last resort for a single
  // unbreakable wide token (e.g. a big matrix).
  return (
    <div className="max-w-full overflow-x-auto break-words">{content}</div>
  );
}

export default MathText;
