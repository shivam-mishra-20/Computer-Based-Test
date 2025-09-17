import { apiFetch } from './api';

// Teacher helpers
export async function listQuestions(params?: { q?: string; subject?: string; topic?: string; difficulty?: string; limit?: number; skip?: number }) {
  const search = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k,v]) => { if (v!==undefined && v!==null && v!=='') search.set(k, String(v)); });
  const qs = search.toString();
  return apiFetch(`/api/exams/questions${qs?`?${qs}`:''}`) as Promise<{ items: any[]; total: number }>;
}

export async function createQuestion(payload: any) { // refine types if needed
  return apiFetch('/api/exams/questions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateQuestion(id: string, payload: any) {
  return apiFetch(`/api/exams/questions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteQuestion(id: string) {
  return apiFetch(`/api/exams/questions/${id}`, { method: 'DELETE' });
}

export async function generateQuestionsFromText(payload: { text: string; subject?: string; topic?: string; difficulty?: string; count?: number }) {
  return apiFetch('/api/ai/generate/text', { method: 'POST', body: JSON.stringify(payload) }) as Promise<{ items: any[]; total: number }>;
}

export async function evaluateSubjective(payload: { questionText: string; studentAnswer: string; rubric?: string }) {
  return apiFetch('/api/ai/evaluate/subjective', { method: 'POST', body: JSON.stringify(payload) });
}
