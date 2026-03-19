"use client";
import React, { useRef, useState } from "react";
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
}

export default function EquationEditor({
  value,
  onChange,
  placeholder = "Type your equation or use the toolbar...",
  label = "Equation",
  showPreview = true,
}: EquationEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, setCursorPosition] = useState(0);

  // Insert text at cursor position
  const insertAtCursor = (text: string, cursorOffset = text.length) => {
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
  };

  // Toolbar buttons with LaTeX templates
  // All templates wrapped in $...$ for inline math rendering
  // cursorOffset positions cursor at the first placeholder for quick editing
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

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
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

      {/* Input Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          placeholder={placeholder}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical font-mono text-sm"
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
          <div className="text-center p-3 bg-gray-50 rounded min-h-12 flex items-center justify-center">
            <MathText text={value} />
          </div>
        </div>
      )}

      {/* Quick Help */}
      <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded border border-blue-100">
        <p className="font-semibold text-blue-700 mb-2 flex items-center gap-1">
          <SparklesIcon className="w-3 h-3" />
          Math Tips - Toolbar buttons insert complete LaTeX automatically
        </p>
        <ul className="space-y-1 ml-4 list-disc text-gray-600">
          <li><span className="font-mono text-blue-700">$...$</span> wrapping is <span className="font-semibold">automatic</span> - just click buttons!</li>
          <li><span className="font-mono text-blue-700">^</span> for exponents: <code className="bg-white px-1 rounded">$a^{'{2}'}$</code></li>
          <li><span className="font-mono text-blue-700">_</span> for subscripts: <code className="bg-white px-1 rounded">$a_{'1'}$</code></li>
          <li><span className="font-mono text-blue-700">\frac</span> for fractions: <code className="bg-white px-1 rounded">$\frac{'{a}'}{'{b}'}$</code></li>
        </ul>
      </div>
    </div>
  );
}
