# Frontend Integration Guide - Enhanced Questions Display

## Overview

This guide explains how to render questions with LaTeX mathematical expressions and diagrams in the React/Next.js frontend.

---

## 📦 Required Dependencies

Add to `cbt-exam/package.json`:

```bash
npm install katex react-katex
npm install @types/katex --save-dev
```

---

## 🔧 LaTeX Math Rendering

### Setup KaTeX

Create a utility component for math rendering:

**`src/components/MathRenderer.tsx`**:

```typescript
import React from "react";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

interface MathRendererProps {
  text: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text }) => {
  // Split text by $ and $$ delimiters
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Match display math: $$...$$
  const displayMathRegex = /\$\$(.*?)\$\$/g;
  let displayMatch;
  const displayMatches: Array<{ start: number; end: number; content: string }> =
    [];

  while ((displayMatch = displayMathRegex.exec(text)) !== null) {
    displayMatches.push({
      start: displayMatch.index,
      end: displayMatch.index + displayMatch[0].length,
      content: displayMatch[1],
    });
  }

  // Match inline math: $...$
  const inlineMathRegex = /\$([^$]+?)\$/g;
  let inlineMatch;
  const inlineMatches: Array<{ start: number; end: number; content: string }> =
    [];

  while ((inlineMatch = inlineMathRegex.exec(text)) !== null) {
    // Skip if this is part of a display math block
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

  // Combine and sort all matches
  const allMatches = [
    ...displayMatches.map((m) => ({ ...m, type: "display" })),
    ...inlineMatches.map((m) => ({ ...m, type: "inline" })),
  ].sort((a, b) => a.start - b.start);

  allMatches.forEach((match, index) => {
    // Add text before this match
    if (lastIndex < match.start) {
      parts.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, match.start)}
        </span>
      );
    }

    // Add math component
    try {
      if (match.type === "display") {
        parts.push(
          <div key={`math-${index}`} className="my-4">
            <BlockMath math={match.content} />
          </div>
        );
      } else {
        parts.push(<InlineMath key={`math-${index}`} math={match.content} />);
      }
    } catch (error) {
      console.error("KaTeX rendering error:", error);
      // Fallback to displaying raw LaTeX
      parts.push(
        <code key={`error-${index}`} className="text-red-500">
          ${match.content}$
        </code>
      );
    }

    lastIndex = match.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-final">{text.substring(lastIndex)}</span>);
  }

  return <div className="math-content">{parts}</div>;
};

export default MathRenderer;
```

---

## 🎨 Diagram Display Component

**`src/components/DiagramDisplay.tsx`**:

```typescript
import React, { useState } from "react";
import Image from "next/image";

interface DiagramDisplayProps {
  url?: string;
  alt?: string;
  className?: string;
}

export const DiagramDisplay: React.FC<DiagramDisplayProps> = ({
  url,
  alt = "Diagram",
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!url || imageError) {
    return null;
  }

  return (
    <>
      <div className={`diagram-container my-4 ${className}`}>
        <div
          className="relative cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setIsModalOpen(true)}
        >
          <Image
            src={url}
            alt={alt}
            width={600}
            height={400}
            className="rounded-lg shadow-md object-contain w-full h-auto"
            onError={() => setImageError(true)}
            loading="lazy"
          />
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            Click to enlarge
          </div>
        </div>
        {alt && <p className="text-sm text-gray-600 mt-2 italic">{alt}</p>}
      </div>

      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <Image
              src={url}
              alt={alt}
              width={1200}
              height={800}
              className="object-contain w-full h-full"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100"
              onClick={() => setIsModalOpen(false)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DiagramDisplay;
```

---

## 📝 Enhanced Question Card Component

**`src/components/EnhancedQuestionCard.tsx`**:

