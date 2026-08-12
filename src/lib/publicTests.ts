import { apiFetch } from "./api";

/**
 * Public assessment authoring client.
 *
 * ── What this talks to, and why it is not /api/admin ─────────────────────────
 * Everything here hits `/api/admin-assessments`, which is guarded at the router
 * level by `requireRole('admin', 'teacher')`. It is a sibling of `/api/admin`
 * rather than a child of it because that path is guarded `admin`-only — sharing
 * it would either shadow the institute admin router or lock teachers out of
 * authoring.
 *
 * ── What this NEVER touches ──────────────────────────────────────────────────
 * No institute collection. Public tests live in their own collections
 * (PublicTest / PublicTestSeries / PublicAttempt) so that no institute audience
 * query can reach them and no public query can reach an institute exam.
 * Promotion READS an exam and WRITES a new public test; the exam is never
 * modified, and the copy diverges from that moment on.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PublicTestKind = "TEST" | "QUIZ" | "MOCK" | "SERIES_PAPER";
export type PublicTestStatus = "draft" | "published" | "archived";
export type PublicTestDifficulty = "easy" | "medium" | "hard" | "mixed";

export interface MarkingScheme {
  correct: number;
  /** Negative marking is stored as a negative number, e.g. -1. */
  incorrect: number;
  unattempted: number;
}

