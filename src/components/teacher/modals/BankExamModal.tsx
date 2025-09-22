"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BankQuestion {
  _id: string;
  text: string;
  tags?: { subject?: string; topic?: string; difficulty?: string };
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
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg text-gray-800">
                Create Exam from Question Bank
              </h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[calc(80vh-130px)] overflow-auto">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Exam Title
                </label>
                <input
                  value={bankExamTitle}
                  onChange={(e) => onChangeTitle(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Enter a descriptive title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Class Level
                  </label>
                  <input
                    value={classLevel}
                    onChange={(e) => onChangeClass(e.target.value)}
                    placeholder="e.g. 9, 10, 11, 12"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Batch
                  </label>
                  <input
                    value={batch}
                    onChange={(e) => onChangeBatch(e.target.value)}
                    placeholder="e.g. A, B, Science"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Exam Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={timerMins}
                    onChange={(e) => onChangeTimer(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    minutes
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">
                    Select Questions
                  </h4>
                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {selected.length} selected
                  </span>
                </div>

                <div className="border rounded-lg shadow-sm bg-gray-50 overflow-hidden">
                  {loading && (
                    <div className="p-6 flex justify-center items-center">
                      <div className="flex items-center gap-2 text-gray-500">
                        <svg
                          className="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Loading questions...</span>
                      </div>
                    </div>
                  )}

                  {!loading && questions.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto mb-2"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <p>No questions available in the bank</p>
                    </div>
                  )}

                  <div className="max-h-72 overflow-auto divide-y">
                    {!loading &&
                      questions.map((q, index) => {
                        const checked = selected.includes(q._id);
                        return (
                          <motion.label
                            key={q._id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`flex gap-3 p-3 items-start cursor-pointer hover:bg-white ${
                              checked ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="relative flex items-center h-6 w-6 mt-0.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelect(q._id)}
                                className="peer sr-only"
                                id={`question-${q._id}`}
                              />
                              <div className="h-5 w-5 border rounded-md bg-white border-gray-300 peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                              <svg
                                className="absolute left-0.5 top-0.5 h-4 w-4 text-white scale-0 peer-checked:scale-100 transition-transform"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="6 12 10 16 18 8"></polyline>
                              </svg>
                            </div>

                            <div className="flex-1">
                              <div className="text-sm">{q.text}</div>
                              {q.tags && (
                                <div className="flex gap-1.5 flex-wrap mt-2">
                                  {q.tags.subject && (
                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                                      {q.tags.subject}
                                    </span>
                                  )}
                                  {q.tags.topic && (
                                    <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-xs font-medium">
                                      {q.tags.topic}
                                    </span>
                                  )}
                                  {q.tags.difficulty && (
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
                                </div>
                              )}
                            </div>
                          </motion.label>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm font-medium text-gray-700">
                {selected.length} question{selected.length !== 1 ? "s" : ""}{" "}
                selected
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCreate}
                  disabled={creating || !selected.length}
                  className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>Create Exam</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