```typescript
import React from "react";
import MathRenderer from "./MathRenderer";
import DiagramDisplay from "./DiagramDisplay";

interface Question {
  _id: string;
  text: string;
  type: string;
  options?: Array<{ text: string; isCorrect?: boolean; _id: string }>;
  diagramUrl?: string;
  diagramAlt?: string;
  correctAnswerText?: string;
  explanation?: string;
}

interface EnhancedQuestionCardProps {
  question: Question;
  questionNumber: number;
  showAnswer?: boolean;
  selectedAnswer?: string;
  onAnswerSelect?: (answerId: string) => void;
}

export const EnhancedQuestionCard: React.FC<EnhancedQuestionCardProps> = ({
  question,
  questionNumber,
  showAnswer = false,
  selectedAnswer,
  onAnswerSelect,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Question Number and Text */}
      <div className="mb-4">
        <span className="font-bold text-lg text-blue-600">
          Q{questionNumber}.
        </span>
        <div className="mt-2 text-gray-800 leading-relaxed">
          <MathRenderer text={question.text} />
        </div>
      </div>

      {/* Diagram if present */}
      {question.diagramUrl && (
        <DiagramDisplay url={question.diagramUrl} alt={question.diagramAlt} />
      )}

      {/* MCQ Options */}
      {question.type === "mcq" && question.options && (
        <div className="space-y-3 mt-4">
          {question.options.map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = selectedAnswer === option._id;
            const isCorrect = showAnswer && option.isCorrect;
            const isWrong = showAnswer && isSelected && !option.isCorrect;

            return (
              <button
                key={option._id}
                onClick={() => onAnswerSelect?.(option._id)}
                disabled={showAnswer}
                className={`
                  w-full text-left p-4 rounded-lg border-2 transition-all
                  ${isCorrect ? "bg-green-50 border-green-500" : ""}
                  ${isWrong ? "bg-red-50 border-red-500" : ""}
                  ${
                    isSelected && !showAnswer
                      ? "bg-blue-50 border-blue-500"
                      : ""
                  }
                  ${
                    !isSelected && !isCorrect && !isWrong
                      ? "border-gray-300 hover:border-blue-400"
                      : ""
                  }
                  ${showAnswer ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div className="flex items-start">
                  <span className="font-semibold mr-3 text-gray-700">
                    {optionLetter})
                  </span>
                  <div className="flex-1">
                    <MathRenderer text={option.text} />
                  </div>
                  {showAnswer && option.isCorrect && (
                    <span className="ml-2 text-green-600">✓</span>
                  )}
                  {isWrong && <span className="ml-2 text-red-600">✗</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Short/Long Answer Types */}
      {["short", "long", "fill"].includes(question.type) && !showAnswer && (
        <div className="mt-4">
          <textarea
            className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            rows={question.type === "long" ? 6 : 3}
            placeholder="Type your answer here..."
          />
        </div>
      )}

      {/* Show Answer/Explanation */}
      {showAnswer && question.correctAnswerText && (
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <div className="font-semibold text-blue-800 mb-2">
            Correct Answer:
          </div>
          <div className="text-gray-800">
            <MathRenderer text={question.correctAnswerText} />
          </div>
        </div>
      )}

      {showAnswer && question.explanation && (
        <div className="mt-4 p-4 bg-gray-50 border-l-4 border-gray-400 rounded">
          <div className="font-semibold text-gray-800 mb-2">Explanation:</div>
          <div className="text-gray-700">
            <MathRenderer text={question.explanation} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedQuestionCard;
```

---

## 🎯 Usage in Pages

**Example: Quiz Page**

```typescript
// src/app/quiz/[id]/page.tsx
import { EnhancedQuestionCard } from "@/components/EnhancedQuestionCard";

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Fetch questions...

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Physics Quiz</h1>

      {questions.map((question, index) => (
        <EnhancedQuestionCard
          key={question._id}
          question={question}
          questionNumber={index + 1}
          selectedAnswer={answers[question._id]}
          onAnswerSelect={(answerId) =>
            setAnswers((prev) => ({ ...prev, [question._id]: answerId }))
          }
        />
      ))}
    </div>
  );
}
```

---

## 🎨 Styling (Tailwind Config)

Add to `tailwind.config.js`:

```javascript
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            ".math-content": {
              display: "inline-block",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
```

---

## 🔧 Global CSS for KaTeX

Add to `src/app/globals.css`:

```css
@import "katex/dist/katex.min.css";

/* Custom KaTeX styling */
.katex {
  font-size: 1.1em;
}

.katex-display {
  margin: 1.5rem 0;
  overflow-x: auto;
  overflow-y: hidden;
}

/* Diagram container styling */
.diagram-container {
  max-width: 100%;
  overflow: hidden;
}

.diagram-container img {
  border: 1px solid #e5e7eb;
}

/* Math content styling */
.math-content {
  line-height: 1.8;
}
```

---

## 📱 Responsive Design

Ensure diagrams and math render well on mobile:

```css
@media (max-width: 640px) {
  .katex {
    font-size: 0.95em;
  }

  .katex-display {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .diagram-container img {
    max-width: 100%;
    height: auto;
  }
}
```

---

## 🧪 Testing

### Test Math Rendering:

```typescript
// Test component
const TestMath = () => (
  <div>
    <MathRenderer text="Solve $x^2 + 5x - 3 = 0$" />
    <MathRenderer text="$$\int_0^{\infty} e^{-x} dx = 1$$" />
    <MathRenderer text="The area is $\frac{\pi r^2}{2}$" />
  </div>
);
```

### Test Diagram Display:

```typescript
const TestDiagram = () => (
  <DiagramDisplay
    url="https://storage.googleapis.com/your-bucket/diagrams/test.jpg"
    alt="Sample diagram showing a right triangle"
  />
);
```

---

## 🚀 Performance Optimization

### Lazy Loading:

```typescript
import dynamic from "next/dynamic";

const MathRenderer = dynamic(() => import("@/components/MathRenderer"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-6 w-32 rounded" />,
  ssr: false, // Disable SSR for KaTeX
});
```

### Image Optimization:

- Use Next.js Image component (already implemented)
- Enable lazy loading
- Set appropriate image sizes
- Use WebP format when possible

---

## 🔍 Accessibility

Ensure math and diagrams are accessible:

```typescript
<MathRenderer
  text={question.text}
  aria-label="Mathematical expression"
/>

<DiagramDisplay
  url={url}
  alt="Detailed description of diagram for screen readers"
/>
```

---

## 📝 Type Definitions

Add to `src/types/question.ts`:

```typescript
export interface IQuestion {
  _id: string;
  text: string;
  type:
    | "mcq"
    | "truefalse"
    | "fill"
    | "short"
    | "long"
    | "assertionreason"
    | "integer";
  options?: IOption[];
  correctAnswerText?: string;
  integerAnswer?: number;
  assertion?: string;
  reason?: string;
  diagramUrl?: string;
  diagramAlt?: string;
  tags: {
    subject?: string;
    topic?: string;
    difficulty?: "easy" | "medium" | "hard";
  };
  explanation?: string;
}

export interface IOption {
  _id: string;
  text: string;
  isCorrect?: boolean;
}
```

---

## ✅ Checklist

- [ ] Install KaTeX dependencies
- [ ] Create MathRenderer component
- [ ] Create DiagramDisplay component
- [ ] Update QuestionCard component
- [ ] Add global CSS for KaTeX
- [ ] Test math rendering
- [ ] Test diagram display
- [ ] Verify responsive design
- [ ] Check accessibility
- [ ] Test on mobile devices

---

**Integration Complete!** 🎉

Your frontend can now beautifully render:

- ✅ Professional LaTeX mathematical expressions
- ✅ Embedded diagrams with zoom functionality
- ✅ Responsive design for all devices
- ✅ Accessible content for all users
