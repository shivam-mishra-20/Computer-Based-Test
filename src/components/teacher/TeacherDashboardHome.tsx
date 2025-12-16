"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "../../lib/api";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

import type { Variants } from "framer-motion";

export default function TeacherDashboardHome() {
  const [counts, setCounts] = useState<{
    questions: number;
    exams: number;
    pendingReviews: number;
    aiGenerated: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const qs = (await apiFetch(`/api/exams/questions?limit=1`)) as {
        total?: number;
      };
      const ex = (await apiFetch(`/api/exams?limit=1`)) as { total?: number };

      // Try to fetch pending reviews using the same endpoint as TeacherReviewPanel
      // which returns an array of pending attempts. Fall back gracefully if shape differs.
      let pending = 0;
      try {
        const pr = await apiFetch(`/api/attempts/review/pending`);
        if (Array.isArray(pr)) {
          pending = pr.length;
        } else if (
          pr &&
          typeof (pr as unknown as { total?: unknown }).total === "number"
        ) {
          // older endpoint shape
          pending = (pr as unknown as { total: number }).total;
        } else {
          pending = 0;
        }
      } catch {
        // endpoint not available; keep fallback value
        pending = 0;
      }

      // AI generated papers count
      let aiCount = 0;
      try {
        const pap = (await apiFetch(`/api/papers?limit=1`)) as {
          total?: number;
        };
        aiCount = pap?.total ?? 0;
      } catch {
        aiCount = 0;
      }

      setCounts({
        questions: qs.total || 0,
        exams: ex.total || 0,
        pendingReviews: pending,
        aiGenerated: aiCount,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      setCounts({ questions: 0, exams: 0, pendingReviews: 0, aiGenerated: 0 });
    } finally {
      setTimeout(() => setLoading(false), 600); // Small delay for smoother animations
    }
  }

  useEffect(() => {
    load();
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  const router = useRouter();

  // Quick action handlers
  const handleCreateExam = () => {
    router.push("/dashboard/teacher?tab=exams");
  };

  const handleReviewSubs = () => {
    router.push("/dashboard/teacher/reviews");
  };

  const handleGenerateQs = () => {
    router.push("/dashboard/teacher?tab=ai");
  };

  // Statistic cards with icons
  const StatCard = ({
    icon,
    title,
    value,
    color,
    loading,
  }: {
    icon: React.ReactNode;
    title: string;
    value: number | string;
    color: string;
    loading: boolean;
  }) => (
    <motion.div variants={itemVariants} className="overflow-hidden">
      <Card className={`${color} overflow-hidden relative`}>
        <div className="absolute top-0 right-0 opacity-10">
          <svg
            width="100"
            height="100"
            viewBox="0 0 24 24"
            className="w-24 h-24 text-white"
          >
            {icon}
          </svg>
        </div>
        <div className="z-10 relative">
          <h3 className="text-sm font-medium text-white/80 mb-1">{title}</h3>
          {loading ? (
            <Skeleton className="h-8 w-16 bg-white/20" />
          ) : (
            <div className="text-3xl font-bold text-white">{value}</div>
          )}
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-green-700 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome to Your Dashboard
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Manage your exams, questions, and student assessments all in one
              place
            </p>
          </div>
          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all text-white border border-white/30 self-start md:self-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              load();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="font-medium">Refresh</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Quick stats section */}
      <section>
        <motion.h2
          className="text-xl md:text-2xl font-bold text-gray-800 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Quick Overview
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <StatCard
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
              />
            }
            title="Total Questions"
            value={loading ? "-" : counts?.questions ?? 0}
            color="bg-gradient-to-br from-blue-500 to-blue-700"
            loading={loading}
          />
          <StatCard
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            }
            title="Active Exams"
            value={loading ? "-" : counts?.exams ?? 0}
            color="bg-gradient-to-br from-purple-500 to-purple-700"
            loading={loading}
          />
          <StatCard
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
              />
            }
            title="Pending Reviews"
            value={loading ? "-" : counts?.pendingReviews ?? 0}
            color="bg-gradient-to-br from-amber-500 to-amber-700"
            loading={loading}
          />
          <StatCard
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            }
            title="AI Generated"
            value={loading ? "-" : counts?.aiGenerated ?? 0}
            color="bg-gradient-to-br from-green-500 to-green-700"
            loading={loading}
          />
        </motion.div>
      </section>

      {/* Quick Links Section - NEW */}
      <section>
        <motion.h3
          className="text-xl md:text-2xl font-bold text-gray-800 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Quick Links
        </motion.h3>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          transition={{ delayChildren: 0.4 }}
        >
          {/* Create New Exam */}
          <motion.div
            variants={itemVariants}
            className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-200 transition-all duration-300 cursor-pointer"
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={handleCreateExam}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg group-hover:shadow-blue-200 transition-shadow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">
              Create New Exam
            </h4>
            <p className="text-sm text-gray-600">
              Set up a new exam with custom questions and settings
            </p>
          </motion.div>

          {/* Review Submissions */}
          <motion.div
            variants={itemVariants}
            className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all duration-300 cursor-pointer"
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={handleReviewSubs}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-xl shadow-lg group-hover:shadow-amber-200 transition-shadow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                  />
                </svg>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-amber-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">
              Review Submissions
            </h4>
            <p className="text-sm text-gray-600">
              Grade and provide feedback on student submissions
            </p>
          </motion.div>

          {/* Generate Questions */}
          <motion.div
            variants={itemVariants}
            className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-green-200 transition-all duration-300 cursor-pointer"
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={handleGenerateQs}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg group-hover:shadow-green-200 transition-shadow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                  />
                </svg>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">
              AI Question Generator
            </h4>
            <p className="text-sm text-gray-600">
              Use AI to create high-quality questions instantly
            </p>
          </motion.div>

          {/* Question Papers */}
          <motion.div
            variants={itemVariants}
            className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer"
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => {
              router.push("/dashboard/teacher?tab=papers");
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg group-hover:shadow-purple-200 transition-shadow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">
              Question Papers
            </h4>
            <p className="text-sm text-gray-600">
              Create and manage AI-generated question papers
            </p>
          </motion.div>

          {/* Smart Import */}
          <motion.div
            variants={itemVariants}
            className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 cursor-pointer"
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => {
              router.push("/dashboard/teacher?tab=ai");
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl shadow-lg group-hover:shadow-emerald-200 transition-shadow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">
              Smart Import
            </h4>
            <p className="text-sm text-gray-600">
              Import questions from documents using AI technology
            </p>
          </motion.div>

          {/* Analytics */}
          <motion.div
            variants={itemVariants}
            className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer"
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => {
              router.push("/dashboard/teacher?tab=analytics");
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:shadow-indigo-200 transition-shadow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">Analytics</h4>
            <p className="text-sm text-gray-600">
              View detailed insights and performance metrics
            </p>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
