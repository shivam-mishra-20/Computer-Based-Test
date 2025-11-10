# Frontend LaTeX Rendering Guide

## Overview

This guide explains how to properly render mathematical equations in LaTeX format throughout the CBT Exam frontend application.

## Required Package

### Installation

```bash
npm install katex react-katex
npm install --save-dev @types/katex
```

Or using the existing setup (already installed):

```json
{
  "dependencies": {
    "katex": "^0.16.11"
  }
}
```

## Implementation

### 1. Create LaTeX Renderer Component

Create `src/components/LaTeXRenderer.tsx`:

```typescript
import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LaTeXRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

export const LaTeXRenderer: React.FC<LaTeXRendererProps> = ({
  content,
  className = "",
  displayMode = false,
}) => {
  const renderContent = () => {
    if (!content) return "";

    try {
      // Replace inline math $...$ and display math $$...$$
      let html = content;

      // First handle display math $$...$$
      html = html.replace(/\$\$(.*?)\$\$/gs, (match, math) => {
        try {
          return `<div class="katex-display">${katex.renderToString(
            math.trim(),
            {
              displayMode: true,
              throwOnError: false,
              trust: true,
              strict: false,
            }
          )}</div>`;
        } catch (e) {
          console.error("Display math render error:", e);
          return match;
        }
      });

      // Then handle inline math $...$
      html = html.replace(/\$([^\$]+?)\$/g, (match, math) => {
        try {
          return katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
            trust: true,
            strict: false,
          });
        } catch (e) {
          console.error("Inline math render error:", e);
          return match;
        }
      });

      return html;
    } catch (error) {
      console.error("LaTeX rendering error:", error);
      return content;
    }
  };

  return (
    <div
      className={`latex-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderContent() }}
    />
  );
};

export default LaTeXRenderer;
```

### 2. Create CSS Styles

Create `src/styles/latex.css`:

```css
/* KaTeX base styles are imported from 'katex/dist/katex.min.css' */

.latex-content {
  line-height: 1.6;
  font-size: 16px;
}

.latex-content .katex {
  font-size: 1.1em;
}

