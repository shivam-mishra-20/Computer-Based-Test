"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PaperFormData } from "../CreatePaperFlow";
import { Card } from "../../ui/card";
import { apiFetch } from "../../../lib/api";
import { MathText } from "../../ui/MathText";

interface PaperQuestionSelectionProps {
  formData: PaperFormData;
  updateFormData: (data: Partial<PaperFormData>) => void;
}

interface Question {
  _id: string;
  text: string;
  type: string;
  tags?: {
    subject?: string;
    topic?: string;
    difficulty?: string;
  };
  options?: Array<{ text: string; isCorrect?: boolean }>;
  explanation?: string;
}

interface Section {
  title: string;
  marksPerQuestion: number;
  instructions?: string;
  questionTypeKey?:
    | "objective"
    | "very_short"
    | "short"
    | "long"
    | "case_study";
  selectedQuestions: Question[];
  types?: string[]; // optional legacy filter support
}

// Blueprint-driven sections (A–E) per requirement
const BLUEPRINT_SECTIONS: Omit<Section, "selectedQuestions">[] = [
  {
    title: "Section A: Objective Type",
    marksPerQuestion: 1,
    questionTypeKey: "objective",
    instructions: "Multiple choice, fill in the blanks, true/false",
  },
  {
    title: "Section B: Very Short Answer Type",
    marksPerQuestion: 2,
    questionTypeKey: "very_short",
    instructions: "Answer in one or two sentences",
  },
  {
    title: "Section C: Short Answer Type",
    marksPerQuestion: 3,
    questionTypeKey: "short",
    instructions: "Answer in about 50–70 words",
  },
  {
    title: "Section D: Long Answer Type",
    marksPerQuestion: 5,
    questionTypeKey: "long",
    instructions: "Answer in 100–120 words or with derivation/diagram",
  },
  {
    title: "Section E: Application / HOTS / Case Study",
    marksPerQuestion: 6,
    questionTypeKey: "case_study",
    instructions: "Based on comprehension, data, or real-life scenarios",
  },
];

