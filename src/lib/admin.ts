import { apiFetch } from './api';

// Admin specific helper wrappers (typed convenience)
export async function fetchAdminStats() {
  return apiFetch('/users/dashboard') as Promise<{ stats: { admins: number; teachers: number; students: number } }>;
}

export async function fetchUsers(role?: 'admin' | 'teacher' | 'student') {
  const q = role ? `?role=${role}` : '';
  return apiFetch(`/users${q}`) as Promise<Array<{ id?: string; _id?: string; name: string; email: string; role: string }>>;
}

interface ExamSection { title?: string; questionIds?: string[]; sectionDurationMins?: number; shuffleQuestions?: boolean; shuffleOptions?: boolean }
interface NewExamPayload { title: string; description?: string; totalDurationMins?: number; sections: ExamSection[]; isPublished?: boolean }
interface ExamListResp { items?: { _id: string; title: string; isPublished?: boolean }[]; total?: number }
interface AttendanceResp { count: number; attended: { userId: string; startedAt?: string; submittedAt?: string; status?: string }[] }

export async function createExam(payload: NewExamPayload) {
  return apiFetch('/exams', { method: 'POST', body: JSON.stringify(payload) });
}

export async function listExams() {
  return apiFetch('/exams') as Promise<ExamListResp>;
}

export async function attendanceReport(examId: string) {
  return apiFetch(`/reports/exams/${examId}/attendance`) as Promise<AttendanceResp>;
}

export async function analyticsForExam(examId: string) {
  return apiFetch(`/analytics/exams/${examId}/insights`) as Promise<{ topicCount: Record<string, number>; difficultyCount: Record<string, number>; topicAvg: Record<string, number> }>;
}
