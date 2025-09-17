"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Insight {
  topicCount: Record<string, number>;
  difficultyCount: Record<string, number>;
  topicAvg: Record<string, number>;
}

export default function TeacherAnalytics() {
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

  const entries = (o: Record<string, number>) => Object.entries(o || {});
  const topicData = Object.entries(insight?.topicCount || {}).map(
    ([name, value]) => ({ name, value })
  );
  const diffData = Object.entries(insight?.difficultyCount || {}).map(
    ([name, value]) => ({ name, value })
  );
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
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col">
            <h3 className="font-medium mb-2 text-sm">Topic Count</h3>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topicData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="name"
                    hide={topicData.length > 8}
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} width={30} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col">
            <h3 className="font-medium mb-2 text-sm">Difficulty Count</h3>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={diffData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} width={30} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-2 text-sm">Topic Avg Score</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1">Topic</th>
                  <th className="text-right py-1">Avg</th>
                </tr>
              </thead>
              <tbody>
                {entries(insight.topicAvg).map(([k, v]) => (
                  <tr key={k} className="border-t">
                    <td className="py-1 pr-2">{k}</td>
                    <td className="py-1 text-right font-medium">
                      {v.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
