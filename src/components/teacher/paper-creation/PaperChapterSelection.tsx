"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { PaperFormData } from "../CreatePaperFlow";
import { apiFetch } from "../../../lib/api";

interface PaperChapterSelectionProps {
  formData: PaperFormData;
  updateFormData: (data: Partial<PaperFormData>) => void;
}

interface Chapter {
  name: string;
  questionCount: number;
}

interface ChaptersApiItem {
  chapter: string;
  count: number;
}

export default function PaperChapterSelection({
  formData,
  updateFormData,
}: PaperChapterSelectionProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChapters = useCallback(async () => {
    setLoading(true);
    try {
      // Require class for per-class collections
      if (!formData.className || !formData.className.trim()) {
        setChapters([]);
        setLoading(false);
        return;
      }
      // Build query parameters with class and board filters
      const params = new URLSearchParams({
        subject: formData.subject,
      });

      if (formData.className) {
        params.append("class", formData.className);
      }

      if (formData.board) {
        params.append("board", formData.board);
      }

      // Fetch distinct chapters from backend (DB-backed). If none, show empty state.
      const items = (await apiFetch(
        `/exams/questions/chapters?${params.toString()}`
      )) as ChaptersApiItem[];

      if (Array.isArray(items)) {
        const normalized = items
          .filter((x) => x && typeof x.chapter === "string")
          .map((x) => ({ name: x.chapter, questionCount: x.count || 0 }));
        setChapters(normalized);
      } else {
        setChapters([]);
      }
    } catch (error) {
      console.error("Error loading chapters:", error);
      // No fallback: show empty state when no chapters exist in DB
      setChapters([]);
    } finally {
      setLoading(false);
    }
  }, [formData.subject, formData.className, formData.board]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  // No default chapters: show "No chapters found" if the API returns none

  const handleChapterToggle = (chapterName: string) => {
    const isSelected = formData.selectedChapters.includes(chapterName);
    const newSelectedChapters = isSelected
      ? formData.selectedChapters.filter((c) => c !== chapterName)
      : [...formData.selectedChapters, chapterName];

    updateFormData({ selectedChapters: newSelectedChapters });
  };

  const handleSelectAll = () => {
    updateFormData({ selectedChapters: chapters.map((c) => c.name) });
  };

  const handleClearAll = () => {
    updateFormData({ selectedChapters: [] });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading chapters...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-bold text-emerald-900 mb-1">
          Select Chapters
        </h2>
        <p className="text-sm text-gray-600">Choose chapters to include</p>
      </motion.div>

      {/* Require class selection to load DB-backed chapters */}
      {!formData.className?.trim() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Select a Class to view available chapters for {formData.subject}
          </p>
        </motion.div>
      )}

      {formData.className?.trim() && (
        <>
          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              <span className="font-bold text-emerald-700">
                {formData.selectedChapters.length}
              </span>{" "}
              / {chapters.length} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                All
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Chapters Grid */}
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {chapters.map((chapter, index) => {
              const isSelected = formData.selectedChapters.includes(
                chapter.name
              );

              return (
                <motion.button
                  key={chapter.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * index }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChapterToggle(chapter.name)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-500"
                      : "bg-white border-emerald-200 hover:border-emerald-300"
                  }`}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}

                  <div className="space-y-1 pr-6">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {chapter.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {chapter.questionCount > 0
                        ? `${chapter.questionCount} questions`
                        : "Available"}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {chapters.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                No chapters found for {formData.subject}
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
