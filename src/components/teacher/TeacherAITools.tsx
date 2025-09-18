"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../lib/api";

interface GenQuestion {
  _id?: string;
  text: string;
  type: string;
  tags?: { subject?: string; topic?: string; difficulty?: string };
  options?: { text: string; isCorrect?: boolean }[];
  integerAnswer?: number;
  assertion?: string;
  reason?: string;
  assertionIsTrue?: boolean;
  reasonIsTrue?: boolean;
  reasonExplainsAssertion?: boolean;
  explanation?: string;
}

interface PaperSectionBlueprint {
  title: string;
  instructions: string;
  marksPerQuestion: number;
  questionCounts: Record<string, number>; // per type
  difficultyDistribution: { easy: number; medium: number; hard: number };
}

interface GeneratedPaperSection extends PaperSectionBlueprint {
  questions: GenQuestion[];
}

interface GeneratedPaperResult {
  examTitle: string;
  subject?: string;
  totalMarks: number;
  generalInstructions: string[];
  sections: GeneratedPaperSection[];
}

const ALL_TYPES = [
  "mcq",
  "truefalse",
  "fill",
  "short",
  "long",
  "assertionreason",
  "integer",
];

export default function TeacherAITools() {
  const [tab, setTab] = useState<"generate" | "paper">("generate");
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GenQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    subject: "",
    topic: "",
    difficulty: "medium",
    count: 10,
    types: [...ALL_TYPES],
  });
  const [refiningIdx, setRefiningIdx] = useState<number | null>(null);

  // Paper blueprint state
  const [paperBlueprint, setPaperBlueprint] = useState({
    examTitle: "Sample Practice Paper",
    subject: "",
    generalInstructions: [
      "All questions are compulsory.",
      "Use only blue or black ink.",
    ],
    sections: [
      {
        title: "Section A",
        instructions: "Single correct MCQs",
        marksPerQuestion: 4,
        questionCounts: { mcq: 5 },
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      },
    ] as PaperSectionBlueprint[],
  });
  const [paperSource, setPaperSource] = useState("");
  const [paperPdfFile, setPaperPdfFile] = useState<File | null>(null);
  const [paperInputMode, setPaperInputMode] = useState<"text" | "pdf">("text");
  const [paperLoading, setPaperLoading] = useState(false);
  const [paperResult, setPaperResult] = useState<GeneratedPaperResult | null>(
    null
  );
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  // Blueprint persistence
  interface SavedBlueprint {
    _id: string;
    name?: string;
    examTitle?: string;
    subject?: string;
    generalInstructions?: string[];
    sections?: PaperSectionBlueprint[];
  }
  const [blueprints, setBlueprints] = useState<SavedBlueprint[]>([]);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [savingBlueprint, setSavingBlueprint] = useState(false);
  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [newBlueprintName, setNewBlueprintName] = useState("");
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(
    null
  );

  // Create exam modal state
  const [createExamOpen, setCreateExamOpen] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [batch, setBatch] = useState("");
  // Timer for exam duration (minutes)
  const [timerMins, setTimerMins] = useState<string>("60");
  const [autoPublish, setAutoPublish] = useState(true);
  const [creatingExam, setCreatingExam] = useState(false);

  // Question bank exam creation (simplified) state
  const [bankExamOpen, setBankExamOpen] = useState(false);
  const [bankSelectedQuestions, setBankSelectedQuestions] = useState<string[]>(
    []
  );
  const [bankExamTitle, setBankExamTitle] = useState("Question Bank Exam");
  const [bankTimerMins, setBankTimerMins] = useState<string>("60");
  const [bankExamCreating, setBankExamCreating] = useState(false);

  // Create exam from generated questions state
  const [genExamOpen, setGenExamOpen] = useState(false);
  const [genExamTitle, setGenExamTitle] = useState("Generated Exam");
  const [genTimerMins, setGenTimerMins] = useState<string>("60");
  const [genExamCreating, setGenExamCreating] = useState(false);

  // Load blueprints list
  const loadBlueprints = useCallback(async () => {
    setLoadingBlueprints(true);
    try {
      const data = (await apiFetch("/api/exams/blueprints")) as {
        items: SavedBlueprint[];
      };
      setBlueprints(data.items || []);
    } catch {
      setBlueprints([]);
    } finally {
      setLoadingBlueprints(false);
    }
  }, []);

  useEffect(() => {
    if (blueprintModalOpen) loadBlueprints();
  }, [blueprintModalOpen, loadBlueprints]);

  function openBlueprintModal() {
    setBlueprintModalOpen(true);
  }

  async function saveCurrentBlueprint() {
    if (!paperBlueprint.examTitle.trim()) {
      alert("Blueprint needs an exam title");
      return;
    }
    setSavingBlueprint(true);
    try {
      const payload = {
        name: newBlueprintName || paperBlueprint.examTitle,
        examTitle: paperBlueprint.examTitle,
        subject: paperBlueprint.subject,
        generalInstructions: paperBlueprint.generalInstructions,
        sections: paperBlueprint.sections,
      };
      await apiFetch("/api/exams/blueprints", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setNewBlueprintName("");
      await loadBlueprints();
      alert("Blueprint saved");
    } catch {
      alert("Save failed");
    } finally {
      setSavingBlueprint(false);
    }
  }

  function applyBlueprint(bp: SavedBlueprint) {
    setPaperBlueprint({
      examTitle: bp.examTitle || bp.name || "Exam",
      subject: bp.subject || "",
      generalInstructions: bp.generalInstructions || [],
      sections: bp.sections || [],
    });
    setSelectedBlueprintId(bp._id);
    setBlueprintModalOpen(false);
  }

  async function deleteBlueprint(id: string) {
    if (!confirm("Delete blueprint?")) return;
    try {
      await apiFetch(`/api/exams/blueprints/${id}`, { method: "DELETE" });
      await loadBlueprints();
    } catch {
      /* ignore */
    }
  }

  function openCreateExam() {
    if (!paperResult) return;
    setExamTitle(paperResult.examTitle);
    setCreateExamOpen(true);
  }

  async function createExamFromPaper() {
    if (!paperResult) return;
    setCreatingExam(true);
    try {
      const options = {
        classLevel: classLevel || undefined,
        batch: batch || undefined,
        autoPublish,
        totalDurationMins: timerMins ? Number(timerMins) : undefined,
        blueprintId: selectedBlueprintId || undefined,
      };
      const payload = {
        paper: {
          ...paperResult,
          examTitle: examTitle || paperResult.examTitle,
        },
        options,
      };
      await apiFetch("/api/exams/from-paper", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert("Exam created from paper");
      setCreateExamOpen(false);
    } catch {
      alert("Creation failed");
    } finally {
      setCreatingExam(false);
    }
  }

  // Question bank exam creation simple flow
  interface BankQuestion {
    _id: string;
    text: string;
    tags?: { subject?: string; topic?: string; difficulty?: string };
  }
  const [bankQuestionsList, setBankQuestionsList] = useState<BankQuestion[]>(
    []
  );
  const [bankLoading, setBankLoading] = useState(false);
  const loadBankQuestions = useCallback(async () => {
    setBankLoading(true);
    try {
      const data = (await apiFetch("/api/exams/questions?limit=200")) as {
        items: BankQuestion[];
      };
      setBankQuestionsList(data.items || []);
    } catch {
      setBankQuestionsList([]);
    } finally {
      setBankLoading(false);
    }
  }, []);
  useEffect(() => {
    if (bankExamOpen) loadBankQuestions();
  }, [bankExamOpen, loadBankQuestions]);

  async function createExamFromBank() {
    if (!bankSelectedQuestions.length) {
      alert("Select at least one question");
      return;
    }
    setBankExamCreating(true);
    try {
      await apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: bankExamTitle,
          description: "Created from question bank selection",
          sections: [
            {
              title: "Section 1",
              questionIds: bankSelectedQuestions,
              shuffleQuestions: false,
              shuffleOptions: false,
            },
          ],
          isPublished: autoPublish,
          classLevel: classLevel || undefined,
          batch: batch || undefined,
          totalDurationMins: bankTimerMins ? Number(bankTimerMins) : undefined,
        }),
      });
      alert("Exam created from question bank");
      setBankExamOpen(false);
    } catch {
      alert("Create failed");
    } finally {
      setBankExamCreating(false);
    }
  }

  function toggleType(t: string) {
    setMeta((m) => {
      const exists = m.types.includes(t);
      return {
        ...m,
        types: exists ? m.types.filter((x) => x !== t) : [...m.types, t],
      };
    });
  }

  async function generateFromText() {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch("/api/ai/generate/text", {
        method: "POST",
        body: JSON.stringify({ text, ...meta, types: meta.types }),
      })) as { items?: GenQuestion[] };
      setItems(res.items || []);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateFromPdf() {
    if (!file) {
      setError("Select PDF");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("pdf", file);
      Object.entries(meta).forEach(([k, v]) => {
        if (k === "types") form.append("types", (v as string[]).join(","));
        else form.append(k, String(v));
      });
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
      const res = await fetch(base + "/api/ai/generate/pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: form,
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems(data.items || []);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "text") generateFromText();
    else generateFromPdf();
  }

  async function addToBank(indices: number[]) {
    const toAdd = indices.map((i) => items[i]).filter(Boolean);
    if (!toAdd.length) return;
    let ok = 0;
    for (const q of toAdd) {
      try {
        await apiFetch("/api/exams/questions", {
          method: "POST",
          body: JSON.stringify({
            text: q.text,
            type: q.type || "mcq",
            assertion: q.assertion,
            reason: q.reason,
            assertionIsTrue: q.assertionIsTrue,
            reasonIsTrue: q.reasonIsTrue,
            reasonExplainsAssertion: q.reasonExplainsAssertion,
            integerAnswer: q.integerAnswer,
            tags: {
              subject: meta.subject || q.tags?.subject,
              topic: meta.topic || q.tags?.topic,
              difficulty: meta.difficulty || q.tags?.difficulty,
            },
            options: q.options,
            correctAnswerText:
              q.integerAnswer !== undefined
                ? String(q.integerAnswer)
                : undefined,
            explanation: q.explanation,
          }),
        });
        ok++;
      } catch {
        // continue
      }
    }
    // simple feedback (could use toast)
    alert(`Added ${ok}/${toAdd.length} questions to bank`);
  }

  function toggle(idx: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(idx)) n.delete(idx);
      else n.add(idx);
      return n;
    });
  }

  function allSelected() {
    return items.length > 0 && selected.size === items.length;
  }

  function toggleAll() {
    if (allSelected()) setSelected(new Set());
    else setSelected(new Set(items.map((_, i) => i)));
  }

  async function refine(idx: number) {
    const q = items[idx];
    if (!q) return;
    setRefiningIdx(idx);
    try {
      const refined = (await apiFetch("/api/ai/refine", {
        method: "POST",
        body: JSON.stringify({
          question: q,
          notes: "Improve clarity",
          desiredDifficulty: meta.difficulty,
        }),
      })) as GenQuestion;
      setItems((arr) =>
        arr.map((it, i) => (i === idx ? { ...it, ...refined } : it))
      );
    } catch {
      // ignore
    } finally {
      setRefiningIdx(null);
    }
  }

  // Create Exam from Generated Questions (selected)
  async function createExamFromGenerated() {
    const indices = [...selected];
    if (!indices.length) {
      alert("Select questions to create an exam");
      return;
    }
    setGenExamCreating(true);
    try {
      // 1) Create questions in bank to obtain IDs
      const createdIds: string[] = [];
      for (const i of indices) {
        const q = items[i];
        if (!q) continue;
        try {
          const created = (await apiFetch("/api/exams/questions", {
            method: "POST",
            body: JSON.stringify({
              text: q.text,
              type: q.type || "mcq",
              assertion: q.assertion,
              reason: q.reason,
              assertionIsTrue: q.assertionIsTrue,
              reasonIsTrue: q.reasonIsTrue,
              reasonExplainsAssertion: q.reasonExplainsAssertion,
              integerAnswer: q.integerAnswer,
              tags: {
                subject: meta.subject || q.tags?.subject,
                topic: meta.topic || q.tags?.topic,
                difficulty: meta.difficulty || q.tags?.difficulty,
              },
              options: q.options,
              correctAnswerText:
                q.integerAnswer !== undefined
                  ? String(q.integerAnswer)
                  : undefined,
              explanation: q.explanation,
            }),
          })) as { _id?: string };
          if (created && created._id) createdIds.push(created._id);
        } catch {
          // skip failed question
        }
      }
      if (!createdIds.length) throw new Error("No questions created");
      // 2) Create the exam
      await apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: genExamTitle,
          description: "Created from AI generated questions",
          sections: [
            {
              title: "Section 1",
              questionIds: createdIds,
              shuffleQuestions: false,
              shuffleOptions: false,
            },
          ],
          isPublished: autoPublish,
          totalDurationMins: genTimerMins ? Number(genTimerMins) : undefined,
          classLevel: classLevel || undefined,
          batch: batch || undefined,
        }),
      });
      alert("Exam created from generated questions");
      setGenExamOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create exam");
    } finally {
      setGenExamCreating(false);
    }
  }

  // Paper blueprint editing helpers
  function updateSection(index: number, patch: Partial<PaperSectionBlueprint>) {
    setPaperBlueprint((pb) => {
      const sections = pb.sections.map((s, i) =>
        i === index ? { ...s, ...patch } : s
      );
      return { ...pb, sections };
    });
  }
  function addSection() {
    setPaperBlueprint((pb) => ({
      ...pb,
      sections: [
        ...pb.sections,
        {
          title: `Section ${String.fromCharCode(65 + pb.sections.length)}`,
          instructions: "",
          marksPerQuestion: 1,
          questionCounts: { mcq: 2 },
          difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        },
      ],
    }));
  }
  function removeSection(i: number) {
    setPaperBlueprint((pb) => ({
      ...pb,
      sections: pb.sections.filter((_, idx) => idx !== i),
    }));
  }

  function updateQuestionCount(
    sectionIdx: number,
    type: string,
    value: number
  ) {
    updateSection(sectionIdx, {
      questionCounts: {
        ...paperBlueprint.sections[sectionIdx].questionCounts,
        [type]: value,
      },
    });
  }
  function updateDifficulty(
    sectionIdx: number,
    key: keyof PaperSectionBlueprint["difficultyDistribution"],
    value: number
  ) {
    updateSection(sectionIdx, {
      difficultyDistribution: {
        ...paperBlueprint.sections[sectionIdx].difficultyDistribution,
        [key]: value,
      },
    });
  }

  async function generatePaper() {
    setPaperLoading(true);
    try {
      if (paperInputMode === "text") {
        if (!paperSource || paperSource.trim().length < 100) {
          alert("Provide at least 100 chars of source text");
          setPaperLoading(false);
          return;
        }
        const res = (await apiFetch("/api/ai/generate/paper", {
          method: "POST",
          body: JSON.stringify({
            sourceText: paperSource,
            blueprint: paperBlueprint,
          }),
        })) as GeneratedPaperResult;
        setPaperResult(res);
      } else {
        if (!paperPdfFile) {
          alert("Select PDF");
          setPaperLoading(false);
          return;
        }
        const form = new FormData();
        form.append("file", paperPdfFile);
        form.append("blueprint", JSON.stringify(paperBlueprint));
        const base =
          process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
        const res = await fetch(base + "/api/ai/generate/paper-pdf", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("accessToken") || ""
            }`,
          },
          body: form,
        });
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as GeneratedPaperResult;
        setPaperResult(data);
      }
    } catch {
      alert("Paper generation failed");
    } finally {
      setPaperLoading(false);
    }
  }

  function printablePaper() {
    if (!paperResult) return null;
    return (
      <div className="p-6 text-[13px] leading-relaxed max-w-4xl mx-auto">
        <h1 className="text-center text-xl font-semibold mb-1">
          {paperResult.examTitle}
        </h1>
        {paperResult.subject && (
          <div className="text-center mb-2 font-medium">
            Subject: {paperResult.subject}
          </div>
        )}
        <ol className="text-xs mb-4 list-decimal pl-5 space-y-0.5">
          {paperResult.generalInstructions.map((ins, i) => (
            <li key={i}>{ins}</li>
          ))}
        </ol>
        {paperResult.sections.map((sec, si) => (
          <div key={si} className="mb-6">
            <h2 className="font-semibold mb-1">
              {sec.title}{" "}
              {sec.instructions && (
                <span className="text-gray-500 font-normal">
                  - {sec.instructions}
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {sec.questions.map((q, qi) => (
                <div key={qi} className="border-b pb-2">
                  <div className="font-medium mb-1">
                    {qi + 1}. {q.text}
                  </div>
                  {q.type === "assertionreason" && (
                    <div className="ml-4 text-xs text-gray-600 space-y-1">
                      {q.assertion && (
                        <div>
                          <strong>Assertion:</strong> {q.assertion}
                        </div>
                      )}
                      {q.reason && (
                        <div>
                          <strong>Reason:</strong> {q.reason}
                        </div>
                      )}
                    </div>
                  )}
                  {q.type === "mcq" && q.options && (
                    <ol className="ml-5 list-[upper-alpha] space-y-0.5 text-xs">
                      {q.options.map((o, oi) => (
                        <li key={oi}>{o.text}</li>
                      ))}
                    </ol>
                  )}
                  {q.type === "integer" && q.integerAnswer !== undefined && (
                    <div className="text-xs text-gray-600 ml-2">
                      (Integer answer)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function handlePrint() {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
      setShowPrintPreview(false);
    }, 100);
  }

  return (
    <div>
      <div className="flex gap-4 mb-4 border-b">
        <button
          onClick={() => setTab("generate")}
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${
            tab === "generate"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500"
          }`}
        >
          Generate Questions
        </button>
        <button
          onClick={() => setTab("paper")}
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${
            tab === "paper"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500"
          }`}
        >
          Paper Generator
        </button>
      </div>

      {tab === "generate" && (
        <div>
          <form
            onSubmit={onSubmit}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3 max-w-xl"
          >
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex gap-3">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="mode"
                    value="pdf"
                    checked={mode === "pdf"}
                    onChange={() => setMode("pdf")}
                  />{" "}
                  PDF
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="mode"
                    value="text"
                    checked={mode === "text"}
                    onChange={() => setMode("text")}
                  />{" "}
                  Text
                </label>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {ALL_TYPES.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-1 bg-gray-50 border px-2 py-0.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={meta.types.includes(t)}
                      onChange={() => toggleType(t)}
                    />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            {mode === "pdf" ? (
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste source text (>= 50 chars)"
                className="w-full border rounded-md p-2 text-sm h-32"
              />
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <input
                placeholder="Subject"
                value={meta.subject}
                onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
                className="border rounded-md px-2 py-1"
              />
              <input
                placeholder="Topic"
                value={meta.topic}
                onChange={(e) => setMeta({ ...meta, topic: e.target.value })}
                className="border rounded-md px-2 py-1"
              />
              <select
                value={meta.difficulty}
                onChange={(e) =>
                  setMeta({ ...meta, difficulty: e.target.value })
                }
                className="border rounded-md px-2 py-1"
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
              <input
                type="number"
                min={1}
                max={50}
                value={meta.count}
                onChange={(e) =>
                  setMeta({ ...meta, count: Number(e.target.value) })
                }
                className="border rounded-md px-2 py-1"
              />
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button
              disabled={loading}
              className="px-4 py-2 rounded-md bg-primary text-white text-sm disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </form>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                Generated Questions ({items.length})
              </h3>
              {items.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => addToBank([...selected])}
                    disabled={!selected.size}
                    className="text-xs px-3 py-1 rounded-md border disabled:opacity-40"
                  >
                    Add Selected ({selected.size})
                  </button>
                  <button
                    onClick={() => addToBank(items.map((_, i) => i))}
                    className="text-xs px-3 py-1 rounded-md border"
                  >
                    Add All
                  </button>
                  <button
                    onClick={() => {
                      setGenExamTitle(
                        items.length
                          ? `AI Exam (${items.length} Qs)`
                          : "AI Exam"
                      );
                      setGenExamOpen(true);
                    }}
                    disabled={!selected.size}
                    className="text-xs px-3 py-1 rounded-md border bg-primary text-white disabled:opacity-40"
                    title="Create an exam from the selected questions"
                  >
                    Create Exam
                  </button>
                </div>
              )}
            </div>
            <div className="border rounded-md divide-y">
              {items.length > 0 && (
                <label className="flex items-center gap-2 p-2 text-[11px] font-medium bg-gray-50">
                  <input
                    type="checkbox"
                    checked={allSelected()}
                    onChange={toggleAll}
                  />
                  Select All
                </label>
              )}
              {items.map((q, i) => (
                <div key={i} className="p-3 text-xs space-y-1">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium mb-1 flex flex-wrap gap-2">
                        <span>
                          {i + 1}. {q.text}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded capitalize text-[10px]">
                          {q.type}
                        </span>
                      </div>
                      {q.type === "assertionreason" && (
                        <div className="ml-3 text-[11px] text-gray-600 space-y-0.5">
                          {q.assertion && (
                            <div>
                              <strong>A:</strong> {q.assertion}
                            </div>
                          )}
                          {q.reason && (
                            <div>
                              <strong>R:</strong> {q.reason}
                            </div>
                          )}
                        </div>
                      )}
                      {q.type === "mcq" && q.options && (
                        <ol className="ml-5 list-[upper-alpha] space-y-0.5">
                          {q.options.map((o, oi) => (
                            <li key={oi}>{o.text}</li>
                          ))}
                        </ol>
                      )}
                      {q.type === "integer" &&
                        q.integerAnswer !== undefined && (
                          <div className="ml-3 text-[11px] text-gray-600">
                            (Integer answer expected)
                          </div>
                        )}
                      <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          {q.tags?.subject || meta.subject || "-"}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          {q.tags?.topic || meta.topic || "-"}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">
                          {q.tags?.difficulty || meta.difficulty || "-"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => refine(i)}
                      disabled={refiningIdx === i}
                      className="text-[10px] px-2 py-1 border rounded disabled:opacity-50"
                    >
                      {refiningIdx === i ? "Refining..." : "Refine"}
                    </button>
                  </div>
                </div>
              ))}
              {!items.length && !loading && (
                <div className="text-xs text-gray-400 p-3">None yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "paper" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-white border rounded p-4 space-y-3 shadow-sm">
                <h3 className="font-medium text-sm">Paper Blueprint</h3>
                <input
                  value={paperBlueprint.examTitle}
                  onChange={(e) =>
                    setPaperBlueprint({
                      ...paperBlueprint,
                      examTitle: e.target.value,
                    })
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Exam Title"
                />
                <input
                  value={paperBlueprint.subject}
                  onChange={(e) =>
                    setPaperBlueprint({
                      ...paperBlueprint,
                      subject: e.target.value,
                    })
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Subject"
                />
                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    General Instructions
                  </label>
                  {paperBlueprint.generalInstructions.map((ins, i) => (
                    <input
                      key={i}
                      value={ins}
                      onChange={(e) =>
                        setPaperBlueprint((pb) => {
                          const gi = [...pb.generalInstructions];
                          gi[i] = e.target.value;
                          return { ...pb, generalInstructions: gi };
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-xs"
                    />
                  ))}
                  <button
                    onClick={() =>
                      setPaperBlueprint((pb) => ({
                        ...pb,
                        generalInstructions: [...pb.generalInstructions, ""],
                      }))
                    }
                    className="text-[10px] px-2 py-1 border rounded"
                  >
                    + Add Instruction
                  </button>
                </div>
                <div className="space-y-3">
                  {paperBlueprint.sections.map((sec, si) => (
                    <div key={si} className="border rounded p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <input
                          value={sec.title}
                          onChange={(e) =>
                            updateSection(si, { title: e.target.value })
                          }
                          className="font-medium text-xs border rounded px-2 py-1"
                        />
                        <button
                          onClick={() => removeSection(si)}
                          className="text-[10px] px-2 py-1 border rounded"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        value={sec.instructions}
                        onChange={(e) =>
                          updateSection(si, { instructions: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1 text-xs h-16"
                        placeholder="Instructions"
                      />
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <label className="flex flex-col gap-1">
                          <span>Marks/Q</span>
                          <input
                            type="number"
                            value={sec.marksPerQuestion}
                            onChange={(e) =>
                              updateSection(si, {
                                marksPerQuestion: Number(e.target.value),
                              })
                            }
                            className="border rounded px-2 py-1"
                          />
                        </label>
                        {ALL_TYPES.map((t) => (
                          <label key={t} className="flex flex-col gap-1">
                            <span className="capitalize">{t}</span>
                            <input
                              type="number"
                              min={0}
                              value={sec.questionCounts[t] || 0}
                              onChange={(e) =>
                                updateQuestionCount(
                                  si,
                                  t,
                                  Number(e.target.value)
                                )
                              }
                              className="border rounded px-2 py-1"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] mt-2">
                        {(["easy", "medium", "hard"] as const).map((d) => (
                          <label key={d} className="flex flex-col gap-1">
                            <span>{d}</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={sec.difficultyDistribution[d]}
                              onChange={(e) =>
                                updateDifficulty(si, d, Number(e.target.value))
                              }
                              className="border rounded px-2 py-1"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addSection}
                    className="text-[10px] px-2 py-1 border rounded"
                  >
                    + Add Section
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white border rounded p-4 space-y-3 shadow-sm">
                <h3 className="font-medium text-sm">Source</h3>
                <div className="flex gap-4 text-xs mb-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      value="text"
                      checked={paperInputMode === "text"}
                      onChange={() => setPaperInputMode("text")}
                    />{" "}
                    Text
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      value="pdf"
                      checked={paperInputMode === "pdf"}
                      onChange={() => setPaperInputMode("pdf")}
                    />{" "}
                    PDF
                  </label>
                </div>
                {paperInputMode === "text" ? (
                  <textarea
                    value={paperSource}
                    onChange={(e) => setPaperSource(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm h-48"
                    placeholder="Paste study material (>=100 chars)"
                  />
                ) : (
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) =>
                      setPaperPdfFile(e.target.files?.[0] || null)
                    }
                    className="text-xs"
                  />
                )}
                <button
                  onClick={generatePaper}
                  disabled={paperLoading}
                  className="px-4 py-2 bg-primary text-white rounded text-sm disabled:opacity-50"
                >
                  {paperLoading ? "Generating Paper..." : "Generate Paper"}
                </button>
                <div className="flex gap-2 flex-wrap text-[10px]">
                  <button
                    type="button"
                    onClick={openBlueprintModal}
                    className="px-2 py-1 border rounded"
                  >
                    Blueprints
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankExamOpen(true)}
                    className="px-2 py-1 border rounded"
                  >
                    Bank Exam
                  </button>
                </div>
                {paperResult && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaperResult(null)}
                      className="text-[10px] px-2 py-1 border rounded"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handlePrint}
                      className="text-[10px] px-2 py-1 border rounded"
                    >
                      Print / PDF
                    </button>
                    <button
                      onClick={openCreateExam}
                      className="text-[10px] px-2 py-1 border rounded bg-primary text-white"
                    >
                      Create Exam
                    </button>
                  </div>
                )}
              </div>
              {paperResult && (
                <div className="bg-white border rounded p-4 space-y-4 shadow-sm max-h-[70vh] overflow-auto">
                  <h3 className="font-medium text-sm">Preview</h3>
                  {paperResult.sections.map((sec, si) => (
                    <div key={si} className="border rounded p-3 mb-3">
                      <div className="font-semibold text-xs mb-2">
                        {sec.title}
                      </div>
                      <div className="space-y-2">
                        {sec.questions.map((q, qi) => (
                          <div key={qi} className="text-[11px] border-b pb-2">
                            <div className="flex gap-2 items-start">
                              <span className="font-medium">{qi + 1}.</span>
                              <div className="flex-1">
                                {q.text}
                                {q.type === "mcq" && q.options && (
                                  <ol className="ml-5 list-[upper-alpha] space-y-0.5 mt-1">
                                    {q.options.map((o, oi) => (
                                      <li key={oi}>{o.text}</li>
                                    ))}
                                  </ol>
                                )}
                                {q.type === "assertionreason" && (
                                  <div className="ml-3 mt-1 space-y-0.5 text-[10px] text-gray-600">
                                    {q.assertion && (
                                      <div>
                                        <strong>Assertion:</strong>{" "}
                                        {q.assertion}
                                      </div>
                                    )}
                                    {q.reason && (
                                      <div>
                                        <strong>Reason:</strong> {q.reason}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPrintPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:static print:bg-transparent">
          {printablePaper()}
        </div>
      )}

      {/* Blueprint Modal */}
      {blueprintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-lg w-full max-w-2xl max-h-[80vh] overflow-auto p-4 space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Blueprints</h3>
              <button
                onClick={() => setBlueprintModalOpen(false)}
                className="text-xs px-2 py-1 border rounded"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <input
                  value={newBlueprintName}
                  onChange={(e) => setNewBlueprintName(e.target.value)}
                  placeholder="Blueprint name"
                  className="border rounded px-2 py-1 text-xs"
                />
                <button
                  onClick={saveCurrentBlueprint}
                  disabled={savingBlueprint}
                  className="text-xs px-3 py-1 rounded bg-primary text-white disabled:opacity-50"
                >
                  {savingBlueprint ? "Saving..." : "Save Current"}
                </button>
              </div>
              <div className="border rounded divide-y">
                {loadingBlueprints && (
                  <div className="p-2 text-xs">Loading...</div>
                )}
                {!loadingBlueprints && !blueprints.length && (
                  <div className="p-2 text-[11px] text-gray-500">
                    No blueprints
                  </div>
                )}
                {!loadingBlueprints &&
                  blueprints.map((bp) => (
                    <div
                      key={bp._id}
                      className="p-2 flex items-center gap-2 text-xs hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {bp.name || bp.examTitle}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Sections: {bp.sections?.length || 0}
                        </div>
                      </div>
                      <button
                        onClick={() => applyBlueprint(bp)}
                        className="px-2 py-1 border rounded"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteBlueprint(bp._id)}
                        className="px-2 py-1 border rounded text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Exam Modal */}
      {createExamOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-lg w-full max-w-md p-4 space-y-4 text-sm">
            <h3 className="font-medium text-sm">Create Exam from Paper</h3>
            <input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
              placeholder="Exam title"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                placeholder="Class"
                className="border rounded px-2 py-1"
              />
              <input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="Batch"
                className="border rounded px-2 py-1"
              />
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-[10px]">Timer (minutes)</span>
                <input
                  type="number"
                  min={1}
                  value={timerMins}
                  onChange={(e) => setTimerMins(e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
              />
              Auto Publish
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateExamOpen(false)}
                className="px-3 py-1 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={createExamFromPaper}
                disabled={creatingExam}
                className="px-3 py-1 rounded bg-primary text-white text-xs disabled:opacity-50"
              >
                {creatingExam ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Exam Modal */}
      {bankExamOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-lg w-full max-w-3xl p-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">
                Create Exam from Question Bank
              </h3>
              <button
                onClick={() => setBankExamOpen(false)}
                className="text-xs px-2 py-1 border rounded"
              >
                Close
              </button>
            </div>
            <input
              value={bankExamTitle}
              onChange={(e) => setBankExamTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                placeholder="Class"
                className="border rounded px-2 py-1"
              />
              <input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="Batch"
                className="border rounded px-2 py-1"
              />
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-[10px]">Timer (minutes)</span>
                <input
                  type="number"
                  min={1}
                  value={bankTimerMins}
                  onChange={(e) => setBankTimerMins(e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </label>
            </div>
            <div className="border rounded max-h-72 overflow-auto divide-y text-xs">
              {bankLoading && <div className="p-2">Loading...</div>}
              {!bankLoading &&
                bankQuestionsList.map((q: BankQuestion) => {
                  const checked = bankSelectedQuestions.includes(q._id);
                  return (
                    <label
                      key={q._id}
                      className="flex gap-2 p-2 items-start cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setBankSelectedQuestions((prev) =>
                            checked
                              ? prev.filter((id) => id !== q._id)
                              : [...prev, q._id]
                          );
                        }}
                        className="mt-0.5"
                      />
                      <span className="flex-1">
                        <span className="font-medium text-[11px]">
                          {q.text}
                        </span>
                        <span className="block text-[10px] text-gray-500 mt-0.5">
                          {q.tags?.subject || "-"} / {q.tags?.topic || "-"} /{" "}
                          {q.tags?.difficulty || "-"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              {!bankLoading && !bankQuestionsList.length && (
                <div className="p-2 text-[11px] text-gray-500">
                  No questions
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <div>Selected: {bankSelectedQuestions.length}</div>
              <div className="flex gap-2">
                <button
                  onClick={createExamFromBank}
                  disabled={bankExamCreating}
                  className="px-3 py-1 bg-primary text-white rounded text-xs disabled:opacity-50"
                >
                  {bankExamCreating ? "Creating..." : "Create Exam"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Questions -> Create Exam Modal */}
      {genExamOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-lg w-full max-w-md p-4 space-y-4 text-sm">
            <h3 className="font-medium text-sm">
              Create Exam from Generated Questions
            </h3>
            <input
              value={genExamTitle}
              onChange={(e) => setGenExamTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
              placeholder="Exam title"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                placeholder="Class"
                className="border rounded px-2 py-1"
              />
              <input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="Batch"
                className="border rounded px-2 py-1"
              />
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-[10px]">Timer (minutes)</span>
                <input
                  type="number"
                  min={1}
                  value={genTimerMins}
                  onChange={(e) => setGenTimerMins(e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
              />
              Auto Publish
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setGenExamOpen(false)}
                className="px-3 py-1 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={createExamFromGenerated}
                disabled={genExamCreating}
                className="px-3 py-1 rounded bg-primary text-white text-xs disabled:opacity-50"
              >
                {genExamCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          h1,h2,h3 { page-break-after: avoid; }
          .page-break { page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
