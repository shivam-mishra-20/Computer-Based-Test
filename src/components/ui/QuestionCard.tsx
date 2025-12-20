"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, PhotoIcon } from "@heroicons/react/24/outline";
import MathText from "./MathText";

interface QuestionCardProps {
  question: {
    _id: string;
    text: string;
    type: string;
    subject?: string;
    chapter?: string;
    topic?: string;
    section?: string;
    marks?: number;
    difficulty?: string;
    diagramUrl?: string;
    options?: Array<{ text: string; isCorrect?: boolean }>;
    tags?: {
      subject?: string;
      topic?: string;
      difficulty?: string;
    };
  };
  isSelected: boolean;
  onToggle: (id: string) => void;
  showOptions?: boolean;
  showDiagram?: boolean;
  compact?: boolean;
}

export default function QuestionCard({
  question,
  isSelected,
  onToggle,
  showOptions = true,
  showDiagram = true,
  compact = false,
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const q = question;
  const hasLongText = q.text.length > 150;
  const displayText = compact && hasLongText && !isExpanded 
    ? q.text.slice(0, 150) + "..." 
    : q.text;

  const difficulty = q.difficulty || q.tags?.difficulty;
  const topic = q.topic || q.tags?.topic;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          relative bg-white rounded-xl border-2 shadow-sm overflow-hidden 
          transition-all cursor-pointer hover:shadow-md active:scale-[0.99]
          ${isSelected 
            ? "border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-200" 
            : "border-gray-200 hover:border-gray-300"
          }
        `}
        onClick={() => onToggle(q._id)}
      >
        {/* Main Content */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div
              className={`
                flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 
                flex items-center justify-center mt-0.5 transition-all
                ${isSelected
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-gray-300 bg-white"
                }
              `}
            >
              {isSelected && (
                <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </div>

            {/* Question Content */}
            <div className="flex-1 min-w-0">
              {/* Question Text */}
              <div className="text-sm sm:text-base leading-relaxed text-gray-800">
                <MathText text={displayText} />
              </div>

              {/* Expand/Collapse for long text */}
              {compact && hasLongText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="mt-2 text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUpIcon className="w-4 h-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-4 h-4" />
                      Read more
                    </>
                  )}
                </button>
              )}

              {/* Diagram Image */}
              {showDiagram && q.diagramUrl && (
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullImage(true);
                    }}
                    className="relative group"
                  >
                    <img
                      src={q.diagramUrl.startsWith("http") ? q.diagramUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${q.diagramUrl}`}
                      alt="Question diagram"
                      className="max-w-full sm:max-w-xs h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-xs bg-black/70 text-white px-2 py-1 rounded transition-opacity">
                        Tap to enlarge
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {/* Options for MCQ */}
              {showOptions && q.options && q.options.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {q.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`
                        text-xs sm:text-sm px-2.5 py-1.5 rounded-lg
                        ${opt.isCorrect
                          ? "bg-green-50 text-green-700 border border-green-200 font-medium"
                          : "bg-gray-50 text-gray-600 border border-gray-100"
                        }
                      `}
                    >
                      <span className="font-semibold mr-1.5">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <MathText text={opt.text} inline />
                    </div>
                  ))}
                </div>
              )}

              {/* Tags & Metadata */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-3 flex-wrap">
                <span className="text-xs px-2 py-1 sm:px-2.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {q.type}
                </span>
                {q.marks && (
                  <span className="text-xs px-2 py-1 sm:px-2.5 sm:py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    {q.marks} marks
                  </span>
                )}
                {topic && (
                  <span className="text-xs px-2 py-1 sm:px-2.5 sm:py-1 bg-gray-100 text-gray-600 rounded-full">
                    {topic}
                  </span>
                )}
                {difficulty && (
                  <span
                    className={`text-xs px-2 py-1 sm:px-2.5 sm:py-1 rounded-full font-medium ${
                      difficulty === "easy"
                        ? "bg-emerald-50 text-emerald-600"
                        : difficulty === "medium"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {difficulty}
                  </span>
                )}
                {q.diagramUrl && !showDiagram && (
                  <span className="text-xs px-2 py-1 sm:px-2.5 sm:py-1 bg-purple-50 text-purple-600 rounded-full flex items-center gap-1">
                    <PhotoIcon className="w-3 h-3" />
                    Image
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full Image Modal */}
      <AnimatePresence>
        {showFullImage && q.diagramUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={q.diagramUrl.startsWith("http") ? q.diagramUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${q.diagramUrl}`}
                alt="Question diagram"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
              <button
                onClick={() => setShowFullImage(false)}
                className="absolute -top-2 -right-2 sm:top-2 sm:right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
