"use client";
import React from "react";
import Protected from "@/components/Protected";
import { motion } from "framer-motion";
import Link from "next/link";

// Stat Card with gradient accent
const StatCard = ({ 
  label, 
  value, 
  change, 
  trend, 
  icon, 
  gradient 
}: { 
  label: string; 
  value: string; 
  change: string; 
  trend: "up" | "down"; 
  icon: React.ReactNode;
  gradient: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.1)" }}
    className="relative bg-white rounded-2xl p-6 border border-slate-100 overflow-hidden group cursor-pointer transition-shadow"
  >
    {/* Gradient accent bar */}
    <div className={`absolute top-0 left-0 right-0 h-1 ${gradient}`} />
    
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
        <div className="flex items-center gap-1 mt-2">
          <span className={`
            inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold
            ${trend === "up" 
              ? "bg-emerald-50 text-emerald-700" 
              : "bg-rose-50 text-rose-700"
            }
          `}>
            {trend === "up" ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {change}
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      </div>
      <div className={`p-3 rounded-xl ${gradient} opacity-90 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

// Quick Action Card
const QuickAction = ({ 
  title, 
  description, 
  icon, 
  href, 
  color 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  href: string;
  color: string;
}) => (
  <Link href={href}>
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h4 className="font-semibold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500">{description}</p>
    </motion.div>
  </Link>
);

// Activity Item
const ActivityItem = ({ 
  title, 
  time, 
  type 
}: { 
  title: string; 
  time: string; 
  type: "success" | "warning" | "info" 
}) => (
  <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
    <div className={`
      w-2 h-2 rounded-full flex-shrink-0
      ${type === "success" ? "bg-emerald-500" : type === "warning" ? "bg-amber-500" : "bg-blue-500"}
    `} />
    <div className="flex-1 min-w-0">
      <p className="text-sm text-slate-700 truncate">{title}</p>
      <p className="text-xs text-slate-400">{time}</p>
    </div>
  </div>
);

export default function AppManagementPage() {
  const stats = [
    { 
      label: "Total Users", 
      value: "12,345", 
      change: "+12%", 
      trend: "up" as const,
      gradient: "bg-gradient-to-r from-blue-500 to-indigo-600",
      icon: <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },
    { 
      label: "Active Subscriptions", 
      value: "1,234", 
      change: "+5%", 
      trend: "up" as const,
      gradient: "bg-gradient-to-r from-emerald-500 to-teal-600",
      icon: <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    { 
      label: "Revenue", 
      value: "₹45,678", 
      change: "+8%", 
      trend: "up" as const,
      gradient: "bg-gradient-to-r from-purple-500 to-pink-600",
      icon: <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    { 
      label: "Pending Issues", 
      value: "23", 
      change: "-2%", 
      trend: "down" as const,
      gradient: "bg-gradient-to-r from-amber-500 to-orange-600",
      icon: <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    },
  ];

  const quickActions = [
    { 
      title: "Pending Registrations", 
      description: "Review & approve users",
      href: "/dashboard/admin/app-management/registrations",
      color: "bg-orange-100",
      icon: <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    { 
      title: "Manage Courses", 
      description: "Add or edit courses",
      href: "/dashboard/admin/app-management/courses",
      color: "bg-blue-100",
      icon: <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    },
    { 
      title: "Study Resources", 
      description: "Videos & study materials",
      href: "/dashboard/admin/app-management/resources",
      color: "bg-violet-100",
      icon: <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    },
    { 
      title: "User Management", 
      description: "View and manage users",
      href: "/dashboard/admin/app-management/users",
      color: "bg-emerald-100",
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    { 
      title: "Automation Scheduler", 
      description: "Configure EPUB automation",
      href: "/dashboard/admin/automation",
      color: "bg-purple-100",
      icon: <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    { 
      title: "Schedule Classes", 
      description: "Manage timetables",
      href: "/dashboard/admin/app-management/schedule",
      color: "bg-amber-100",
      icon: <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    { 
      title: "Manage Batches", 
      description: "Create & edit batches",
      href: "/dashboard/admin/app-management/batches",
      color: "bg-teal-100",
      icon: <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    },
    { 
      title: "Leave Management", 
      description: "Manage teacher leaves",
      href: "/dashboard/admin/app-management/leaves",
      color: "bg-indigo-100",
      icon: <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    { 
      title: "Firebase Sync", 
      description: "Sync with Firebase DB",
      href: "/dashboard/admin/app-management/sync",
      color: "bg-rose-100",
      icon: <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    },
    { 
      title: "Settings", 
      description: "App configuration",
      href: "/dashboard/admin/app-management/settings",
      color: "bg-slate-100",
      icon: <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
    { 
      title: "Manage Holidays", 
      description: "Holidays & Working Days",
      href: "/dashboard/admin/app-management/holidays",
      color: "bg-red-100",
      icon: <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
  ];

  const recentActivity = [
    { title: "New user registration: John Doe", time: "2 minutes ago", type: "success" as const },
    { title: "Course 'React Basics' updated", time: "15 minutes ago", type: "info" as const },
    { title: "Payment failed for user #1234", time: "1 hour ago", type: "warning" as const },
    { title: "System backup completed", time: "2 hours ago", type: "success" as const },
    { title: "New subscription: Premium Plan", time: "3 hours ago", type: "success" as const },
  ];

  return (
    <Protected requiredRole="admin">
      <main className="p-4 pt-5 lg:pt-6 sm:p-6 lg:p-8 font-poppins min-h-screen">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/dashboard/admin" className="hover:text-slate-700 transition-colors">
              Dashboard
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-800 font-medium">App Management</span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                App Management Overview
              </h1>
              <p className="text-slate-500 mt-1">Real-time insights and system health</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">User Growth</h3>
                  <p className="text-sm text-slate-500">Monthly active users trend</p>
                </div>
                <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                </select>
              </div>
            </div>
            <div className="p-6 h-[280px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
              {/* Placeholder chart visualization */}
              <div className="flex items-end gap-3 h-full w-full px-4">
                {[40, 65, 45, 80, 60, 90, 70, 85, 95, 75, 88, 92].map((height, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                    className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg min-w-[20px] relative group"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {height}%
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Recent Activity</h3>
                <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View all</button>
              </div>
            </div>
            <div className="p-4 max-h-[320px] overflow-y-auto scrollbar-hide">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <ActivityItem {...activity} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <QuickAction {...action} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Device Usage & Performance Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Device Distribution */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <h3 className="font-semibold text-slate-800 mb-4">Device Distribution</h3>
            <div className="space-y-4">
              {[
                { name: "Mobile", value: 65, color: "bg-blue-500" },
                { name: "Desktop", value: 25, color: "bg-emerald-500" },
                { name: "Tablet", value: 10, color: "bg-purple-500" },
              ].map((device, index) => (
                <div key={device.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{device.name}</span>
                    <span className="font-medium text-slate-800">{device.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${device.value}%` }}
                      transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                      className={`h-full ${device.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* System Health */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <h3 className="font-semibold text-slate-800 mb-4">System Health</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "CPU Usage", value: "24%", status: "healthy" },
                { label: "Memory", value: "68%", status: "warning" },
                { label: "Storage", value: "45%", status: "healthy" },
                { label: "Uptime", value: "99.9%", status: "healthy" },
              ].map((metric) => (
                <div key={metric.label} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${
                      metric.status === "healthy" ? "bg-emerald-500" : "bg-amber-500"
                    }`} />
                    <span className="text-xs text-slate-500">{metric.label}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{metric.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </Protected>
  );
}
