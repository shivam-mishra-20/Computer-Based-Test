"use client";
import React from "react";

export default function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 font-medium text-white bg-cta hover:bg-cta/90 ${className}`}
    >
      {children}
    </button>
  );
}