export default function PaperQuestionSelection({
  formData,
  updateFormData,
}: PaperQuestionSelectionProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0])
  );

  // Initialize sections using blueprint if not already done
  useEffect(() => {
    if (formData.sections.length === 0) {
      const initialSections = BLUEPRINT_SECTIONS.map((s) => ({
        ...s,
        selectedQuestions: [],
      }));
      updateFormData({ sections: initialSections });
    }
  }, [formData.sections.length, updateFormData]);

  // Compute blueprint question_type key from DB fields
  function computeQuestionTypeKey(q: Question): Section["questionTypeKey"] {
    const secRaw = (q as unknown as { section?: unknown }).section;
    const sec = typeof secRaw === "string" ? secRaw.toLowerCase() : "";
    const t = (q.type || "").toLowerCase();
    // Prefer explicit section label if present
    if (sec.includes("objective")) return "objective";
    if (sec.includes("very short")) return "very_short";
    if (sec.includes("short")) return "short";
    if (sec.includes("long")) return "long";
    if (
      sec.includes("case") ||
      sec.includes("hots") ||
      sec.includes("application")
    )
      return "case_study";

    // Fallback by underlying type
    if (["mcq", "truefalse", "fill", "integer", "assertionreason"].includes(t))
      return "objective";
    if (t === "long") return "long";
    if (t === "case_study" || t === "case" || t === "case-study")
      return "case_study";
    // Default
    return "short";
  }

  function isSelectedAnywhere(questionId: string) {
    return formData.sections.some((s) =>
      s.selectedQuestions.some((q) => q._id === questionId)
    );
  }

  function removeIfSelected(questionId: string) {
    if (!isSelectedAnywhere(questionId)) return;
    const newSections = formData.sections.map((s) => ({
      ...s,
      selectedQuestions: s.selectedQuestions.filter(
        (q) => q._id !== questionId
      ),
    }));
    updateFormData({ sections: newSections });
  }

  function toggleQuestionAuto(question: Question) {
    const already = isSelectedAnywhere(question._id);
    const key = computeQuestionTypeKey(question);
    const idx = formData.sections.findIndex((s) => s.questionTypeKey === key);
    if (idx === -1) return; // no matching section

    if (already) {
      removeIfSelected(question._id);
    } else {
      const newSections = formData.sections.map((s, i) =>
        i === idx
          ? { ...s, selectedQuestions: [...s.selectedQuestions, question] }
          : s
      );
      updateFormData({ sections: newSections });
    }
  }

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      // Require class for per-class collections
      if (!formData.className || !formData.className.trim()) {
        setQuestions([]);
        setLoading(false);
        return;
      }
      // If multiple chapters selected, fetch questions for all chapters
      if (formData.selectedChapters.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Fetch questions for all selected chapters
      const allQuestions: Question[] = [];

      for (const chapter of formData.selectedChapters) {
        const params = new URLSearchParams({
          subject: formData.subject,
          chapter: chapter,
          limit: "50", // Limit per chapter
          page: "1",
        });

        // Add class and board filters if available
        if (formData.className) {
          params.set("class", formData.className);
        }

        if (formData.board) {
          params.set("board", formData.board);
        }

        const response = (await apiFetch(
          `/api/exams/questions/for-paper?${params}`
        )) as { items?: Question[]; questions?: Question[] };

        const list = response.items || response.questions;
        if (list && Array.isArray(list)) {
          allQuestions.push(...list);
        }
      }

      // Remove duplicates by ID
      const uniqueQuestions = Array.from(
        new Map(allQuestions.map((q) => [q._id, q])).values()
      );

      setQuestions(uniqueQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [
    formData.subject,
    formData.className,
    formData.board,
    formData.selectedChapters,
  ]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  // Global filter for the master list
  const getGlobalFilteredQuestions = () => {
    return questions.filter((q) => {
      const searchMatch =
        searchQuery === "" ||
        q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags?.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof (q as unknown as { chapter?: unknown }).chapter === "string" &&
          (q as unknown as { chapter?: string })
            .chapter!.toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const chapterMatch =
        formData.selectedChapters.length === 0 ||
        (q.tags?.topic && formData.selectedChapters.includes(q.tags.topic)) ||
        (typeof (q as unknown as { chapter?: unknown }).chapter === "string" &&
          formData.selectedChapters.includes(
            (q as unknown as { chapter: string }).chapter
          ));

      return searchMatch && chapterMatch;
    });
  };

  const isQuestionSelected = (questionId: string, sectionIndex: number) => {
    return formData.sections[sectionIndex]?.selectedQuestions.some(
      (q) => q._id === questionId
    );
  };

  const toggleQuestionSelection = (
    question: Question,
    sectionIndex: number
  ) => {
    const section = formData.sections[sectionIndex];
    const isSelected = section.selectedQuestions.some(
      (q) => q._id === question._id
    );

    const newSections = [...formData.sections];
    if (isSelected) {
      newSections[sectionIndex] = {
        ...section,
        selectedQuestions: section.selectedQuestions.filter(
          (q) => q._id !== question._id
        ),
      };
    } else {
      newSections[sectionIndex] = {
        ...section,
        selectedQuestions: [...section.selectedQuestions, question],
      };
    }

    updateFormData({ sections: newSections });
  };

  const getFilteredQuestions = (sectionIndex: number) => {
    const section = formData.sections[sectionIndex];
    if (!section) return [];

    return questions.filter((q) => {
      const key = computeQuestionTypeKey(q);
      const inSection = section.questionTypeKey
        ? key === section.questionTypeKey
        : !section.types ||
          (section.types?.length ?? 0) === 0 ||
          section.types?.includes(q.type);

      const searchMatch =
        searchQuery === "" ||
        q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags?.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof (q as unknown as { chapter?: unknown }).chapter === "string" &&
          (q as unknown as { chapter?: string })
            .chapter!.toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const chapterMatch =
        formData.selectedChapters.length === 0 ||
        (q.tags?.topic && formData.selectedChapters.includes(q.tags.topic)) ||
        (typeof (q as unknown as { chapter?: unknown }).chapter === "string" &&
          formData.selectedChapters.includes(
            (q as unknown as { chapter: string }).chapter
          ));

      return inSection && searchMatch && chapterMatch;
    });
  };

  function sectionLabelForQuestion(q: Question) {
    const key = computeQuestionTypeKey(q);
    const sec = formData.sections.find((s) => s.questionTypeKey === key);
    return sec?.title || "Section";
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mcq: "Multiple Choice",
      truefalse: "True/False",
      short: "Short Answer",
      long: "Long Answer",
      fill: "Fill in the Blank",
    };
    return labels[type] || type;
  };

  const calculateTotalMarks = () => {
    return formData.sections.reduce((total, section) => {
      return (
        total + section.selectedQuestions.length * section.marksPerQuestion
      );
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading questions...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-xl font-bold text-emerald-900 mb-1">
          Select Questions
        </h2>
        <p className="text-sm text-gray-600">
          Choose questions and we’ll auto-place them into the correct sections.
        </p>
      </motion.div>

      {/* Summary Bar */}
      <Card className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-xs text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formData.sections.reduce(
                  (sum, s) => sum + s.selectedQuestions.length,
                  0
                )}
              </p>
            </div>
            <div className="h-10 w-px bg-emerald-300" />
            <div>
              <p className="text-xs text-gray-600">Total Marks</p>
              <p className="text-2xl font-bold text-green-600">
                {calculateTotalMarks()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Questions selected across all sections
            </p>
          </div>
        </div>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 placeholder:text-gray-400 transition-all"
        />
      </div>

      {/* Master list - auto placement */}
      <Card className="overflow-hidden border-2 border-emerald-300 shadow-md">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4 text-white">
          <h3 className="text-lg font-bold">All Questions</h3>
          <p className="text-xs text-emerald-50 mt-1">
            Tap to add — questions auto-place into the correct section
          </p>
        </div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto bg-gray-50">
          {getGlobalFilteredQuestions().map((q) => {
            const selected = isSelectedAnywhere(q._id);
            const dest = sectionLabelForQuestion(q);
            return (
              <motion.div
                key={q._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all ${
                  selected ? "border-emerald-500" : "border-gray-200"
                }`}
                onClick={() => toggleQuestionAuto(q)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {selected ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base leading-relaxed text-gray-800">
                        <MathText text={q.text} />
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                          → {dest}
                        </span>
                        <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                          {getTypeLabel(q.type)}
                        </span>
                        {q.tags?.difficulty && (
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full ${
                              q.tags.difficulty === "easy"
                                ? "bg-green-50 text-green-700"
                                : q.tags.difficulty === "medium"
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {q.tags.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {getGlobalFilteredQuestions().length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No questions match your filters</p>
            </div>
          )}
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        {formData.sections.map((section, sectionIndex) => {
          const filteredQuestions = getFilteredQuestions(sectionIndex);
          const isExpanded = expandedSections.has(sectionIndex);

          return (
            <Card
              key={sectionIndex}
              className="overflow-hidden border-2 border-emerald-300 shadow-md"
            >
              {/* Section Header */}
              <div
                onClick={() => toggleSection(sectionIndex)}
                className="p-4 bg-gradient-to-r from-emerald-600 to-green-600 cursor-pointer hover:from-emerald-700 hover:to-green-700 transition-colors text-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{section.title}</h3>
                    <p className="text-xs text-emerald-50 mt-1 line-clamp-2">
                      {section.instructions}
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full font-semibold">
                        ✓ {section.selectedQuestions.length} selected
                      </span>
                      <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        {filteredQuestions.length} available
                      </span>
                      <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full font-semibold">
                        {section.marksPerQuestion} marks
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6" />
                    ) : (
                      <ChevronDown className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto bg-gray-50">
                      {filteredQuestions.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500">
                            No questions available for this section
                          </p>
                        </div>
                      ) : (
                        filteredQuestions.map((question) => {
                          const isSelected = isQuestionSelected(
                            question._id,
                            sectionIndex
                          );

                          return (
                            <motion.div
                              key={question._id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all ${
                                isSelected
                                  ? "border-emerald-500"
                                  : "border-gray-200"
                              }`}
                              onClick={() =>
                                toggleQuestionSelection(question, sectionIndex)
                              }
                            >
                              <div className="p-4">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 mt-1">
                                    {isSelected ? (
                                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                    ) : (
                                      <Circle className="w-6 h-6 text-gray-300" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-base leading-relaxed text-gray-800">
                                      <MathText text={question.text} />
                                    </div>
                                    <div className="flex items-center space-x-2 mt-3 flex-wrap">
                                      <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                                        {getTypeLabel(question.type)}
                                      </span>
                                      {question.tags?.topic && (
                                        <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                                          {question.tags.topic}
                                        </span>
                                      )}
                                      {question.tags?.difficulty && (
                                        <span
                                          className={`text-xs px-2.5 py-1 rounded-full ${
                                            question.tags.difficulty === "easy"
                                              ? "bg-green-50 text-green-700"
                                              : question.tags.difficulty ===
                                                "medium"
                                              ? "bg-yellow-50 text-yellow-700"
                                              : "bg-red-50 text-red-700"
                                          }`}
                                        >
                                          {question.tags.difficulty}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3.5 bg-emerald-50 border-2 border-emerald-200 rounded-xl"
      >
        <p className="text-xs text-emerald-800">
          <strong className="font-semibold">Tip:</strong> Click on each section
          to expand and select questions. The paper preview in the next step
          will show proper formatting with numbering and marks.
        </p>
      </motion.div>
    </div>
  );
}
