"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

const cardVariants = {
  hover: {
    y: -4,
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: {
      duration: 0.3,
    },
  },
};

// Color palettes for professional data visualization
const CHART_COLORS = {
  primary: [
    "#3B82F6",
    "#8B5CF6",
    "#06B6D4",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#14B8A6",
  ],
  difficulty: {
    easy: "#10B981",
    medium: "#F59E0B",
    hard: "#EF4444",
  },
  gradient: ["#3B82F6", "#8B5CF6"],
};

interface Insight {
  topicCount: Record<string, number>;
  difficultyCount: Record<string, number>;
  topicAvg: Record<string, number>;
}

interface ExamOption {
  _id: string;
  title: string;
  totalAttempts?: number;
  avgScore?: number;
}

// Custom tooltip components
type SimpleTooltipProps = {
  active?: boolean;
  payload?: unknown[];
  label?: React.ReactNode;
};

const CustomTooltip = ({ active, payload, label }: SimpleTooltipProps) => {
  if (active && payload && payload.length) {
    const val = (payload[0] as unknown as { value?: unknown })?.value;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-blue-600">
          <span className="font-medium">Count: </span>
          {String(val ?? "-")}
        </p>
      </div>
    );
  }
  return null;
};

const CustomScoreTooltip = ({ active, payload, label }: SimpleTooltipProps) => {
  if (active && payload && payload.length) {
    const val = (payload[0] as unknown as { value?: unknown })?.value;
    const formatted =
      typeof val === "number" ? val.toFixed(2) : String(val ?? "-");
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-purple-600">
          <span className="font-medium">Avg Score: </span>
          {formatted}
        </p>
      </div>
    );
  }
  return null;
};

