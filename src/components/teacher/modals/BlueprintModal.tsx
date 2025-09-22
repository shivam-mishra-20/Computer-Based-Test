"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SavedBlueprint {
  _id: string;
  name?: string;
  examTitle?: string;
  subject?: string;
  generalInstructions?: string[];
  sections?: unknown[];
}

interface Props {
  open: boolean;
  blueprints: SavedBlueprint[];
  loading: boolean;
  newBlueprintName: string;
  onChangeBlueprintName: (v: string) => void;
  onSaveCurrent: () => void;
  saving: boolean;
  onApply: (bp: SavedBlueprint) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function BlueprintModal({
  open,
  blueprints,
  loading,
  newBlueprintName,
  onChangeBlueprintName,
  onSaveCurrent,
  saving,
  onApply,
  onDelete,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          >
            <div className="p-5 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg text-gray-800">
                  Blueprints
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
            </div>
            <div className="p-5 space-y-4 text-sm max-h-[calc(80vh-70px)] overflow-auto">
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="relative flex-grow">
                    <input
                      value={newBlueprintName}
                      onChange={(e) => onChangeBlueprintName(e.target.value)}
                      placeholder="Blueprint name"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <motion.button
                    onClick={onSaveCurrent}
                    disabled={saving}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                    className="text-sm px-4 py-2 rounded-md bg-primary text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
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
                        Saving
                      </span>
                    ) : (
                      "Save Current"
                    )}
                  </motion.button>
                </div>
                <div className="bg-gray-50 border rounded-lg overflow-hidden">
                  {loading && (
                    <div className="p-4 flex justify-center items-center">
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
                        <span>Loading blueprints...</span>
                      </div>
                    </div>
                  )}
                  {!loading && !blueprints.length && (
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      <p>No blueprints saved yet</p>
                    </div>
                  )}
                  {!loading && blueprints.length > 0 && (
                    <div className="divide-y">
                      {blueprints.map((bp, index) => (
                        <motion.div
                          key={bp._id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 flex items-center gap-3 hover:bg-white transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {bp.examTitle || bp.name || "Exam"}
                            </div>
                            {bp.subject && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {bp.subject}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              onClick={() => onApply(bp)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 text-sm shadow-sm transition-colors"
                            >
                              Load
                            </motion.button>
                            <motion.button
                              onClick={() => onDelete(bp._id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-3 py-1.5 border border-red-200 rounded-md bg-white hover:bg-red-50 text-red-600 text-sm shadow-sm transition-colors"
                            >
                              Delete
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
