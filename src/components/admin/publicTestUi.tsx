"use client";
import React from "react";

/**
 * Form primitives shared by the public-test authoring screens.
 *
 * Extracted into their own module rather than exported from PublicTests.tsx:
 * that file imports PublicSeriesManager, which needs these, which would make
 * the two files import each other. ESM tolerates the cycle but resolves one
 * side to `undefined` at module-init time depending on entry order — a crash
 * that only appears in a production build.
 */

export const inputClass =
  "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-slate-400 font-normal ml-1.5">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