.latex-content .katex-display {
  margin: 1em 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.latex-content .katex-display > .katex {
  display: inline-block;
  white-space: nowrap;
  max-width: 100%;
  text-align: center;
}

/* Inline math styling */
.latex-content .katex {
  color: inherit;
}

/* Question text with math */
.question-text .latex-content {
  margin-bottom: 1rem;
}

/* Option text with math */
.option-text .latex-content {
  display: inline-block;
  vertical-align: middle;
}

/* Answer text with math */
.answer-text .latex-content {
  padding: 0.5rem;
  background-color: #f0f9ff;
  border-radius: 0.375rem;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .answer-text .latex-content {
    background-color: #1e3a8a;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .latex-content {
    font-size: 14px;
  }

  .latex-content .katex-display {
    font-size: 0.9em;
  }
}
```

### 3. Update Question Card Component

Update `src/components/QuestionCard.tsx`:

```typescript
import React from "react";
import LaTeXRenderer from "./LaTeXRenderer";

interface QuestionCardProps {
  question: {
    text: string;
    type: string;
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswerText?: string;
    integerAnswer?: number;
    assertion?: string;
    reason?: string;
  };
  showAnswer?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  showAnswer = false,
}) => {
  return (
    <div className="question-card p-6 bg-white rounded-lg shadow-md">
      {/* Question Text */}
      <div className="question-text mb-4">
        <LaTeXRenderer content={question.text} />
      </div>

      {/* MCQ Options */}
      {question.type === "mcq" && question.options && (
        <div className="options space-y-2">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`option p-3 rounded border ${
                showAnswer && option.isCorrect
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300"
              }`}
            >
              <span className="option-label font-semibold mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              <div className="option-text inline">
                <LaTeXRenderer content={option.text} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assertion-Reason Type */}
      {question.type === "assertionreason" && (
        <div className="assertion-reason space-y-4">
          <div className="assertion">
            <p className="font-semibold mb-2">Assertion:</p>
            <LaTeXRenderer content={question.assertion || ""} />
          </div>
          <div className="reason">
            <p className="font-semibold mb-2">Reason:</p>
            <LaTeXRenderer content={question.reason || ""} />
          </div>
        </div>
      )}

      {/* Answer Display */}
      {showAnswer && (
        <div className="answer mt-4 p-4 bg-blue-50 rounded">
          <p className="font-semibold mb-2 text-blue-800">Answer:</p>
          {question.type === "integer" && (
            <p className="text-lg">{question.integerAnswer}</p>
          )}
          {question.correctAnswerText && (
            <div className="answer-text">
              <LaTeXRenderer content={question.correctAnswerText} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
```

### 4. Update Question Editor Component

Create `src/components/QuestionEditor.tsx`:

```typescript
import React, { useState } from "react";
import LaTeXRenderer from "./LaTeXRenderer";

interface QuestionEditorProps {
  question: {
    text: string;
    type: string;
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswerText?: string;
  };
  onSave: (updatedQuestion: any) => void;
  onCancel: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onSave,
  onCancel,
}) => {
  const [editedQuestion, setEditedQuestion] = useState(question);
  const [previewMode, setPreviewMode] = useState(false);

  const handleTextChange = (field: string, value: string) => {
    setEditedQuestion((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...(editedQuestion.options || [])];
    newOptions[index] = { ...newOptions[index], text };
    setEditedQuestion((prev) => ({
      ...prev,
      options: newOptions,
    }));
  };

  return (
    <div className="question-editor p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Edit Question</h3>
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {previewMode ? "Edit" : "Preview"}
        </button>
      </div>

      {previewMode ? (
        // Preview Mode
        <div className="preview-mode">
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Question Preview:</h4>
            <LaTeXRenderer content={editedQuestion.text} />
          </div>

          {editedQuestion.options && (
            <div className="options-preview space-y-2">
              {editedQuestion.options.map((option, index) => (
                <div key={index} className="option p-3 border rounded">
                  <span className="font-semibold mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <LaTeXRenderer content={option.text} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Edit Mode
        <div className="edit-mode space-y-4">
          <div>
            <label className="block font-semibold mb-2">
              Question Text
              <span className="text-sm text-gray-500 ml-2">
                (Use $...$ for inline math, $$...$$ for display)
              </span>
            </label>
            <textarea
              value={editedQuestion.text}
              onChange={(e) => handleTextChange("text", e.target.value)}
              className="w-full p-3 border rounded min-h-32 font-mono text-sm"
              placeholder="Enter question with LaTeX: Find $x$ if $x^2 + 5x + 6 = 0$"
            />
          </div>

          {editedQuestion.options && (
            <div>
              <label className="block font-semibold mb-2">Options</label>
              {editedQuestion.options.map((option, index) => (
                <div key={index} className="mb-2">
                  <label className="text-sm text-gray-600 mb-1 block">
                    Option {String.fromCharCode(65 + index)}
                  </label>
                  <textarea
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="w-full p-2 border rounded font-mono text-sm"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LaTeX Helper */}
      <div className="latex-helper mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold mb-2">LaTeX Quick Reference:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <code>$x^2$</code> → x²
          </div>
          <div>
            <code>
              $\frac{"{a}"}
              {"{b}"}$
            </code>{" "}
            → a/b
          </div>
          <div>
            <code>$\sqrt{"{x}"}$</code> → √x
          </div>
          <div>
            <code>$\int f(x) dx$</code> → ∫f(x)dx
          </div>
          <div>
            <code>$\alpha, \beta, \pi$</code> → α, β, π
          </div>
          <div>
            <code>$\sin(x), \cos(x)$</code> → sin(x), cos(x)
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(editedQuestion)}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default QuestionEditor;
```

### 5. Update Import Review Page

Update the import review page to use LaTeX rendering:

```typescript
// src/app/dashboard/import-review/[batchId]/page.tsx
import LaTeXRenderer from "@/components/LaTeXRenderer";

export default function ImportReviewPage() {
  // ... existing code

  return (
    <div className="import-review">
      {questions.map((question) => (
        <div key={question._id} className="question-item">
          <LaTeXRenderer content={question.text} />

          {question.options?.map((option, idx) => (
            <div key={idx} className="option">
              <LaTeXRenderer content={option.text} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Usage Examples

### Example 1: Simple Math Question

```typescript
const question = {
  text: "Solve for $x$ in the equation $x^2 + 5x + 6 = 0$",
  type: "mcq",
  options: [
    { text: "$x = -2$ or $x = -3$", isCorrect: true },
    { text: "$x = 2$ or $x = 3$", isCorrect: false },
    { text: "$x = -1$ or $x = -6$", isCorrect: false },
    { text: "$x = 1$ or $x = 6$", isCorrect: false },
  ],
};

<QuestionCard question={question} />;
```

### Example 2: Calculus Question

```typescript
const question = {
  text: "Evaluate the integral: $$\\int_0^{\\pi} \\sin(x)\\, dx$$",
  type: "integer",
  integerAnswer: 2,
};

<QuestionCard question={question} showAnswer={true} />;
```

### Example 3: Physics Question

```typescript
const question = {
  text: "A ball is thrown with velocity $v_0 = 20 \\text{ m/s}$ at angle $\\theta = 45^{\\circ}$. Find maximum height.",
  type: "short",
  correctAnswerText:
    "Maximum height: $h = \\frac{v_0^2 \\sin^2(\\theta)}{2g} = \\frac{400 \\times 0.5}{20} = 10 \\text{ m}$",
};

<QuestionCard question={question} showAnswer={true} />;
```

## LaTeX Syntax Quick Reference

### Common Patterns

```latex
# Fractions
$\frac{1}{2}$, $\frac{x+1}{x-1}$

# Powers and Subscripts
$x^2$, $x^{2n}$, $x_1$, $x_{n+1}$

# Roots
$\sqrt{x}$, $\sqrt[3]{x}$, $\sqrt{x^2 + y^2}$

# Greek Letters
$\alpha$, $\beta$, $\gamma$, $\theta$, $\pi$, $\Delta$, $\Sigma$

# Trigonometric
$\sin(x)$, $\cos(x)$, $\tan(x)$, $\sin^2(x)$

# Calculus
$\frac{dy}{dx}$, $\int f(x) dx$, $\int_a^b f(x) dx$
$\lim_{x \to a} f(x)$, $\sum_{i=1}^{n} a_i$

# Matrices
$\begin{pmatrix} a & b \\ c & d \end{pmatrix}$

# Inequalities
$\leq$, $\geq$, $\neq$, $\approx$

# Sets
$\in$, $\notin$, $\cup$, $\cap$, $\subset$
```

## Testing LaTeX Rendering

### Test Cases

```typescript
const testQuestions = [
  {
    text: "Simple: $x + 5 = 10$",
    answer: "$x = 5$",
  },
  {
    text: "Fraction: $\\frac{a+b}{c+d}$",
    answer: "Simplify to get result",
  },
  {
    text: "Complex: $$\\int_0^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$",
    answer: "Gaussian integral",
  },
  {
    text: "Matrix: $\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$",
    answer: "Determinant = -2",
  },
];
```

## Troubleshooting

### Common Issues

1. **Math not rendering**: Check if dollar signs are balanced
2. **Escaped characters**: Use double backslash in strings: `\\frac` not `\frac`
3. **Display math overlap**: Use `$$...$$` for block equations
4. **Mobile overflow**: Add `overflow-x: auto` to container

### Debug Mode

```typescript
// Enable KaTeX error display
katex.renderToString(math, {
  throwOnError: false, // Don't throw errors
  errorColor: "#cc0000", // Show errors in red
  strict: false, // Allow non-strict LaTeX
});
```

## Performance Optimization

### Memoization

```typescript
import { useMemo } from "react";

const MemoizedLaTeX = React.memo(LaTeXRenderer);

// In component
const renderedContent = useMemo(
  () => <MemoizedLaTeX content={question.text} />,
  [question.text]
);
```

### Lazy Loading

```typescript
const LaTeXRenderer = dynamic(() => import("./LaTeXRenderer"), {
  ssr: false,
  loading: () => <div>Loading math...</div>,
});
```

## Summary

This setup ensures:

- ✅ Accurate mathematical notation throughout the app
- ✅ Consistent rendering in preview and edit modes
- ✅ Mobile-responsive math display
- ✅ Easy-to-use editor interface
- ✅ Comprehensive LaTeX support
- ✅ Error handling and fallbacks

---

**Last Updated**: November 10, 2025
