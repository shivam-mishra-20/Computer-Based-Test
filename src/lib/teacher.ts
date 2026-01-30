import { apiFetch } from "./api";

// Teacher helpers
type Question = {
  id: string;
  text: string;
  subject: string;
  topic: string;
  difficulty: string;
  // Add other fields as needed
};

export async function listQuestions(params?: {
  q?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  limit?: number;
  skip?: number;
}) {
  const search = new URLSearchParams();
  if (params)
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
    });
  const qs = search.toString();
  return apiFetch(`/exams/questions${qs ? `?${qs}` : ""}`) as Promise<{
    items: Question[];
    total: number;
  }>;
}

export type CreateQuestionPayload = {
  text: string;
  subject: string;
  topic: string;
  difficulty: string;
  // Add other fields as needed
};

export async function createQuestion(payload: CreateQuestionPayload) {
  return apiFetch("/exams/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQuestion(
  id: string,
  payload: CreateQuestionPayload,
) {
  return apiFetch(`/exams/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteQuestion(id: string) {
  return apiFetch(`/exams/questions/${id}`, { method: "DELETE" });
}

export type GeneratedQuestion = {
  id: string;
  text: string;
  subject: string;
  topic: string;
  difficulty: string;
  // Add other fields as needed
};

export async function generateQuestionsFromText(payload: {
  text: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  count?: number;
}) {
  return apiFetch("/ai/generate/text", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<{ items: GeneratedQuestion[]; total: number }>;
}

export async function evaluateSubjective(payload: {
  questionText: string;
  studentAnswer: string;
  rubric?: string;
}) {
  return apiFetch("/ai/evaluate/subjective", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Papers (AI-generated question papers)
export type CreatePaperPayload = {
  // Define the expected fields for creating a paper
  title: string;
  questions: string[];
  subject: string;
  // Add other fields as needed
};

export async function createPaper(payload: CreatePaperPayload) {
  return apiFetch("/papers", { method: "POST", body: JSON.stringify(payload) });
}
export type Paper = {
  id: string;
  title: string;
  questions: string[];
  subject: string;
  // Add other fields as needed
};

export async function listPapers(params?: { limit?: number; skip?: number }) {
  const search = new URLSearchParams();
  if (params)
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) search.set(k, String(v));
    });
  const qs = search.toString();
  return apiFetch(`/papers${qs ? `?${qs}` : ""}`) as Promise<{
    items: Paper[];
    total: number;
  }>;
}
export async function getPaper(id: string) {
  return apiFetch(`/papers/${id}`);
}
export async function updatePaper(id: string, payload: CreatePaperPayload) {
  return apiFetch(`/papers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
export async function deletePaper(id: string) {
  return apiFetch(`/papers/${id}`, { method: "DELETE" });
}
export async function generateSolutions(id: string) {
  return apiFetch(`/papers/${id}/solutions`, { method: "POST" });
}
