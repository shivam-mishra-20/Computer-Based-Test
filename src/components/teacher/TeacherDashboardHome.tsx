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
  const recentActivity = [
    {
      id: "1",
      action: "Created",
      entity: "Final Exam - Computer Science 101",
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      action: "Added",
      entity: "15 new questions to Question Bank",
      timestamp: "1 day ago",
    },
    {
      id: "3",
      action: "Reviewed",
      entity: "Student submission #1293",
      timestamp: "2 days ago",
    },
  ];

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

  const activityVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.3 + i * 0.1,
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    }),
  };

  // Recent activity - try to fetch if an API exists
  // Frontend-only activity storage (localStorage)
  const router = useRouter();
  type ActivityItem = {
    id: string;
    action: string;
    entity: string;
    timestamp: string;
  };

  const ACTIVITY_KEY = "cbt_frontend_activity";

  const [activityList, setActivityList] = useState<ActivityItem[] | null>(null);

  const loadStoredActivities = React.useCallback((): ActivityItem[] => {
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ActivityItem[];
      return [];
    } catch (e) {
      console.error("Failed to load stored activities:", e);
      return [];
    }
  }, []);

  const saveStoredActivities = (items: ActivityItem[]) => {
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(items.slice(0, 50)));
    } catch (e) {
      console.error("Failed to save activities:", e);
    }
  };

  const pushActivity = ({
    action,
    entity,
  }: {
    action: string;
    entity: string;
  }) => {
    const now = new Date();
    const item: ActivityItem = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
      action,
      entity,
      timestamp: now.toLocaleString(),
    };
    const cur = loadStoredActivities();
    cur.unshift(item);
    saveStoredActivities(cur);
    setActivityList([...cur]);
  };

  useEffect(() => {
    // On mount prefer frontend activities; fallback to sample activities
    const stored = loadStoredActivities();
    if (stored && stored.length > 0) {
      setActivityList(stored.slice(0, 10));
      return;
    }

    // No frontend activities yet; leave null so UI falls back to sample
    setActivityList(null);
  }, [loadStoredActivities]);

  // Quick action handlers
  const handleCreateExam = () => {
    pushActivity({ action: "Created", entity: "New Exam" });
    router.push("/dashboard/teacher?tab=exams");
  };

  const handleReviewSubs = () => {
    pushActivity({ action: "Reviewed", entity: "Student Submissions" });
    router.push("/dashboard/teacher/reviews");
  };

  const handleGenerateQs = () => {
    pushActivity({ action: "Added", entity: "AI Generated Questions" });
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
    <div className="space-y-8">
      {/* Quick stats section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <div>
            <motion.h2
              className="text-xl font-bold text-gray-800"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              Dashboard Overview
            </motion.h2>
            <motion.p
              className="text-sm text-gray-600 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              Quick stats and recent activity for your teaching portal
            </motion.p>
          </div>
          <motion.button
            className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-700 transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              load();
              // record refresh action in frontend activity
              try {
                pushActivity({
                  action: "Event",
                  entity: "Refreshed dashboard",
                });
              } catch {
                // ignore
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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
            Refresh
          </motion.button>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
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

      {/* Recent activity section */}
      <section>
        <motion.h3
          className="text-lg font-bold text-gray-800 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Recent Activity
        </motion.h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {loading
              ? // Skeleton loading state
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <li key={i} className="p-4">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </li>
                  ))
              : (activityList || recentActivity).map((item, i) => (
                  <motion.li
                    key={item.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                    custom={i}
                    variants={activityVariants}
                    initial="hidden"
                    animate="show"
                    whileHover={{ backgroundColor: "rgba(243, 244, 246, 0.7)" }}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            item.action === "Created"
                              ? "bg-blue-100 text-blue-600"
                              : item.action === "Added"
                              ? "bg-green-100 text-green-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {item.action === "Created" && (
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
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                          )}
                          {item.action === "Added" && (
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
                                d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                              />
                            </svg>
                          )}
                          {item.action === "Reviewed" && (
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
                                d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-semibold">{item.action}</span>{" "}
                            {item.entity}
                          </p>
                          <span className="text-xs text-gray-500">
                            {item.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
          </ul>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <motion.button
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View all activity
            </motion.button>
          </div>
        </div>
      </section>

      {/* Quick actions section */}
      <section>
        <motion.h3
          className="text-lg font-bold text-gray-800 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Quick Actions
        </motion.h3>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          transition={{ delayChildren: 0.6 }}
        >
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            onClick={handleCreateExam}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary-700"
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
              <div>
                <h4 className="font-medium text-gray-900">Create New Exam</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Setup a new exam with questions
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            onClick={handleReviewSubs}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-700"
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
              <div>
                <h4 className="font-medium text-gray-900">
                  Review Submissions
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Grade pending student submissions
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            onClick={handleGenerateQs}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-700"
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
              <div>
                <h4 className="font-medium text-gray-900">
                  Generate Questions
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Use AI to create new questions
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