export interface PublicTestSection {
  _id?: string;
  title: string;
  questionIds: string[];
  durationMins?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

export interface PublicTest {
  _id: string;
  title: string;
  description?: string;
  kind: PublicTestKind;
  sections?: PublicTestSection[];
  markingScheme?: MarkingScheme;
  durationMins: number;
  board?: string[];
  /** Digits only — "10", never "Class 10". Normalised server-side. */
  classLevel?: string;
  subject?: string;
  exam?: string;
  examType?: string;
  difficulty: PublicTestDifficulty;
  seriesId?: string;
  orderInSeries?: number;
  status: PublicTestStatus;
  schedule?: { startAt?: string; endAt?: string };
  instructions?: string;
  /**
   * WHICH per-class collection (`class_11`, …) the section question ids live
   * in. Questions are not stored in one global bank, so a paper that loses this
   * cannot resolve its own questions.
   */
  questionBank?: string;
  questionCount: number;
  totalMarks: number;
  duplicatedFrom?: string;
  createdAt: string;
  updatedAt: string;
  /** Only present on admin reads. Decides whether editing is safe. */
  attemptCount?: number;
}

export interface PublicSeries {
  _id: string;
  title: string;
  description?: string;
  board?: string[];
  classLevel?: string;
  subject?: string;
  exam?: string;
  status: PublicTestStatus;
  paperCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
}

/** Everything an author may set. Mirrors the backend's WRITABLE list. */
export type PublicTestDraft = Partial<
  Pick<
    PublicTest,
    | "title"
    | "description"
    | "kind"
    | "sections"
    | "markingScheme"
    | "durationMins"
    | "board"
    | "classLevel"
    | "subject"
    | "exam"
    | "examType"
    | "difficulty"
    | "seriesId"
    | "orderInSeries"
    | "schedule"
    | "instructions"
    | "questionBank"
  >
>;

const qs = (params: Record<string, string | number | undefined | null>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

const BASE = "/admin-assessments";

// ─── Tests ───────────────────────────────────────────────────────────────────

export function listPublicTests(params: {
  q?: string;
  status?: PublicTestStatus | "";
  kind?: PublicTestKind | "";
  seriesId?: string;
  skip?: number;
  limit?: number;
} = {}) {
  return apiFetch(`${BASE}/public-tests${qs(params)}`) as Promise<Paged<PublicTest>>;
}

/** Full test including sections — the builder's load. */
export function getPublicTest(id: string) {
  return apiFetch(`${BASE}/public-tests/${id}`) as Promise<PublicTest>;
}

export function createPublicTest(draft: PublicTestDraft) {
  return apiFetch(`${BASE}/public-tests`, {
    method: "POST",
    body: JSON.stringify(draft),
  }) as Promise<PublicTest>;
}

/**
 * Save a draft.
 *
 * The response carries a `warning` when the test already has attempts: those
 * keep the paper they started with (their snapshot is frozen at start), while
 * new attempts get the edited one. The caller must surface it rather than
 * swallow it — silently diverging content produces results nobody can explain.
 */
export function updatePublicTest(id: string, draft: PublicTestDraft) {
  return apiFetch(`${BASE}/public-tests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  }) as Promise<{ test: PublicTest; warning?: string }>;
}

/** The publish gate. 422 carries `problems[]` — every blocker at once. */
export function setPublicTestStatus(id: string, status: PublicTestStatus) {
  return apiFetch(`${BASE}/public-tests/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  }) as Promise<{ _id: string; status: PublicTestStatus }>;
}

/** Refused with 409 once attempts exist — archive instead. */
export function deletePublicTest(id: string) {
  return apiFetch(`${BASE}/public-tests/${id}`, { method: "DELETE" }) as Promise<{
    message: string;
  }>;
}

/** An independent draft copy. Editing it can never reach the original. */
export function duplicatePublicTest(id: string) {
  return apiFetch(`${BASE}/public-tests/${id}/duplicate`, {
    method: "POST",
  }) as Promise<PublicTest>;
}

/**
 * Copy an institute exam into a public DRAFT.
 *
 * Always lands as a draft: promotion must never publish institute content to
 * the world in one step. The source exam is not modified.
 */
export function promoteExam(examId: string, overrides?: PublicTestDraft) {
  return apiFetch(`${BASE}/public-tests/promote`, {
    method: "POST",
    body: JSON.stringify({ examId, overrides }),
  }) as Promise<{ test: PublicTest; message: string }>;
}

// ─── Series ──────────────────────────────────────────────────────────────────

export function listPublicSeries() {
  return apiFetch(`${BASE}/public-series`) as Promise<{ items: PublicSeries[]; total: number }>;
}

export function createPublicSeries(input: {
  title: string;
  description?: string;
  board?: string[];
  classLevel?: string;
  subject?: string;
  exam?: string;
}) {
  return apiFetch(`${BASE}/public-series`, {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<PublicSeries>;
}

export function updatePublicSeries(
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    board: string[];
    classLevel: string;
    subject: string;
    exam: string;
    status: PublicTestStatus;
  }>,
) {
  return apiFetch(`${BASE}/public-series/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<PublicSeries>;
}

/** Papers survive, detached as standalone tests. */
export function deletePublicSeries(id: string) {
  return apiFetch(`${BASE}/public-series/${id}`, { method: "DELETE" }) as Promise<{
    message: string;
    detached: number;
  }>;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const KIND_LABELS: Record<PublicTestKind, string> = {
  TEST: "Test",
  QUIZ: "Quiz",
  MOCK: "Mock test",
  SERIES_PAPER: "Series paper",
};

/**
 * Pull the blocker list out of a failed publish.
 *
 * The backend returns every problem at once (422 with `problems[]`) so an
 * author fixes them in one pass instead of one error at a time. Losing that
 * list to a generic "request failed" would waste the whole design.
 */
export function publishProblems(error: unknown): string[] {
  // apiFetch attaches the parsed response body as `err.data`.
  const data = (error as { data?: { problems?: unknown } })?.data;
  const problems = data?.problems;
  return Array.isArray(problems) ? problems.map(String) : [];
}

/** HTTP status from a failed apiFetch, or 0 when the request never landed. */
export function statusOf(error: unknown): number {
  return (error as { status?: number })?.status ?? 0;
}

/**
 * Was this delete refused because learners have already sat the paper?
 *
 * That is a 409 with `code: 'HAS_ATTEMPTS'`, and it is not really an error —
 * it means archiving is the right action. The UI offers that instead of just
 * reporting a failure.
 */
export function isHasAttempts(error: unknown): boolean {
  const data = (error as { data?: { code?: string } })?.data;
  return statusOf(error) === 409 && data?.code === "HAS_ATTEMPTS";
}

/** "+4 / −1", or null for the plain scheme that isn't worth stating. */
export function formatMarking(scheme?: MarkingScheme): string | null {
  if (!scheme) return null;
  const correct = scheme.correct ?? 1;
  const incorrect = scheme.incorrect ?? 0;
  if (correct === 1 && incorrect === 0) return null;
  return `+${correct} / ${incorrect === 0 ? "0" : `−${Math.abs(incorrect)}`}`;
}

/**
 * An ISO instant as a `datetime-local` input value.
 *
 * `datetime-local` speaks LOCAL wall-clock time with no zone, so handing it an
 * ISO UTC string silently shifts an author's schedule by their offset — a paper
 * set to open at 9am IST would open at 2:30pm. The reverse conversion is
 * `new Date(value).toISOString()`, which reads the local string correctly.
 */
export function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
