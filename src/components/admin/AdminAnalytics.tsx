"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../lib/api";

type Insight = {
  topicCount: Record<string, number>;
  difficultyCount: Record<string, number>;
  topicAvg: Record<string, number>;
};

export default function AdminAnalytics() {
  const [examId, setExamId] = useState("");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!examId) {
      setInsight(null);
      return;
    }
    setLoading(true);
    try {
      const data = (await apiFetch(
        `/api/analytics/exams/${examId}/insights`
      )) as Insight;
      setInsight(data);
    } catch {
      setInsight(null);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  const entries = (obj: Record<string, number>) => Object.entries(obj || {});

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Analytics</h2>
      <div className="flex gap-2 items-center mb-4">
        <input
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          placeholder="Exam ID"
          className="border rounded-md px-3 py-2 text-sm"
        />
        <button
          onClick={load}
          className="px-4 py-2 rounded-md bg-primary text-white text-sm"
        >
          Load
        </button>
      </div>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      {insight && (
        <div className="grid md:grid-cols-3 gap-6 mt-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-2 text-sm">Topic Count</h3>
            <ul className="space-y-1 text-sm">
              {entries(insight.topicCount).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-2 text-sm">Difficulty Count</h3>
            <ul className="space-y-1 text-sm">
              {entries(insight.difficultyCount).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-2 text-sm">Topic Avg Score</h3>
            <ul className="space-y-1 text-sm">
              {entries(insight.topicAvg).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-medium">{v.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {!loading && !insight && examId && (
        <div className="text-sm text-gray-400 mt-4">
          No analytics available.
        </div>
      )}
    </div>
  );
}
