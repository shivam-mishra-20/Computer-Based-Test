"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  XMarkIcon,
  CheckIcon,
  FunnelIcon,
  AcademicCapIcon,
  ClockIcon,
  DocumentTextIcon,
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

  // Questions
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [sections, setSections] = useState<ExamSection[]>([
    { title: "Section A", questionIds: [], marks: 0 },
  ]);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <AcademicCapIcon className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Create Exam</h1>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-4">
            {["Setup", "Select Questions", "Organize & Save"].map(
              (label, idx) => (
                <div key={idx} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step === ["setup", "select", "organize"][idx]
                        ? "bg-indigo-600 text-white"
                        : idx < ["setup", "select", "organize"].indexOf(step)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx < ["setup", "select", "organize"].indexOf(step)
                      ? "✓"
                      : idx + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {label}
                  </span>
                  {idx < 2 && <div className="w-12 h-0.5 bg-gray-300 mx-2" />}
                </div>
              )
            )}
          </div>

          {/* Summary */}
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5" />
              <span>
                {totalQuestions} Question{totalQuestions !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5" />
              <span>{totalDuration} mins</span>
            </div>
            <div className="font-semibold">Total Marks: {totalMarks}</div>
          </div>
        </div>

        {/* Step 1: Setup */}
        {step === "setup" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Exam Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g., Mid-Term Exam 2025"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class *
                </label>
                <select
                  value={examClass}
                  onChange={(e) => setExamClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                  Total Duration (minutes)
                </label>
                <input
                  type="number"
                  value={totalDuration}
                  onChange={(e) => setTotalDuration(Number(e.target.value))}
                  min="15"
                  max="300"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={() => setStep("select")}
              disabled={!examTitle.trim() || !examClass}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next: Select Questions
            </button>
          </motion.div>
        )}

        {/* Step 2: Select Questions */}
        {step === "select" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FunnelIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Filter Questions
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedChapter("");
                      setSelectedTopic("");
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chapter
                  </label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Available Questions ({availableQuestions.length})
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setSelectedQuestions(
                        new Set(availableQuestions.map((q) => q._id))
                      )
                    }
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setSelectedQuestions(new Set())}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading questions...
                </div>
              ) : availableQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No questions found. Try adjusting filters or generate
                  questions first.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableQuestions.map((q) => (
                    <div
                      key={q._id}
                      onClick={() => toggleQuestion(q._id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedQuestions.has(q._id)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            selectedQuestions.has(q._id)
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedQuestions.has(q._id) && (
                            <CheckIcon className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 mb-2">
                            <MathText text={q.text} />
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {q.type}
                            </span>
                            {q.marks && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                {q.marks} marks
                              </span>
                            )}
                            <span>{q.chapter || q.topic}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setStep("setup")}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {selectedQuestions.size} selected
                  </span>
                  <button
                    onClick={() => setStep("organize")}
                    disabled={
                      selectedQuestions.size === 0 && totalQuestions === 0
                    }
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next: Organize
                  </button>
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
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Organize Sections
            </h2>

            {sections.map((section, idx) => (
              <div
                key={idx}
                className="mb-6 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
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
                    className="text-lg font-semibold px-2 py-1 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none"
                  />
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {section.questionIds.length} questions • {section.marks}{" "}
                      marks
                    </span>
                    {sections.length > 1 && (
                      <button
                        onClick={() => removeSection(idx)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {section.questionIds.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No questions added
                  </div>
                ) : (
                  <div className="space-y-2">
                    {section.questionIds.map((qId, qIdx) => {
                      const q = availableQuestions.find((q) => q._id === qId);
                      if (!q) return null;
                      return (
                        <div
                          key={qId}
                          className="flex items-start space-x-3 p-3 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium text-gray-500 mt-0.5">
                            {qIdx + 1}.
                          </span>
                          <div className="flex-1 text-sm text-gray-700">
                            <MathText text={q.text} />
                          </div>
                          <button
                            onClick={() => removeFromSection(idx, qId)}
                            className="text-red-500 hover:text-red-600 flex-shrink-0"
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
                    className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add {selectedQuestions.size} selected question
                    {selectedQuestions.size !== 1 ? "s" : ""} to this section
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addSection}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 mb-6"
            >
              + Add Section
            </button>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("select")}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={createExam}
                disabled={saving || totalQuestions === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? "Creating..." : "Create Exam"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
