"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  CheckIcon,
  FunnelIcon,
  AcademicCapIcon,
  ClockIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhotoIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../../lib/api";
import MathText from "../ui/MathText";

const CLASS_OPTIONS = ["6", "7", "8", "9", "10", "11", "12"];

interface Question {
  _id: string;
  text: string;
  type: string;
  subject: string;
  chapter?: string;
  topic?: string;
  section?: string;
  marks?: number;
  difficulty?: string;
  diagramUrl?: string;
  options?: Array<{ text: string; isCorrect?: boolean }>;
}

interface ExamSection {
  title: string;
  questionIds: string[];
  marks: number;
}

interface FilterOptions {
  subjects: string[];
  chapters: string[];
  topics: string[];
  sections: string[];
}

export default function CreateExamFlow() {
  // Exam metadata
  const [examTitle, setExamTitle] = useState("");
  const [examClass, setExamClass] = useState("");
  const [totalDuration, setTotalDuration] = useState(60);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    subjects: [],
    chapters: [],
    topics: [],
    sections: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  // Questions
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [sections, setSections] = useState<ExamSection[]>([
    { title: "Section A", questionIds: [], marks: 0 },
  ]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"setup" | "select" | "organize">("setup");

  // Load filter options
  const loadFilters = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append("subject", selectedSubject);

      const response = (await apiFetch(
        `/api/ai/questions/class/${examClass}/filters?${params}`
      )) as { success: boolean; data: FilterOptions };

      if (response.success) {
        setFilterOptions(response.data);
      }
    } catch (error) {
      console.error("Failed to load filters:", error);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (selectedSubject) params.append("subject", selectedSubject);
      if (selectedChapter) params.append("chapter", selectedChapter);
      if (selectedTopic) params.append("topic", selectedTopic);
      if (selectedSection) params.append("section", selectedSection);

      const response = (await apiFetch(
        `/api/ai/questions/class/${examClass}?${params}`
      )) as { success: boolean; data: { questions: Question[] } };

      if (response.success) {
        setAvailableQuestions(response.data.questions);
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
      setAvailableQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load filters when class changes
  useEffect(() => {
    if (examClass) {
      loadFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examClass]);

  // Load questions when filters change
  useEffect(() => {
    if (examClass) {
      loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    examClass,
    selectedSubject,
    selectedChapter,
    selectedTopic,
    selectedSection,
  ]);

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const toggleExpandQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const addToSection = (sectionIndex: number) => {
    const questionsToAdd = Array.from(selectedQuestions);
    setSections((prev) =>
      prev.map((sec, idx) => {
        if (idx === sectionIndex) {
          const newQuestionIds = [...sec.questionIds, ...questionsToAdd];
          const marks = newQuestionIds.reduce((sum, qId) => {
            const q = availableQuestions.find((q) => q._id === qId);
            return sum + (q?.marks || 1);
          }, 0);
          return { ...sec, questionIds: newQuestionIds, marks };
        }
        return sec;
      })
    );
    setSelectedQuestions(new Set());
  };

  const removeFromSection = (sectionIndex: number, questionId: string) => {
    setSections((prev) =>
      prev.map((sec, idx) => {
        if (idx === sectionIndex) {
          const newQuestionIds = sec.questionIds.filter(
            (id) => id !== questionId
          );
          const marks = newQuestionIds.reduce((sum, qId) => {
            const q = availableQuestions.find((q) => q._id === qId);
            return sum + (q?.marks || 1);
          }, 0);
          return { ...sec, questionIds: newQuestionIds, marks };
        }
        return sec;
      })
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: `Section ${String.fromCharCode(65 + prev.length)}`,
        questionIds: [],
        marks: 0,
      },
    ]);
  };

  const removeSection = (index: number) => {
    if (sections.length === 1) return;
    setSections((prev) => prev.filter((_, idx) => idx !== index));
  };

  const createExam = async () => {
    if (
      !examTitle.trim() ||
      !examClass ||
      sections.every((s) => s.questionIds.length === 0)
    ) {
      alert("Please provide exam title, class, and add questions to sections");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: examTitle.trim(),
          classLevel: `Class ${examClass}`,
          totalDurationMins: totalDuration,
          sections: sections.map((s) => ({
            title: s.title,
            questionIds: s.questionIds,
            sectionDurationMins: Math.ceil(totalDuration / sections.length),
          })),
          isPublished: false,
        }),
      });

      alert("✅ Exam created successfully!");
      // Reset form
      setExamTitle("");
      setExamClass("");
      setSections([{ title: "Section A", questionIds: [], marks: 0 }]);
      setSelectedQuestions(new Set());
      setStep("setup");
    } catch (error) {
      alert(
        `Failed to create exam: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = sections.reduce((sum, s) => sum + s.marks, 0);
  const totalQuestions = sections.reduce(
    (sum, s) => sum + s.questionIds.length,
    0
  );

  const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${url}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <AcademicCapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Create Exam
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Build your exam step by step
              </p>
            </div>
          </div>

          {/* Progress Steps - Stack on mobile */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4">
            {["Setup", "Select Questions", "Organize & Save"].map(
              (label, idx) => {
                const stepKeys = ["setup", "select", "organize"];
                const isActive = step === stepKeys[idx];
                const isCompleted = stepKeys.indexOf(step) > idx;
                
                return (
                  <div key={idx} className="flex items-center w-full sm:w-auto">
                    <div
                      className={`
                        w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center 
                        text-sm font-bold transition-all shadow-sm
                        ${isActive
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-110"
                          : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-500"
                        }
                      `}
                    >
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${isActive ? "text-indigo-700" : "text-gray-600"}`}>
                      {label}
                    </span>
                    {idx < 2 && (
                      <div className="hidden sm:block w-8 lg:w-12 h-0.5 bg-gray-200 mx-2" />
                    )}
                  </div>
                );
              }
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-3 sm:p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-1">
                <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <span className="text-xs text-indigo-600 font-medium">Questions</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-indigo-700">
                {totalQuestions}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 sm:p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">Duration</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-purple-700">
                {totalDuration}m
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 sm:p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-medium">Marks</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-emerald-700">
                {totalMarks}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Setup */}
        {step === "setup" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">1</span>
              Exam Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g., Mid-Term Exam 2025"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    value={examClass}
                    onChange={(e) => setExamClass(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-all"
                    required
                  >
                    <option value="">Select Class</option>
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={totalDuration}
                    onChange={(e) => setTotalDuration(Number(e.target.value))}
                    min="15"
                    max="300"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep("select")}
                disabled={!examTitle.trim() || !examClass}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 disabled:shadow-none"
              >
                Next: Select Questions →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Select Questions */}
        {step === "select" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Collapsible Filters */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <FunnelIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Filter Questions
                    </h2>
                    <p className="text-xs text-gray-500">
                      Narrow down by subject, chapter, topic
                    </p>
                  </div>
                </div>
                {showFilters ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Subject
                        </label>
                        <select
                          value={selectedSubject}
                          onChange={(e) => {
                            setSelectedSubject(e.target.value);
                            setSelectedChapter("");
                            setSelectedTopic("");
                          }}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                          <option value="">All Subjects</option>
                          {filterOptions.subjects.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Chapter
                        </label>
                        <select
                          value={selectedChapter}
                          onChange={(e) => setSelectedChapter(e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50"
                          disabled={!selectedSubject}
                        >
                          <option value="">All Chapters</option>
                          {filterOptions.chapters.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Topic
                        </label>
                        <select
                          value={selectedTopic}
                          onChange={(e) => setSelectedTopic(e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50"
                          disabled={!selectedSubject}
                        >
                          <option value="">All Topics</option>
                          {filterOptions.topics.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Section
                        </label>
                        <select
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                          <option value="">All Sections</option>
                          {filterOptions.sections.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      Available Questions
                    </h2>
                    <p className="text-sm text-gray-500">
                      {availableQuestions.length} questions found
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSelectedQuestions(
                          new Set(availableQuestions.map((q) => q._id))
                        )
                      }
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedQuestions(new Set())}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3 text-gray-500">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading questions...</span>
                  </div>
                </div>
              ) : availableQuestions.length === 0 ? (
                <div className="text-center py-16">
                  <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No questions found. Try adjusting filters or generate
                    questions first.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                  {availableQuestions.map((q) => {
                    const isSelected = selectedQuestions.has(q._id);
                    const isExpanded = expandedQuestions.has(q._id);
                    const hasLongText = q.text.length > 200;
                    const displayText = hasLongText && !isExpanded 
                      ? q.text.slice(0, 200) + "..." 
                      : q.text;

                    return (
                      <div
                        key={q._id}
                        className={`p-4 transition-colors ${
                          isSelected ? "bg-indigo-50/50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleQuestion(q._id)}
                            className={`
                              flex-shrink-0 w-7 h-7 rounded-lg border-2 
                              flex items-center justify-center mt-0.5 transition-all
                              ${isSelected
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-gray-300 hover:border-indigo-400"
                              }
                            `}
                          >
                            {isSelected && (
                              <CheckIcon className="w-4 h-4 text-white" />
                            )}
                          </button>

                          {/* Question Content */}
                          <div className="flex-1 min-w-0">
                            {/* Question Text */}
                            <div 
                              className="text-sm sm:text-base leading-relaxed text-gray-800 cursor-pointer"
                              onClick={() => toggleQuestion(q._id)}
                            >
                              <MathText text={displayText} />
                            </div>

                            {/* Expand/Collapse for long text */}
                            {hasLongText && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandQuestion(q._id);
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
                                    className="max-w-full sm:max-w-xs h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all"
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
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                {q.type}
                              </span>
                              {q.marks && (
                                <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                                  {q.marks} marks
                                </span>
                              )}
                              {(q.chapter || q.topic) && (
                                <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                                  {q.chapter || q.topic}
                                </span>
                              )}
                              {q.diagramUrl && (
                                <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-600 rounded-full flex items-center gap-1">
                                  <PhotoIcon className="w-3 h-3" />
                                  Image
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fixed Bottom Action Bar */}
              <div className="sticky bottom-0 p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setStep("setup")}
                    className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                      {selectedQuestions.size} selected
                    </span>
                    <button
                      onClick={() => setStep("organize")}
                      disabled={
                        selectedQuestions.size === 0 && totalQuestions === 0
                      }
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 disabled:shadow-none"
                    >
                      Next: Organize →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Organize & Save */}
        {step === "organize" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">3</span>
              Organize Sections
            </h2>

            <div className="space-y-4">
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  className="border-2 border-gray-200 rounded-xl overflow-hidden"
                >
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, title: e.target.value } : s
                          )
                        )
                      }
                      className="text-lg font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1 py-0.5 transition-colors"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {section.questionIds.length} questions • {section.marks} marks
                      </span>
                      {sections.length > 1 && (
                        <button
                          onClick={() => removeSection(idx)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    {section.questionIds.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                        No questions added to this section
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {section.questionIds.map((qId, qIdx) => {
                          const q = availableQuestions.find((q) => q._id === qId);
                          if (!q) return null;
                          return (
                            <div
                              key={qId}
                              className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl group"
                            >
                              <span className="text-sm font-bold text-gray-400 mt-0.5 w-6">
                                {qIdx + 1}.
                              </span>
                              <div className="flex-1 text-sm text-gray-700 line-clamp-2">
                                <MathText text={q.text} />
                              </div>
                              <button
                                onClick={() => removeFromSection(idx, qId)}
                                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedQuestions.size > 0 && (
                      <button
                        onClick={() => addToSection(idx)}
                        className="mt-3 w-full py-2.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium border-2 border-dashed border-indigo-200 hover:border-indigo-300 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Add {selectedQuestions.size} selected question
                        {selectedQuestions.size !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addSection}
              className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Section
            </button>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => setStep("select")}
                className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={createExam}
                disabled={saving || totalQuestions === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 disabled:shadow-none flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    Create Exam
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Image Lightbox Modal */}
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
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
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
    </div>
  );
}
