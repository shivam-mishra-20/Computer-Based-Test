"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

export interface QuestionPickerProps {
  selected: string[];
  onChange(ids: string[]): void;
}

const TeacherQuestionPicker: React.FC<QuestionPickerProps> = ({
  selected,
  onChange,
}) => {
  const [list, setList] = useState<
    {
      _id: string;
      text: string;
      tags?: { subject?: string; topic?: string; difficulty?: string };
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  async function loadQuestions() {
    setLoading(true);
    try {
      interface QShape {
        _id: string;
        text: string;
        tags?: { subject?: string; topic?: string; difficulty?: string };
      }
      const data = (await apiFetch(
        `/api/exams/questions${query ? `?q=${encodeURIComponent(query)}` : ""}`
      )) as { items: QShape[] };
      setList(data.items || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const displayedQuestions = showAll ? list : list.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search question bank..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <motion.button
          onClick={loadQuestions}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            "Refresh"
          )}
        </motion.button>
        <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          {selected.length} selected
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {loading && (
          <div className="p-4 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
            Loading questions...
          </div>
        )}

        {!loading && (
          <>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {displayedQuestions.map((question) => (
                <motion.label
                  key={question._id}
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  whileHover={{ x: 2 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(question._id)}
                    onChange={() => toggle(question._id)}
                    className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-2 mb-1">
                      {question.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {question.tags?.subject && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {question.tags.subject}
                        </span>
                      )}
                      {question.tags?.topic && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                          {question.tags.topic}
                        </span>
                      )}
                      {question.tags?.difficulty && (
                        <span
                          className={`px-2 py-1 rounded ${
                            question.tags.difficulty === "easy"
                              ? "bg-green-100 text-green-700"
                              : question.tags.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {question.tags.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.label>
              ))}
            </div>

            {list.length > 5 && !showAll && (
              <div className="p-3 bg-gray-50 text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Show {list.length - 5} more questions
                </button>
              </div>
            )}

            {showAll && list.length > 5 && (
              <div className="p-3 bg-gray-50 text-center">
                <button
                  onClick={() => setShowAll(false)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Show less
                </button>
              </div>
            )}
          </>
        )}

        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No questions found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherQuestionPicker;
