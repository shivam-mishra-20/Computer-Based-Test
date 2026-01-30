"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhotoIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import MathText from "@/components/ui/MathText";
import { notify } from "@/components/ui/toast";

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
  sectionDurationMins: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

interface Exam {
  _id: string;
  title: string;
  classLevel?: string;
  batch?: string;
  totalDurationMins?: number;
  sections?: ExamSection[];
}

interface FilterOptions {
  subjects: string[];
  chapters: string[];
  topics: string[];
  sections: string[];
}

export default function ExamBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;

  // Exam data
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Section management - always start with one default section
  const [sections, setSections] = useState<ExamSection[]>([
    { title: "Section A", questionIds: [], sectionDurationMins: 30 },
  ]);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  // Question bank
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    subjects: [],
    chapters: [],
    topics: [],
    sections: [],
  });

  // Image lightbox
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Assign state
  const [assignClass, setAssignClass] = useState("");
  const [assignBatch, setAssignBatch] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Print preview
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Load exam data
  useEffect(() => {
    async function loadExam() {
      try {
        // API returns exam directly, not wrapped in {success, data}
        const examData = (await apiFetch(`/exams/${examId}`)) as Exam;
        if (examData && examData._id) {
          setExam(examData);
          // Ensure at least one section exists
          const loadedSections = examData.sections && examData.sections.length > 0
            ? examData.sections
            : [{ title: "Section A", questionIds: [], sectionDurationMins: 30 }];
          setSections(loadedSections);
        }
      } catch (err) {
        console.error("Failed to load exam:", err);
      } finally {
        setLoading(false);
      }
    }
    if (examId) loadExam();
  }, [examId]);

  // Load filters when class changes
  useEffect(() => {
    async function loadFilters() {
      if (!selectedClass) return;
      try {
        const res = (await apiFetch(
          `/ai/questions/class/${selectedClass}/filters`
        )) as { success: boolean; data: FilterOptions };
        if (res.success) {
          setFilterOptions(res.data);
        }
      } catch (err) {
        console.error("Failed to load filters:", err);
      }
    }
    loadFilters();
    setSelectedSubject("");
    setSelectedChapter("");
    setSelectedTopic("");
  }, [selectedClass]);

  // Load questions when filters change
  useEffect(() => {
    async function loadQuestions() {
      if (!selectedClass) {
        setQuestions([]);
        return;
      }
      setQuestionsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "500" });
        if (selectedSubject) params.append("subject", selectedSubject);
        if (selectedChapter) params.append("chapter", selectedChapter);
        if (selectedTopic) params.append("topic", selectedTopic);

        const res = (await apiFetch(
          `/ai/questions/class/${selectedClass}?${params}`
        )) as { success: boolean; data: { questions: Question[] } };

        if (res.success) {
          setQuestions(res.data.questions || []);
        }
      } catch (err) {
        console.error("Failed to load questions:", err);
        setQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    }
    loadQuestions();
  }, [selectedClass, selectedSubject, selectedChapter, selectedTopic]);

  // Filter questions by search
  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.text.toLowerCase().includes(query) ||
      q.subject?.toLowerCase().includes(query) ||
      q.topic?.toLowerCase().includes(query)
    );
  });

  // Get all selected question IDs across all sections
  const allSelectedIds = new Set(sections.flatMap((s) => s.questionIds));

  // Section management functions
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: `Section ${String.fromCharCode(65 + prev.length)}`,
        questionIds: [],
        sectionDurationMins: 30,
      },
    ]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((_, i) => i !== index));
    if (expandedSection === index) {
      setExpandedSection(Math.max(0, index - 1));
    }
  };

  const updateSection = (index: number, updates: Partial<ExamSection>) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const addQuestionToSection = (sectionIndex: number, questionId: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex && !s.questionIds.includes(questionId)
          ? { ...s, questionIds: [...s.questionIds, questionId] }
          : s
      )
    );
  };

  const removeQuestionFromSection = (sectionIndex: number, questionId: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questionIds: s.questionIds.filter((id) => id !== questionId) }
          : s
      )
    );
  };

  const toggleQuestionInSection = (sectionIndex: number, questionId: string) => {
    const section = sections[sectionIndex];
    if (section.questionIds.includes(questionId)) {
      removeQuestionFromSection(sectionIndex, questionId);
    } else {
      addQuestionToSection(sectionIndex, questionId);
    }
  };

  // Save exam as draft
  const saveExam = async () => {
    if (!exam) return;
    setSaving(true);
    try {
      await apiFetch(`/exams/${examId}`, {
        method: "PUT",
        body: JSON.stringify({
          sections,
          totalDurationMins: sections.reduce(
            (sum, s) => sum + (s.sectionDurationMins || 0),
            0
          ),
        }),
      });
      notify.success("Draft saved successfully");
    } catch (err) {
      console.error("Failed to save:", err);
      notify.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  // Assign to class and batch
  const assignToClassBatch = async () => {
    if (!exam) return;
    if (!assignClass || !assignBatch) {
      notify.error("Select both Class and Batch");
      return;
    }
    setAssigning(true);
    try {
      // First save the sections
      await apiFetch(`/exams/${examId}`, {
        method: "PUT",
        body: JSON.stringify({
          sections,
          totalDurationMins: sections.reduce(
            (sum, s) => sum + (s.sectionDurationMins || 0),
            0
          ),
          classLevel: assignClass,
          batch: assignBatch,
          isPublished: true,
        }),
      });

      // Assign to groups
      const groups =
        assignBatch === "All Batches"
          ? [assignClass, "Lakshya", "Aadharshilla", "Basic", "Commerce"]
          : [assignClass, assignBatch];

      await apiFetch(`/exams/${examId}/assign`, {
        method: "POST",
        body: JSON.stringify({ groups }),
      });

      notify.success(
        assignBatch === "All Batches"
          ? "Assigned to entire class successfully"
          : "Assigned to class/batch successfully"
      );
      router.push("/dashboard/teacher?tab=exams");
    } catch (err) {
      console.error("Failed to assign:", err);
      notify.error("Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${url}`;
  };

  // Get all selected questions from all sections
  const getSelectedQuestions = () => {
    const selectedQuestions: Array<{ section: string; question: Question }> = [];
    sections.forEach((section) => {
      section.questionIds.forEach((qId) => {
        const q = questions.find((q) => q._id === qId);
        if (q) {
          selectedQuestions.push({ section: section.title, question: q });
        }
      });
    });
    return selectedQuestions;
  };

  // Print selected questions
  const handlePrint = () => {
    const selectedQuestions = getSelectedQuestions();
    if (selectedQuestions.length === 0) {
      notify.error("No questions selected to print");
      return;
    }
    setShowPrintPreview(true);
  };

  const totalQuestions = sections.reduce((sum, s) => sum + s.questionIds.length, 0);
  const totalDuration = sections.reduce((sum, s) => sum + (s.sectionDurationMins || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Exam not found</p>
          <button
            onClick={() => router.push("/dashboard/teacher?tab=exams")}
            className="text-emerald-600 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/teacher?tab=exams")}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="font-semibold text-gray-900">{exam.title}</h1>
                <p className="text-xs text-gray-500">
                  {totalQuestions} questions • {totalDuration} min
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={totalQuestions === 0}
                className="px-3 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5"
              >
                <PrinterIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={saveExam}
                disabled={saving}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-32">
        {/* Class Selection */}
        <div className="bg-white rounded-lg p-4 border">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Class for Questions
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-lg bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Choose a class (6-12)</option>
            {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Exam Sections</h2>
            <button
              onClick={addSection}
              className="flex items-center gap-1 text-sm text-emerald-600 font-medium hover:text-emerald-700"
            >
              <PlusIcon className="w-4 h-4" />
              Add Section
            </button>
          </div>

          {sections.map((section, sectionIdx) => (
            <div
              key={sectionIdx}
              className="bg-white rounded-xl border shadow-sm overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === sectionIdx ? null : sectionIdx)
                }
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateSection(sectionIdx, { title: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                    {section.questionIds.length} Q
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {sections.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSection(sectionIdx);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                  {expandedSection === sectionIdx ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {expandedSection === sectionIdx && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Duration & Options */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Duration:</span>
                          <input
                            type="number"
                            min={1}
                            value={section.sectionDurationMins}
                            onChange={(e) =>
                              updateSection(sectionIdx, {
                                sectionDurationMins: Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-1 border rounded text-center"
                          />
                          <span className="text-gray-500">min</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={section.shuffleQuestions}
                            onChange={(e) =>
                              updateSection(sectionIdx, {
                                shuffleQuestions: e.target.checked,
                              })
                            }
                            className="rounded text-emerald-600"
                          />
                          <span className="text-gray-600">Shuffle Questions</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={section.shuffleOptions}
                            onChange={(e) =>
                              updateSection(sectionIdx, {
                                shuffleOptions: e.target.checked,
                              })
                            }
                            className="rounded text-emerald-600"
                          />
                          <span className="text-gray-600">Shuffle Options</span>
                        </label>
                      </div>

                      {/* Selected Questions in Section */}
                      {section.questionIds.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Selected Questions
                          </p>
                          {section.questionIds.map((qId, idx) => {
                            const q = questions.find((q) => q._id === qId);
                            if (!q) return null;
                            return (
                              <div
                                key={qId}
                                className="flex gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100"
                              >
                                <span className="text-xs font-bold text-emerald-600 mt-0.5">
                                  {idx + 1}.
                                </span>
                                <div className="flex-1 text-sm">
                                  <MathText text={q.text} />
                                </div>
                                <button
                                  onClick={() =>
                                    removeQuestionFromSection(sectionIdx, qId)
                                  }
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed rounded-lg">
                          No questions added yet. Select questions below.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Question Bank */}
        {selectedClass && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
              <h3 className="font-semibold text-gray-900 mb-3">
                Question Bank (Class {selectedClass})
              </h3>

              {/* Search & Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 rounded-lg border flex items-center gap-1 ${
                    showFilters ? "bg-emerald-50 border-emerald-200" : ""
                  }`}
                >
                  <FunnelIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <select
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                          setSelectedChapter("");
                          setSelectedTopic("");
                        }}
                        className="px-2 py-1.5 border rounded text-sm"
                      >
                        <option value="">All Subjects</option>
                        {filterOptions.subjects.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedChapter}
                        onChange={(e) => {
                          setSelectedChapter(e.target.value);
                          setSelectedTopic("");
                        }}
                        disabled={!selectedSubject}
                        className="px-2 py-1.5 border rounded text-sm disabled:opacity-50"
                      >
                        <option value="">All Chapters</option>
                        {filterOptions.chapters.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        disabled={!selectedChapter}
                        className="px-2 py-1.5 border rounded text-sm disabled:opacity-50"
                      >
                        <option value="">All Topics</option>
                        {filterOptions.topics.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Questions List */}
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {questionsLoading ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading questions...
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No questions found
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isInAnySection = allSelectedIds.has(q._id);
                  const currentSection = expandedSection ?? 0;
                  const isInCurrentSection =
                    sections[currentSection]?.questionIds.includes(q._id);

                  return (
                    <div
                      key={q._id}
                      className={`p-4 ${
                        isInCurrentSection
                          ? "bg-emerald-50"
                          : isInAnySection
                          ? "bg-gray-50 opacity-60"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Add/Remove Button */}
                        <button
                          onClick={() =>
                            toggleQuestionInSection(currentSection, q._id)
                          }
                          disabled={isInAnySection && !isInCurrentSection}
                          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            isInCurrentSection
                              ? "bg-emerald-600 text-white"
                              : isInAnySection
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
                          }`}
                        >
                          {isInCurrentSection ? (
                            <CheckIcon className="w-5 h-5" />
                          ) : (
                            <PlusIcon className="w-5 h-5" />
                          )}
                        </button>

                        {/* Question Content */}
                        <div className="flex-1 min-w-0">
                          {/* Question Text */}
                          <div className="text-sm text-gray-900 leading-relaxed mb-2">
                            <MathText text={q.text} />
                          </div>

                          {/* MCQ Options */}
                          {q.options && q.options.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {q.options.map((opt, idx) => (
                                <div
                                  key={idx}
                                  className={`text-sm px-3 py-2 rounded-lg ${
                                    opt.isCorrect
                                      ? "bg-green-50 border border-green-200 text-green-800"
                                      : "bg-gray-50 border border-gray-100 text-gray-700"
                                  }`}
                                >
                                  <span className="font-semibold mr-2">
                                    {String.fromCharCode(65 + idx)}.
                                  </span>
                                  <MathText text={opt.text} inline />
                                  {opt.isCorrect && (
                                    <span className="ml-2 text-xs text-green-600 font-medium">
                                      ✓ Correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Diagram */}
                          {q.diagramUrl && (
                            <button
                              onClick={() => setViewingImage(getImageUrl(q.diagramUrl!))}
                              className="mb-3 inline-block"
                            >
                              <Image
                                src={getImageUrl(q.diagramUrl)}
                                alt="Diagram"
                                width={200}
                                height={150}
                                className="max-w-[200px] h-auto rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                                style={{ width: "auto", height: "auto" }}
                                unoptimized
                              />
                            </button>
                          )}

                          {/* Tags */}
                          <div className="flex gap-1.5 flex-wrap">
                            {q.subject && (
                              <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
                                {q.subject}
                              </span>
                            )}
                            {q.topic && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {q.topic}
                              </span>
                            )}
                            {q.difficulty && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  q.difficulty === "easy"
                                    ? "bg-green-50 text-green-600"
                                    : q.difficulty === "medium"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            )}
                            {q.diagramUrl && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1">
                                <PhotoIcon className="w-3 h-3" />
                                Image
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Assign & Publish Section */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-900 mb-2">
            Assign & Publish
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Publish this exam to a class
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={assignClass}
              onChange={(e) => setAssignClass(e.target.value)}
              className="flex-1 px-3 py-2.5 border rounded-lg bg-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select Class</option>
              {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
            <select
              value={assignBatch}
              onChange={(e) => setAssignBatch(e.target.value)}
              className="flex-1 px-3 py-2.5 border rounded-lg bg-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select Batch</option>
              <option value="All Batches">All Batches</option>
              {["Lakshya", "Aadharshilla", "Basic", "Commerce"].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <button
              onClick={assignToClassBatch}
              disabled={!assignClass || !assignBatch || assigning || totalQuestions === 0}
              className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors text-sm whitespace-nowrap"
            >
              {assigning ? "Publishing..." : "Publish Exam"}
            </button>
          </div>
          {totalQuestions === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Add at least one question to publish
            </p>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={viewingImage}
              alt="Diagram"
              className="max-w-full max-h-[90vh] rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div 
          id="print-modal-overlay"
          className="fixed inset-0 z-50 bg-black/60 overflow-auto"
        >
          {/* Toolbar - Fixed at top */}
          <div className="sticky top-0 z-10 bg-white shadow-md p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="font-bold text-gray-900 text-lg">Print Preview</h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  document.documentElement.classList.add('print-mode');
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => {
                      document.documentElement.classList.remove('print-mode');
                    }, 500);
                  }, 100);
                }}
                className="flex-1 sm:flex-none justify-center px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <PrinterIcon className="w-5 h-5" />
                Print Paper
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* A4 Paper Preview Container - Scaled for Mobile */}
          <div className="py-8 px-2 sm:px-4 flex justify-center bg-gray-100 min-h-screen print:bg-white print:p-0 print:m-0 print:min-h-0">
            <div 
              id="print-wrapper"
              className="transform origin-top scale-[0.45] sm:scale-[0.6] md:scale-[0.8] lg:scale-100 transition-transform duration-200 print:transform-none print:scale-100 print:m-0 print:p-0"
            >
              <div 
                id="print-content"
                className="bg-white shadow-2xl rounded-sm print:shadow-none print:rounded-none"
                style={{ 
                  width: '210mm', 
                  minHeight: '297mm', 
                  padding: '20mm',
                  fontFamily: 'Times New Roman, serif',
                  fontSize: '12pt',
                  lineHeight: '1.6',
                  color: '#1a1a1a',
                  margin: '0 auto'
                }}
              >
                {/* Paper Content (same as before) */}
                
                {/* Paper Header */}
                <div style={{ 
                  border: '3px double #333', 
                  padding: '20px', 
                  textAlign: 'center',
                  marginBottom: '24px'
                }}>
                  <h1 style={{ 
                    fontSize: '22pt', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {exam?.title}
                  </h1>
                  <div style={{
                    borderTop: '2px solid #047857',
                    borderBottom: '2px solid #047857',
                    padding: '10px 0',
                    margin: '12px 0'
                  }}>
                    <span style={{ fontSize: '11pt', color: '#444' }}>
                      <strong>Duration:</strong> {totalDuration} minutes &nbsp;&nbsp;|&nbsp;&nbsp;
                      <strong>Total Questions:</strong> {totalQuestions} &nbsp;&nbsp;|&nbsp;&nbsp;
                      <strong>Max Marks:</strong> {totalQuestions * 4}
                    </span>
                  </div>
                </div>

                {/* General Instructions */}
                <div style={{
                  border: '2px solid #666',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  backgroundColor: '#fafafa'
                }}>
                  <h3 style={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    fontSize: '12pt',
                    marginBottom: '10px',
                    textTransform: 'uppercase'
                  }}>
                    General Instructions
                  </h3>
                  <ul style={{ marginLeft: '20px', fontSize: '11pt' }}>
                    <li style={{ marginBottom: '6px' }}>Read all questions carefully before answering.</li>
                    <li style={{ marginBottom: '6px' }}>All questions are compulsory.</li>
                    <li style={{ marginBottom: '6px' }}>Write your answers neatly and legibly.</li>
                  </ul>
                </div>

                {/* Sections with Questions */}
                {sections.map((section, sectionIdx) => {
                  if (section.questionIds.length === 0) return null;
                  
                  let qNum = 1;
                  for (let i = 0; i < sectionIdx; i++) {
                    qNum += sections[i].questionIds.length;
                  }

                  return (
                    <div key={sectionIdx} style={{ marginBottom: '28px' }}>
                      {/* Section Header */}
                      <h2 style={{
                        textAlign: 'center',
                        fontSize: '14pt',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        borderBottom: '2px solid #333',
                        paddingBottom: '8px',
                        marginBottom: '16px',
                        letterSpacing: '0.5px'
                      }}>
                        {section.title}
                      </h2>

                      {/* Questions */}
                      <div>
                        {section.questionIds.map((qId, qIdx) => {
                          const q = questions.find((question) => question._id === qId);
                          if (!q) return null;

                          return (
                            <div 
                              key={qId} 
                              style={{ 
                                marginBottom: '20px',
                                pageBreakInside: 'avoid'
                              }}
                            >
                              {/* Question Row */}
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ 
                                  fontWeight: 'bold', 
                                  minWidth: '42px',
                                  flexShrink: 0
                                }}>
                                  Q{qNum + qIdx}.
                                </span>
                                <div style={{ flex: 1 }}>
                                  {/* Question Text */}
                                  <div style={{ marginBottom: '8px' }}>
                                    <MathText text={q.text} />
                                  </div>

                                  {/* MCQ Options */}
                                  {q.options && q.options.length > 0 && (
                                    <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                                      {q.options.map((opt, optIdx) => (
                                        <div 
                                          key={optIdx} 
                                          style={{ 
                                            marginBottom: '4px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px'
                                          }}
                                        >
                                          <span style={{ fontWeight: '600' }}>
                                            ({String.fromCharCode(97 + optIdx)})
                                          </span>
                                          <span>
                                            <MathText text={opt.text} inline />
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Diagram Image */}
                                  {q.diagramUrl && (
                                    <div style={{ 
                                      marginTop: '12px', 
                                      marginLeft: '16px',
                                      pageBreakInside: 'avoid'
                                    }}>
                                      <Image
                                        src={getImageUrl(q.diagramUrl)}
                                        alt="Diagram"
                                        width={200}
                                        height={150}
                                        style={{
                                          maxWidth: '200px',
                                          maxHeight: '150px',
                                          objectFit: 'contain',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          padding: '4px',
                                          backgroundColor: '#fff',
                                          width: "auto",
                                          height: "auto"
                                        }}
                                        unoptimized
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Footer */}
                <div style={{
                  borderTop: '2px solid #333',
                  paddingTop: '16px',
                  marginTop: '32px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                    *** End of Question Paper ***
                  </p>
                  <p style={{ fontStyle: 'italic', marginTop: '8px', color: '#666' }}>
                    Best of Luck!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide all content by default when in print-mode */
          html.print-mode body * {
            visibility: hidden;
          }

          /* Show only the print content and its wrappers */
          html.print-mode #print-content,
          html.print-mode #print-content *,
          html.print-mode #print-wrapper,
          html.print-mode #print-modal-overlay,
          html.print-mode .print-visible {
            visibility: visible !important;
          }

          /* Force modal overlay to be static document body */
          html.print-mode #print-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            overflow: visible !important;
            z-index: 9999 !important;
            display: block !important;
          }

          /* Reset wrapper positioning for print */
          html.print-mode #print-wrapper {
            transform: none !important;
            width: 100% !important;
            height: auto !important;
            position: static !important; /* Changed from absolute */
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          
          /* Ensure print content takes full width */
          html.print-mode #print-content {
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important; /* Keep padding for the content spacing */
            box-shadow: none !important;
            border: none !important;
            display: block !important;
          }

          html.print-mode {
            height: auto !important;
            overflow: visible !important;
          }

          html.print-mode body {
            height: auto !important;
            overflow: visible !important;
          }

          @page {
            size: A4;
            margin: 0; /* Let duplicate margin be handled by padding */
          }

          /* Ensure images print */
          img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
