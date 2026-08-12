import { get, set, del, keys } from "idb-keyval";
import { apiFetch } from "./api";

export type SyncStatus = "saving" | "saved" | "offline" | "syncing" | "synced";

export interface QueuedAnswer {
  questionId: string;
  payload: Record<string, unknown>;
  clientSeq: number;
  clientTs: number;
}

const seqKey = (attemptId: string) => `ans-seq:${attemptId}`;
const recordKey = (attemptId: string, questionId: string) => `ans:${attemptId}:${questionId}`;
const recordPrefix = (attemptId: string) => `ans:${attemptId}:`;

// One offline-first answer queue per attempt: every change is written to
// IndexedDB immediately (before any network call), then opportunistically
// synced to the server. Survives refresh/crash/offline periods — the queue is
// the source of truth for "what has this student answered locally" until the
// server confirms it, at which point the local record is dropped.
class AttemptAnswerSync {
  private attemptId: string;
  private listeners = new Set<(s: SyncStatus) => void>();
  private status: SyncStatus = "synced";
  private draining = false;
  private debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private seqCounter = 0;
  private seqReady: Promise<void>;

  constructor(attemptId: string) {
    this.attemptId = attemptId;
    this.seqReady = get(seqKey(attemptId)).then((v) => {
      this.seqCounter = typeof v === "number" ? v : 0;
    });
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void this.drain({ reconnect: true }));
    }
  }

  onStatusChange(cb: (s: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.listeners.forEach((cb) => cb(s));
  }

  private async nextSeq(): Promise<number> {
    await this.seqReady;
    this.seqCounter += 1;
    await set(seqKey(this.attemptId), this.seqCounter);
    return this.seqCounter;
  }

  // Write-through: persists locally FIRST, then schedules a debounced network
  // sync. Called on every keystroke/selection — never lost even if the tab
  // closes before the debounce fires.
  async queueAnswer(questionId: string, payload: Record<string, unknown>): Promise<void> {
    const clientSeq = await this.nextSeq();
    const record: QueuedAnswer = { questionId, payload, clientSeq, clientTs: Date.now() };
    await set(recordKey(this.attemptId, questionId), record);
    this.setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "saving");
    if (this.debounceTimers[questionId]) clearTimeout(this.debounceTimers[questionId]);
    this.debounceTimers[questionId] = setTimeout(() => {
      delete this.debounceTimers[questionId];
      void this.drain();
    }, 800);
  }

  async listPending(): Promise<QueuedAnswer[]> {
    const allKeys = await keys();
    const prefix = recordPrefix(this.attemptId);
    const relevant = allKeys.filter((k) => typeof k === "string" && k.startsWith(prefix)) as string[];
    const records = await Promise.all(relevant.map((k) => get<QueuedAnswer>(k)));
    return records
      .filter((r): r is QueuedAnswer => !!r)
      .sort((a, b) => a.clientSeq - b.clientSeq);
  }

  // Drains the local queue in clientSeq order. Stops (leaving the rest queued)
  // on the first network-level failure so ordering is preserved; a server-level
  // rejection (attempt finished, etc.) drops that one item since retrying can't
  // help. `reconnect: true` labels the terminal success state "All Changes
  // Synced" (a batch came back online) vs. "Saved" (one debounced write landed).
  async drain(opts?: { reconnect?: boolean }): Promise<void> {
    if (this.draining) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline");
      return;
    }
    this.draining = true;
    this.setStatus(opts?.reconnect ? "syncing" : "saving");
    try {
      const pending = await this.listPending();
      for (const record of pending) {
        try {
          await apiFetch(`/attempts/${this.attemptId}/answer`, {
            method: "POST",
            body: JSON.stringify({
              questionId: record.questionId,
              ...record.payload,
              clientSeq: record.clientSeq,
              clientTs: record.clientTs,
            }),
          });
          await del(recordKey(this.attemptId, record.questionId));
        } catch (e: unknown) {
          const status = (e as { status?: number } | undefined)?.status;
          if (typeof status !== "number") {
            // Network-level failure — stop here, keep the rest queued, retry on
            // the next 'online' event or debounce tick.
            this.setStatus("offline");
            return;
          }
          // Server responded (even with an error) — this specific write can't
          // succeed by retrying, drop it and keep draining the rest.
          await del(recordKey(this.attemptId, record.questionId));
        }
      }
      const remaining = await this.listPending();
      if (remaining.length) {
        this.setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "syncing");
      } else {
        this.setStatus(opts?.reconnect ? "synced" : "saved");
      }
    } finally {
      this.draining = false;
    }
  }

  // Bounded best-effort drain used right before submit. Returns whatever is
  // STILL unsynced after the time budget so the caller can attach it inline to
  // the submit request instead of blocking submission on a flaky connection.
  async flushAll(timeoutMs = 3000): Promise<QueuedAnswer[]> {
    await Promise.race([this.drain(), new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
    return this.listPending();
  }

  // Drop any locally-queued (not-yet-synced) write for one question — used
  // when the student explicitly clears their response, so a debounce that's
  // already in flight can't resurrect the value that was just cleared.
  async clearQuestion(questionId: string): Promise<void> {
    if (this.debounceTimers[questionId]) {
      clearTimeout(this.debounceTimers[questionId]);
      delete this.debounceTimers[questionId];
    }
    await del(recordKey(this.attemptId, questionId));
  }

  async clearAll(): Promise<void> {
    const pending = await this.listPending();
    await Promise.all(pending.map((r) => del(recordKey(this.attemptId, r.questionId))));
    await del(seqKey(this.attemptId));
  }
}

const instances = new Map<string, AttemptAnswerSync>();

export function getAnswerSync(attemptId: string): AttemptAnswerSync {
  let inst = instances.get(attemptId);
  if (!inst) {
    inst = new AttemptAnswerSync(attemptId);
    instances.set(attemptId, inst);
  }
  return inst;
}

export const syncStatusLabel: Record<SyncStatus, string> = {
  saving: "Saving...",
  saved: "Saved",
  offline: "Offline – Answers Stored Locally",
  syncing: "Syncing...",
  synced: "All Changes Synced",
};
