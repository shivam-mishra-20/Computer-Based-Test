import React from "react";

interface ModernLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  variant?: "dots" | "spinner" | "pulse";
}

export default function ModernLoader({
  size = "md",
  className = "",
  text,
  variant = "spinner",
}: ModernLoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (variant === "dots") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`${
                  size === "sm"
                    ? "w-2 h-2"
                    : size === "md"
                    ? "w-2.5 h-2.5"
                    : "w-3 h-3"
                } 
                  bg-slate-700 rounded-full animate-pulse`}
                style={{
                  animationDelay: `${index * 0.2}s`,
                  animationDuration: "1.4s",
                }}
              />
            ))}
          </div>
          {text && (
            <p
              className={`${textSizes[size]} text-slate-600 font-medium animate-pulse`}
            >
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div
            className={`${sizeClasses[size]} bg-slate-700 rounded-full animate-pulse`}
          />
          {text && (
            <p
              className={`${textSizes[size]} text-slate-600 font-medium animate-pulse`}
            >
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className={`${sizeClasses[size]} border-2 border-slate-200 rounded-full`}
          />
          <div
            className={`absolute inset-0 ${sizeClasses[size]} border-2 border-slate-700 border-t-transparent rounded-full animate-spin`}
          />
        </div>
        {text && (
          <p className={`${textSizes[size]} text-slate-600 font-medium`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

// Inline loader for buttons and small spaces
export function InlineLoader({
  className = "",
  variant = "spinner",
  color = "white",
}: {
  className?: string;
  variant?: "spinner" | "dots";
  color?: "white" | "dark";
}) {
  const colorClasses = {
    white: "border-white/30 border-t-white",
    dark: "border-slate-300 border-t-slate-700",
  };

  const dotColors = {
    white: "bg-white",
    dark: "bg-slate-700",
  };

  if (variant === "dots") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 ${dotColors[color]} rounded-full animate-pulse`}
            style={{
              animationDelay: `${index * 0.2}s`,
              animationDuration: "1.4s",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`w-4 h-4 border-2 ${colorClasses[color]} rounded-full animate-spin`}
      />
    </div>
  );
}

// Demo component to showcase all variants
export function LoaderDemo() {
  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8 text-center">
          Modern Loading Animations
        </h1>

        {/* Main Loaders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">
              Spinner
            </h3>
            <ModernLoader variant="spinner" size="lg" text="Loading..." />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Dots</h3>
            <ModernLoader variant="dots" size="lg" text="Processing..." />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Pulse</h3>
            <ModernLoader variant="pulse" size="lg" text="Please wait..." />
          </div>
        </div>

        {/* Size Variations */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-semibold mb-6 text-slate-700">
            Size Variations
          </h3>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <ModernLoader variant="spinner" size="sm" />
              <p className="mt-2 text-xs text-slate-500">Small</p>
            </div>
            <div className="text-center">
              <ModernLoader variant="spinner" size="md" />
              <p className="mt-2 text-xs text-slate-500">Medium</p>
            </div>
            <div className="text-center">
              <ModernLoader variant="spinner" size="lg" />
              <p className="mt-2 text-xs text-slate-500">Large</p>
            </div>
          </div>
        </div>

        {/* Inline Loaders */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6 text-slate-700">
            Inline Loaders
          </h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <button className="px-4 py-2 bg-slate-800 text-white rounded-md flex items-center gap-2 hover:bg-slate-700 transition-colors">
                <InlineLoader variant="spinner" color="white" />
                Submitting...
              </button>

              <button className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors">
                <InlineLoader variant="dots" color="white" />
                Saving...
              </button>

              <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md flex items-center gap-2 hover:bg-slate-50 transition-colors">
                <InlineLoader variant="spinner" color="dark" />
                Loading...
              </button>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-slate-800 text-slate-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Usage Examples</h3>
          <pre className="text-sm text-slate-300 overflow-x-auto">
            {`// Basic usage
<ModernLoader />

// With text and size
<ModernLoader size="lg" text="Loading content..." />

// Different variants
<ModernLoader variant="dots" text="Processing..." />
<ModernLoader variant="pulse" text="Please wait..." />

// Inline loader in button
<button className="px-4 py-2 bg-blue-600 text-white rounded">
  <InlineLoader color="white" />
  Submit
</button>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
