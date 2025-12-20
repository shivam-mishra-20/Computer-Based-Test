"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  CheckIcon,
  PhotoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import MathText from "../../ui/MathText";

interface BankQuestion {
  _id: string;
  text: string;
  tags?: { subject?: string; topic?: string; difficulty?: string };
  diagramUrl?: string;
  options?: Array<{ text: string; isCorrect?: boolean }>;
  type?: string;
  marks?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  bankExamTitle: string;
  onChangeTitle: (v: string) => void;
  classLevel: string;
  onChangeClass: (v: string) => void;
  batch: string;
  onChangeBatch: (v: string) => void;
  timerMins: string;
  onChangeTimer: (v: string) => void;
  questions: BankQuestion[];
  loading: boolean;
  selected: string[];
  toggleSelect: (id: string) => void;
  creating: boolean;
  onCreate: () => void;
}

export default function BankExamModal({
  open,
  onClose,
  bankExamTitle,
  onChangeTitle,
  classLevel,
  onChangeClass,
  batch,
  onChangeBatch,
  timerMins,
  onChangeTimer,
  questions,
  loading,
  selected,
  toggleSelect,
  creating,
  onCreate,
}: Props) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${url}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:w-[95vw] sm:max-w-4xl sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-gray-900">
                    Create Exam from Question Bank
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Select questions to build your exam
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-white/80"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Exam Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Exam Title
                  </label>
                  <input
                    value={bankExamTitle}
                    onChange={(e) => onChangeTitle(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Enter a descriptive title"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Class Level
                    </label>
                    <input
                      value={classLevel}
                      onChange={(e) => onChangeClass(e.target.value)}
                      placeholder="e.g. 9, 10, 11, 12"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Batch
                    </label>
                    <input
                      value={batch}
                      onChange={(e) => onChangeBatch(e.target.value)}
                      placeholder="e.g. A, B, Science"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Exam Duration
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={timerMins}
                      onChange={(e) => onChangeTimer(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all pr-20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      minutes
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Select Questions
                    </h4>
                    <p className="text-xs text-gray-500">
                      {questions.length} questions available
                    </p>
                  </div>
                  <span className="text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1.5 rounded-full shadow-sm">
                    {selected.length} selected
                  </span>
                </div>

                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                  {loading && (
                    <div className="p-8 flex justify-center items-center">
                      <div className="flex items-center gap-3 text-gray-500">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading questions...</span>
                      </div>
                    </div>
                  )}

                  {!loading && questions.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="font-medium">No questions available</p>
                      <p className="text-sm mt-1">Add questions to your bank first</p>
                    </div>
                  )}

                  <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                    {!loading &&
                      questions.map((q, index) => {
                        const checked = selected.includes(q._id);
                        const isExpanded = expandedQuestions.has(q._id);
                        const hasLongText = q.text.length > 180;
                        const displayText = hasLongText && !isExpanded
                          ? q.text.slice(0, 180) + "..."
                          : q.text;

                        return (
                          <motion.div
                            key={q._id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.02, 0.3) }}
                            className={`p-4 transition-colors ${
                              checked ? "bg-indigo-50/70" : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex gap-3">
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleSelect(q._id)}
                                className={`
                                  flex-shrink-0 w-7 h-7 rounded-lg border-2 
                                  flex items-center justify-center transition-all mt-0.5
                                  ${checked
                                    ? "bg-gradient-to-br from-indigo-500 to-purple-500 border-indigo-500 shadow-sm"
                                    : "border-gray-300 bg-white hover:border-indigo-400"
                                  }
                                `}
                              >
                                {checked && (
                                  <CheckIcon className="w-4 h-4 text-white" />
                                )}
                              </button>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {/* Question Text */}
                                <div 
                                  className="text-sm sm:text-base leading-relaxed text-gray-800 cursor-pointer"
                                  onClick={() => toggleSelect(q._id)}
                                >
                                  <MathText text={displayText} />
                                </div>

                                {/* Read More/Less */}
                                {hasLongText && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand(q._id);
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
                                {q.diagramUrl && (
                                  <div className="mt-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingImage(getImageUrl(q.diagramUrl!));
                                      }}
                                      className="relative group inline-block"
                                    >
                                      <img
                                        src={getImageUrl(q.diagramUrl)}
                                        alt="Question diagram"
                                        className="max-w-full sm:max-w-[280px] h-auto rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 text-xs bg-black/70 text-white px-2.5 py-1 rounded-lg transition-opacity">
                                          Tap to enlarge
                                        </span>
                                      </div>
                                    </button>
                                  </div>
                                )}

                                {/* Options for MCQ */}
                                {q.options && q.options.length > 0 && (
                                  <div className="mt-3 space-y-1.5">
                                    {q.options.map((opt, idx) => (
                                      <div
                                        key={idx}
                                        className={`
                                          text-xs sm:text-sm px-3 py-2 rounded-lg
                                          ${opt.isCorrect
                                            ? "bg-green-50 text-green-700 border border-green-200 font-medium"
                                            : "bg-gray-50 text-gray-600 border border-gray-100"
                                          }
                                        `}
                                      >
                                        <span className="font-bold mr-2">
                                          {String.fromCharCode(65 + idx)}.
                                        </span>
                                        <MathText text={opt.text} inline />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Tags */}
                                <div className="flex gap-1.5 flex-wrap mt-3">
                                  {q.type && (
                                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                      {q.type}
                                    </span>
                                  )}
                                  {q.tags?.subject && (
                                    <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-xs font-medium">
                                      {q.tags.subject}
                                    </span>
                                  )}
                                  {q.tags?.topic && (
                                    <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-medium">
                                      {q.tags.topic}
                                    </span>
                                  )}
                                  {q.tags?.difficulty && (
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        q.tags.difficulty === "easy"
                                          ? "bg-emerald-50 text-emerald-600"
                                          : q.tags.difficulty === "medium"
                                          ? "bg-amber-50 text-amber-600"
                                          : "bg-red-50 text-red-600"
                                      }`}
                                    >
                                      {q.tags.difficulty}
                                    </span>
                                  )}
                                  {q.diagramUrl && (
                                    <span className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                      <PhotoIcon className="w-3 h-3" />
                                      Image
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-sm font-medium text-gray-600 bg-indigo-50 px-4 py-2 rounded-full">
                  {selected.length} question{selected.length !== 1 ? "s" : ""} selected
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onCreate}
                    disabled={creating || !selected.length}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>Create Exam</>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Image Lightbox */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewingImage}
                alt="Question diagram"
                className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
              />
              <button
                onClick={() => setViewingImage(null)}
                className="absolute -top-2 -right-2 sm:top-3 sm:right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
