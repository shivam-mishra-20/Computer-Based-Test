"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";
import StatsCard from "../ui/stats-card";
import { Card } from "../ui/card";
import {
  ResponsiveContainer,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  LineChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Shape returned by backend /api/analytics/me/progress
interface AttemptPoint {
  submittedAt?: string;
  totalScore?: number;
  maxScore?: number;
  percent?: number | null;
  examTitle?: string;
}

export default function StudentProgress() {
  const [points, setPoints] = useState<AttemptPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const resp = (await apiFetch("/analytics/me/progress")) as unknown;
      if (Array.isArray(resp)) {
        setPoints(resp as AttemptPoint[]);
      } else if (
        typeof resp === "object" &&
        resp !== null &&
        Array.isArray((resp as { data?: unknown }).data)
      ) {
        setPoints((resp as { data: AttemptPoint[] }).data);
      } else {
        setPoints([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }

  // initial load + lightweight polling for "real-time" feel
  useEffect(() => {
    load();
    const id = setInterval(() => load(), 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, []);

  // Derived presentation data
  const chartData = useMemo(() => {
    return points.map((p, idx) => {
      const percent =
        typeof p.percent === "number"
          ? p.percent
          : p.maxScore
          ? Math.round(((p.totalScore ?? 0) / (p.maxScore || 1)) * 100)
          : null;
      const when = p.submittedAt ? new Date(p.submittedAt) : null;
      const dateLabel = when
        ? when.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `#${idx + 1}`;
      return {
        index: idx + 1,
        date: dateLabel,
        fullDate: when?.toLocaleString(),
        exam: p.examTitle || "Exam",
        percent: percent ?? null,
        total: p.totalScore ?? null,
        max: p.maxScore ?? null,
      };
    });
  }, [points]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const validPercents = chartData
      .map((d) => (typeof d.percent === "number" ? d.percent : null))
      .filter((n): n is number => n !== null);
    const avg = validPercents.length
      ? Math.round(
          (validPercents.reduce((a, b) => a + b, 0) / validPercents.length) * 10
        ) / 10
      : 0;
    const last = chartData[chartData.length - 1]?.percent ?? null;
    const prev = chartData[chartData.length - 2]?.percent ?? null;
    const trend =
      typeof last === "number" && typeof prev === "number"
        ? Math.round((last - prev) * 10) / 10
        : 0;
    const best = validPercents.length ? Math.max(...validPercents) : 0;
    return { avg, last, best, trend, count: chartData.length };
  }, [chartData]);

  // Pie chart buckets (distribution of percent ranges)
  const pieData = useMemo(() => {
    const buckets = [
      { name: "0-50%", range: [0, 50], value: 0 },
      { name: "50-70%", range: [50, 70], value: 0 },
      { name: "70-85%", range: [70, 85], value: 0 },
      { name: "85-100%", range: [85, 100], value: 0 },
    ];
    for (const d of chartData) {
      if (typeof d.percent !== "number") continue;
      for (const b of buckets) {
        if (d.percent >= b.range[0] && d.percent < b.range[1]) {
          b.value += 1;
          break;
        }
        if (d.percent === 100 && b.range[1] === 100) {
          b.value += 1;
          break;
        }
      }
    }
    return buckets.filter((b) => b.value > 0);
  }, [chartData]);

  return (
    <Protected requiredRole="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">My Progress</h2>
          <button
            onClick={() => load()}
            className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Loading / Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-sm text-slate-600">
            Loading progress...
          </div>
        )}

        {/* Empty */}
        {!loading && !error && chartData.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-sm text-slate-600">
            No progress data yet. Take an exam to see your progress here.
          </div>
        )}

        {/* Stats */}
        {!loading && !error && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Average Percent"
              value={stats.avg + "%"}
              color="green"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3 13h2v8H3zM7 9h2v12H7zM11 5h2v16h-2zM15 3h2v18h-2zM19 7h2v14h-2z" />
                </svg>
              }
              trend={{
                value: Math.abs(stats.trend),
                isPositive: stats.trend >= 0,
              }}
            />
            <StatsCard
              title="Latest Score"
              value={typeof stats.last === "number" ? stats.last + "%" : "—"}
              color="blue"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.59V7h-2v7l5 3 .97-1.74-3.97-2.67z" />
                </svg>
              }
            />
            <StatsCard
              title="Best Score"
              value={stats.best + "%"}
              color="purple"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              }
            />
            <StatsCard
              title="Exams Taken"
              value={stats.count}
              color="amber"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                </svg>
              }
            />
          </div>
        )}

        {/* Charts */}
        {!loading && !error && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    Percent over time
                  </div>
                  <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                    {(
                      [
                        { key: "line", label: "Line" },
                        { key: "bar", label: "Bar" },
                        { key: "pie", label: "Pie" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setChartType(opt.key)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          chartType === opt.key
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-white text-slate-600 hover:bg-gray-50"
                        } ${
                          opt.key !== "pie" ? "border-r border-gray-200" : ""
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              }
              className=""
            >
              <div className="h-72 md:h-80">
                {/* Render only one ResponsiveContainer + chart at a time */}
                {chartType === "line" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="date" tickMargin={8} stroke="#94a3b8" />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        stroke="#94a3b8"
                      />
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => {
                          const n =
                            typeof name === "string"
                              ? name
                              : String(name ?? "");
                          if (n === "percent" && typeof value === "number")
                            return [`${value}%`, "Percent"];
                          if (n === "total")
                            return [String(value ?? ""), "Score"];
                          if (n === "max") return [String(value ?? ""), "Max"];
                          return [String(value ?? ""), n];
                        }}
                        labelFormatter={(label: unknown) => String(label ?? "")}
                      />
                      <Legend />
                      <ReferenceLine
                        y={33}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                      />
                      <ReferenceLine
                        y={66}
                        stroke="#10b981"
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="percent"
                        name="Percent"
                        stroke="#10b981"
                        strokeWidth={2.2}
                        dot={{ r: 3, stroke: "#10b981", strokeWidth: 1 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {chartType === "bar" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="date" tickMargin={8} stroke="#94a3b8" />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        stroke="#94a3b8"
                      />
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => {
                          const n =
                            typeof name === "string"
                              ? name
                              : String(name ?? "");
                          if (n === "percent" && typeof value === "number")
                            return [`${value}%`, "Percent"];
                          return [String(value ?? ""), n];
                        }}
                        labelFormatter={(label: unknown) => String(label ?? "")}
                      />
                      <Legend />
                      <Bar
                        dataKey="percent"
                        name="Percent"
                        fill="#0ea5e9"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {chartType === "pie" && (
                  <>
                    {pieData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-slate-500">
                        No percent distribution available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip
                            formatter={(value: unknown, name: unknown) => [
                              String(value ?? ""),
                              String(name ?? ""),
                            ]}
                          />
                          <Legend />
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={80}
                            label
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  ["#f87171", "#f59e0b", "#60a5fa", "#10b981"][
                                    index % 4
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </>
                )}
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center gap-2">Scores by exam</div>
              }
              className=""
            >
              <div className="h-72 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="date" tickMargin={8} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => {
                        const n =
                          typeof name === "string" ? name : String(name ?? "");
                        if (n === "percent" && typeof value === "number")
                          return [`${value}%`, "Percent"];
                        if (n === "total")
                          return [String(value ?? ""), "Score"];
                        if (n === "max") return [String(value ?? ""), "Max"];
                        return [String(value ?? ""), n];
                      }}
                      labelFormatter={(label: unknown) => String(label ?? "")}
                    />
                    <Legend />
                    <Bar
                      dataKey="total"
                      name="Score"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="max"
                      name="Max"
                      stroke="#64748b"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* Recent attempts list */}
        {!loading && !error && chartData.length > 0 && (
          <Card
            header={
              <div className="font-medium text-slate-800">Recent attempts</div>
            }
          >
            <div className="divide-y divide-gray-100">
              {chartData
                .slice()
                .reverse()
                .slice(0, 8)
                .map((d) => (
                  <div
                    key={`${d.index}-${d.date}`}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate max-w-[50ch]">
                        {d.exam}
                      </div>
                      <div className="text-slate-500">
                        {d.fullDate || d.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-slate-700">
                        {typeof d.total === "number" &&
                        typeof d.max === "number" ? (
                          <span className="font-semibold">
                            {d.total}/{d.max}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div
                        className={`text-right ${
                          typeof d.percent === "number"
                            ? d.percent >= 80
                              ? "text-emerald-600"
                              : d.percent >= 60
                              ? "text-amber-600"
                              : "text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {typeof d.percent === "number" ? `${d.percent}%` : "—"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </Protected>
  );
}
