"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import MathText from "@/components/ui/MathText";
import { Skeleton } from "@/components/ui/skeleton";

interface Question {
  _id: string;
  text: string;
  type: string;
  subject: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  diagramUrl?: string;
  options?: Array<{ text: string; isCorrect?: boolean }>;
}

interface FilterOptions {
  subjects: string[];
  chapters: string[];
  topics: string[];
}

interface Props {
  classLevel: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  // For the "X Questions, Y Marks" summary — omit to hide the marks figure.
  marksPerQuestion?: number;
}

const getImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${url}`;
};

// Consolidates what used to be three independent copies of the same
// filter+search+select question-bank UI (CreateExamFlow step 2, and the
// near-identical teacher/admin build pages' inline "Question Bank" section).
// One implementation, one set of API calls, used by both builders' Questions
// step.
export default function QuestionBankPicker({ classLevel, selectedIds, onChange, marksPerQuestion }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ subjects: [], chapters: [], topics: [] });
  const [filtersLoading, setFiltersLoading] = useState(false);

  // Filters (subjects always, chapters/topics narrowed by subject) — loaded
  // once per class/subject change, not on every keystroke.
  useEffect(() => {
    if (!classLevel) return;
    let cancelled = false;
    setFiltersLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedSubject) params.append("subject", selectedSubject);
        const res = (await apiFetch(`/ai/questions/class/${classLevel}/filters?${params}`)) as {
          success: boolean;
          data: FilterOptions;
        };
        if (!cancelled && res.success) setFilterOptions(res.data);
      } catch (err) {
        console.error("Failed to load filters:", err);
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classLevel, selectedSubject]);

  useEffect(() => {
    setSelectedChapter("");
    setSelectedTopic("");
  }, [selectedSubject]);
  useEffect(() => {
    setSelectedTopic("");
  }, [selectedChapter]);

  useEffect(() => {
    if (!classLevel) {
      setQuestions([]);
      return;
    }
    let cancelled = false;
    setQuestionsLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ limit: "500" });
        if (selectedSubject) params.append("subject", selectedSubject);
        if (selectedChapter) params.append("chapter", selectedChapter);
        if (selectedTopic) params.append("topic", selectedTopic);
        const res = (await apiFetch(`/ai/questions/class/${classLevel}?${params}`)) as {
          success: boolean;
          data: { questions: Question[] };
        };
        if (!cancelled) setQuestions(res.success ? res.data.questions || [] : []);
      } catch (err) {
        console.error("Failed to load questions:", err);
        if (!cancelled) setQuestions([]);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classLevel, selectedSubject, selectedChapter, selectedTopic]);

  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.text.toLowerCase().includes(query) ||
      q.subject?.toLowerCase().includes(query) ||
      q.chapter?.toLowerCase().includes(query) ||
      q.topic?.toLowerCase().includes(query)
    );
  });

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };
  const selectAllVisible = () => {
    const ids = filteredQuestions.map((q) => q._id);
    onChange([...new Set([...selectedIds, ...ids])]);
  };
  const clearAll = () => onChange([]);

  const activeFilterCount = [selectedSubject, selectedChapter, selectedTopic].filter(Boolean).length;

  if (!classLevel) {
    return (
      <div className="py-8 text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-sm font-medium">Set the exam&apos;s class first to load its question bank.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sticky summary */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <div className="text-sm font-semibold text-emerald-800">
          {selectedIds.length} {selectedIds.length === 1 ? "Question" : "Questions"}
          {typeof marksPerQuestion === "number" && (
            <span className="text-emerald-600 font-normal"> · {selectedIds.length * marksPerQuestion} Marks</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button onClick={selectAllVisible} disabled={filteredQuestions.length === 0} className="text-emerald-700 font-medium disabled:opacity-50">
            Select All ({filteredQuestions.length})
          </button>
          <button onClick={clearAll} disabled={selectedIds.length === 0} className="text-red-600 font-medium disabled:opacity-50">
            Clear
          </button>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-1.5 whitespace-nowrap ${
            activeFilterCount > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          {filtersLoading && <span className="text-gray-400">…</span>}
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="px-2 py-1.5 border rounded text-sm bg-white">
            <option value="">All Subjects</option>
            {filterOptions.subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            disabled={!selectedSubject}
            className="px-2 py-1.5 border rounded text-sm bg-white disabled:opacity-50"
          >
            <option value="">All Chapters</option>
            {filterOptions.chapters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            disabled={!selectedChapter}
            className="px-2 py-1.5 border rounded text-sm bg-white disabled:opacity-50"
          >
            <option value="">All Topics</option>
            {filterOptions.topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Question list */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {questionsLoading ? (
          <div className="p-3 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-4 h-4 mt-1 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <p className="text-sm font-medium">No questions found</p>
            <p className="text-xs mt-1">
              {activeFilterCount > 0 || searchQuery
                ? "Try clearing filters or search."
                : "This class has no questions in the bank yet."}
            </p>
            {(activeFilterCount > 0 || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedSubject("");
                  setSelectedChapter("");
                  setSelectedTopic("");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y max-h-[55vh] overflow-y-auto">
            {filteredQuestions.map((q) => {
              const isSelected = selectedIds.includes(q._id);
              return (
                <label key={q._id} className={`flex gap-3 p-3 cursor-pointer transition-colors ${isSelected ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(q._id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 leading-relaxed">
                      <MathText text={q.text} />
                    </div>
                    {q.diagramUrl && (
                      <button type="button" onClick={() => setViewingImage(getImageUrl(q.diagramUrl!))} className="mt-2 inline-block">
                        <Image src={getImageUrl(q.diagramUrl)} alt="Diagram" width={160} height={110} className="max-w-[160px] h-auto rounded border" sizes="160px" />
                      </button>
                    )}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {q.subject && <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{q.subject}</span>}
                      {q.topic && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{q.topic}</span>}
                      {q.difficulty && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            q.difficulty === "easy" ? "text-green-600 bg-green-50" : q.difficulty === "medium" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewingImage} alt="Diagram" className="max-w-full max-h-[90vh] rounded-xl" />
        </div>
      )}
    </div>
  );
}
