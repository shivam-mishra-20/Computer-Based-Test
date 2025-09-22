"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  title: string;
  onChangeTitle: (v: string) => void;
  classLevel: string;
  onChangeClass: (v: string) => void;
  batch: string;
  onChangeBatch: (v: string) => void;
  timerMins: string;
  onChangeTimer: (v: string) => void;
  autoPublish: boolean;
  onChangeAutoPublish: (v: boolean) => void;
  creating: boolean;
  onCancel: () => void;
  onCreate: () => void;
}

export default function GenExamModal({
  open,
  title,
  onChangeTitle,
  classLevel,
  onChangeClass,
  batch,
  onChangeBatch,
  timerMins,
  onChangeTimer,
  autoPublish,
  onChangeAutoPublish,
  creating,
  onCancel,
  onCreate,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">
                Create from Generated Questions
              </h3>
              <button
                onClick={onCancel}
                className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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

            <div className="p-5 space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Exam Title
                </label>
                <input
                  value={title}
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

              <label className="flex items-center gap-2 py-1">
                <div className="relative inline-block w-10 mr-2 align-middle">
                  <input
                    type="checkbox"
                    checked={autoPublish}
                    onChange={(e) => onChangeAutoPublish(e.target.checked)}
                    className="peer sr-only"
                    id="autoPublish"
                  />
                  <div className="block h-6 w-10 rounded-full bg-gray-200 peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white peer-checked:translate-x-4 transition-transform"></div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Auto Publish Results
                </span>
              </label>
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreate}
                disabled={creating}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
