"use client";
import React, { useRef, useState, useCallback } from "react";
import {
  XMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import MathText from "./MathText";

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  showPreview?: boolean;
  showToolbar?: boolean;
  showHelp?: boolean;
  rows?: number;
}

export default function EquationEditor({
  value,
  onChange,
  placeholder = "Type your equation or use the toolbar...",
  label = "Equation",
  showPreview = true,
  showToolbar = true,
  showHelp = true,
  rows = 6,
}: EquationEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, setCursorPosition] = useState(0);

  // Insert text at cursor position
  const insertAtCursor = useCallback((text: string, cursorOffset = text.length) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = before + text + after;

    onChange(newValue);

    // Set cursor position in next tick
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + cursorOffset;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  // Toolbar buttons — inline ($...$) then block math and multi-line templates
  const toolbarItems = [
    { label: "½", template: "$\\frac{a}{b}$", cursorOffset: 7, description: "Fraction: \\frac{a}{b}" },
    { label: "√", template: "$\\sqrt{x}$", cursorOffset: 7, description: "Square root: \\sqrt{x}" },
    { label: "∫", template: "$\\int_{a}^{b}$", cursorOffset: 7, description: "Integral: \\int_{a}^{b}" },
    { label: "Σ", template: "$\\sum_{i=1}^{n}$", cursorOffset: 7, description: "Summation: \\sum_{i=1}^{n}" },
    { label: "±", template: "$\\pm$", cursorOffset: 5, description: "Plus-minus: \\pm" },
    { label: "∞", template: "$\\infty$", cursorOffset: 8, description: "Infinity: \\infty" },
    { label: "≈", template: "$\\approx$", cursorOffset: 9, description: "Approximately: \\approx" },
    { label: "≤", template: "$\\leq$", cursorOffset: 6, description: "Less than or equal: \\leq" },
    { label: "≥", template: "$\\geq$", cursorOffset: 6, description: "Greater than or equal: \\geq" },
    { label: "≠", template: "$\\neq$", cursorOffset: 6, description: "Not equal: \\neq" },
    { label: "×", template: "$\\times$", cursorOffset: 8, description: "Multiplication: \\times" },
    { label: "÷", template: "$\\div$", cursorOffset: 6, description: "Division: \\div" },
    { label: "π", template: "$\\pi$", cursorOffset: 5, description: "Pi: \\pi" },
    { label: "θ", template: "$\\theta$", cursorOffset: 8, description: "Theta: \\theta" },
    { label: "α", template: "$\\alpha$", cursorOffset: 8, description: "Alpha: \\alpha" },
    { label: "β", template: "$\\beta$", cursorOffset: 7, description: "Beta: \\beta" },
    { label: "γ", template: "$\\gamma$", cursorOffset: 8, description: "Gamma: \\gamma" },
    { label: "x²", template: "$a^{2}$", cursorOffset: 3, description: "Exponent: a^{2}" },
    { label: "x₂", template: "$a_{2}$", cursorOffset: 3, description: "Subscript: a_{2}" },
    { label: "()", template: "$\\left(x\\right)$", cursorOffset: 7, description: "Large brackets: \\left(x\\right)" },
  ];

  // Block / multi-line math toolbar items (rendered in a second row)
  const blockToolbarItems = [
    { label: "•", title: "Bullet point (starts a new line)", template: "\n• ", cursorOffset: 3 },
    { label: "$$", title: "Display / block math — renders centred on its own line", template: "$$\n\n$$", cursorOffset: 3 },
    { label: "align", title: "Multi-line aligned equations (use & for alignment, \\\\ for new line)", template: "$$\n\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}\n$$", cursorOffset: 24 },
    { label: "cases", title: "Piecewise / cases expression", template: "$$\n\\begin{cases}\nx & \\text{if } x \\geq 0 \\\\\n-x & \\text{if } x < 0\n\\end{cases}\n$$", cursorOffset: 24 },
    { label: "matrix", title: "2×2 matrix", template: "$$\n\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}\n$$", cursorOffset: 26 },
    { label: "→", title: "Chemical / logical arrow", template: "$\\rightarrow$", cursorOffset: 13 },
    { label: "⇌", title: "Equilibrium arrow", template: "$\\rightleftharpoons$", cursorOffset: 20 },
    { label: "°C", title: "Degree Celsius", template: "$^\\circ C$", cursorOffset: 10 },
    { label: "→→", title: "Net ionic equation template", template: "$$A + B \\rightarrow C + D$$", cursorOffset: 10 },
  ];

  // Detect if pasted text looks like raw LaTeX (no delimiters) and auto-wrap it
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    // Heuristic: raw LaTeX starts with \ or contains ^ _ \frac \sqrt etc without $ wrappers
    const looksLikeRawLatex =
      !pasted.includes("$") &&
      (/^\\[a-zA-Z{]/.test(pasted.trim()) ||
        /\\(?:frac|sqrt|sum|int|lim|log|sin|cos|tan|begin|end|left|right|text|vec|hat|bar)\b/.test(pasted) ||
        (pasted.includes("^") && pasted.includes("{")) ||
        (pasted.includes("_") && pasted.includes("{")));

    if (!looksLikeRawLatex) return; // let browser handle normally

    e.preventDefault();
    const wrapped = pasted.includes("\n") ? `$$\n${pasted.trim()}\n$$` : `$${pasted.trim()}$`;
    insertAtCursor(wrapped, wrapped.length);
  }, [insertAtCursor]);

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      {/* Toolbar */}
      {showToolbar && (
        <div className="space-y-2">
          {/* Row 1 — inline math symbols */}
          <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 border border-gray-200 rounded-t-lg">
            {toolbarItems.map((item) => (
              <button
                key={item.template}
                type="button"
                onClick={() => insertAtCursor(item.template, item.cursorOffset)}
                title={item.description}
                className="px-2 py-1.5 sm:px-3 sm:py-2 text-sm sm:text-base bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded transition-colors font-medium text-gray-700 hover:text-indigo-600"
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* Row 2 — block / multi-line math */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-b-lg">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest self-center mr-1">Block</span>
            {blockToolbarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => insertAtCursor(item.template, item.cursorOffset)}
                title={item.title}
                className="px-2.5 py-1.5 text-xs bg-white hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-400 rounded-md transition-colors font-mono font-semibold text-indigo-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical font-mono text-sm leading-relaxed"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
            title="Clear"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* LaTeX Code Display */}
      {value && (
        <div className="p-2 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs font-mono text-gray-600 break-all">{value}</p>
        </div>
      )}

      {/* Live Preview */}
      {showPreview && value && (
        <div className="p-4 bg-white border-2 border-indigo-200 rounded-lg">
          <p className="text-xs font-semibold text-indigo-600 mb-2">
            Live Preview
          </p>
          <div className="p-3 bg-gray-50 rounded min-h-12 whitespace-pre-wrap break-words leading-relaxed text-left">
            <MathText text={value} />
          </div>
        </div>
      )}

      {/* Quick Help */}
      {showHelp && (
        <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded border border-blue-100 space-y-2">
          <p className="font-semibold text-blue-700 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
            Math Tips
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 ml-1 text-gray-600">
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">Inline math (single line)</p>
              <ul className="space-y-0.5 list-disc ml-4">
                <li><code className="font-mono bg-white px-1 rounded">$x^2 + y^2$</code> → renders inline</li>
                <li>Use toolbar row 1 — inserts <code>$...$</code> automatically</li>
                <li><code className="font-mono bg-white px-1 rounded">^</code> exponent · <code className="font-mono bg-white px-1 rounded">_</code> subscript</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">Block / multi-line math</p>
              <ul className="space-y-0.5 list-disc ml-4">
                <li><code className="font-mono bg-white px-1 rounded">$$...$$</code> → centred display block</li>
                <li>Use <strong>align</strong> button for multi-line with <code>&amp;</code> and <code>\\</code></li>
                <li>Paste raw LaTeX — auto-wrapped in <code>$...$</code> or <code>$$...$$</code></li>
              </ul>
            </div>
          </div>
          <p className="text-gray-400 italic">Example: <code className="font-mono bg-white px-1 rounded text-indigo-700">{String.raw`$$\begin{aligned} a &= b \\ c &= d \end{aligned}$$`}</code></p>
        </div>
      )}
    </div>
  );
}