export default function TeacherAnalytics() {
  const [examId, setExamId] = useState("");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamOption | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");

  // Load available exams for dropdown
  const loadExamOptions = useCallback(async () => {
    try {
      const data = (await apiFetch("/exams")) as {
        items?: ExamOption[];
      } | null;
      if (data && data.items) {
        setExamOptions(data.items);
      }
    } catch (error) {
      console.error("Failed to load exam options:", error);
    }
  }, []);

  useEffect(() => {
    loadExamOptions();
  }, [loadExamOptions]);

  const load = useCallback(async () => {
    if (!examId) {
      setInsight(null);
      setSelectedExam(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = (await apiFetch(
        `/analytics/exams/${examId}/insights`
      )) as Insight;
      const exam = examOptions.find((e) => e._id === examId);
      setInsight(data);
      setSelectedExam(exam || null);
    } catch (err) {
      setInsight(null);
      setSelectedExam(null);
      setError(
        err instanceof Error ? err.message : "Failed to load analytics data"
      );
    } finally {
      setLoading(false);
    }
  }, [examId, examOptions]);

  useEffect(() => {
    load();
  }, [load]);

  // Data processing
  const topicData = Object.entries(insight?.topicCount || {}).map(
    ([name, value]) => ({ name, value })
  );
  const diffData = Object.entries(insight?.difficultyCount || {}).map(
    ([name, value]) => ({
      name,
      value,
      fill:
        CHART_COLORS.difficulty[name as keyof typeof CHART_COLORS.difficulty] ||
        CHART_COLORS.primary[0],
    })
  );
  const topicAvgData = Object.entries(insight?.topicAvg || {}).map(
    ([name, value]) => ({ name, value })
  );

  // Calculate summary statistics
  const totalQuestions = topicData.reduce((sum, item) => sum + item.value, 0);
  const averageScore =
    topicAvgData.length > 0
      ? topicAvgData.reduce((sum, item) => sum + item.value, 0) /
        topicAvgData.length
      : 0;
  const topTopic =
    topicData.length > 0
      ? topicData.reduce((max, item) => (item.value > max.value ? item : max))
      : null;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        variants={itemVariants}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              Comprehensive exam performance insights
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("overview")}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === "overview"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === "detailed"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Detailed
            </button>
          </div>

          {/* Exam Selection */}
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="appearance-none w-full sm:w-64 pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="">Select an exam...</option>
                {examOptions.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            <motion.button
              onClick={load}
              disabled={loading || !examId}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Analyze
                </div>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {selectedExam && insight && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={itemVariants}
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">
                  Total Questions
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalQuestions}
                </p>
              </div>
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">
                  Average Score
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {averageScore.toFixed(1)}
                </p>
              </div>
              <div className="p-2 bg-purple-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="m18 8.118-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Top Topic</p>
                <p className="text-lg font-bold text-green-900 truncate">
                  {topTopic?.name || "N/A"}
                </p>
                <p className="text-sm text-green-700">
                  {topTopic?.value || 0} questions
                </p>
              </div>
              <div className="p-2 bg-green-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">
                  Topics Covered
                </p>
                <p className="text-2xl font-bold text-yellow-900">
                  {topicData.length}
                </p>
              </div>
              <div className="p-2 bg-yellow-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-2xl p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Analytics Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Content */}
      <AnimatePresence mode="wait">
        {insight && !loading && (
          <motion.div
            key="analytics-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {viewMode === "overview" ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Topic Distribution Chart */}
                <motion.div
                  className="bg-white rounded-2xl p-6 border border-gray-200 lg:col-span-2"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Topic Distribution
                      </h3>
                      <p className="text-sm text-gray-600">
                        Questions by topic area
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                      </svg>
                    </div>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topicData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <defs>
                          <linearGradient
                            id="topicGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3B82F6"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3B82F6"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="value"
                          fill="url(#topicGradient)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Difficulty Breakdown */}
                <motion.div
                  className="bg-white rounded-2xl p-6 border border-gray-200"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Difficulty Levels
                      </h3>
                      <p className="text-sm text-gray-600">
                        Question difficulty breakdown
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={diffData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {diffData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => (
                            <span className="text-sm capitalize">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Detailed Topic Analysis */}
                <motion.div
                  className="bg-white rounded-2xl p-6 border border-gray-200"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Topic Performance
                      </h3>
                      <p className="text-sm text-gray-600">
                        Average scores by topic
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={topicAvgData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <defs>
                          <linearGradient
                            id="scoreGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8B5CF6"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8B5CF6"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          domain={[0, "dataMax + 1"]}
                        />
                        <Tooltip content={<CustomScoreTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#8B5CF6"
                          strokeWidth={3}
                          fill="url(#scoreGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Detailed Statistics Table */}
                <motion.div
                  className="bg-white rounded-2xl p-6 border border-gray-200"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Detailed Statistics
                      </h3>
                      <p className="text-sm text-gray-600">
                        Topic performance breakdown
                      </p>
                    </div>
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-indigo-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-80">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm rounded-tl-lg">
                            Topic
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900 text-sm">
                            Questions
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900 text-sm rounded-tr-lg">
                            Avg Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(insight.topicAvg).map(
                          ([topic, avgScore], index) => {
                            const questionCount =
                              insight.topicCount[topic] || 0;
                            const scorePercentage = (avgScore / 5) * 100; // Assuming max score is 5

                            return (
                              <motion.tr
                                key={topic}
                                className="hover:bg-gray-50 transition-colors"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{
                                        backgroundColor:
                                          CHART_COLORS.primary[
                                            index % CHART_COLORS.primary.length
                                          ],
                                      }}
                                    />
                                    <span className="font-medium text-gray-900 truncate">
                                      {topic}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {questionCount}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="flex-1 max-w-16 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600"
                                        style={{
                                          width: `${Math.min(
                                            scorePercentage,
                                            100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="font-semibold text-gray-900 min-w-12">
                                      {avgScore.toFixed(2)}
                                    </span>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && !insight && !error && (
        <motion.div
          className="text-center py-12 bg-white rounded-2xl border border-gray-200"
          variants={itemVariants}
        >
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ready to Analyze
          </h3>
          <p className="text-gray-600 mb-4">
            Select an exam from the dropdown above to view comprehensive
            analytics.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              />
            </svg>
            Analytics include topic distribution, difficulty breakdown, and
            performance metrics
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
