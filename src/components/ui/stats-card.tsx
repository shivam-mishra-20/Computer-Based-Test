"use client";
import React from "react";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "green" | "purple" | "amber" | "rose" | "slate";
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  color = "blue",
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: "text-blue-500",
      trend: {
        positive: "text-blue-600",
        negative: "text-blue-600",
      },
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      icon: "text-green-500",
      trend: {
        positive: "text-green-600",
        negative: "text-green-600",
      },
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: "text-purple-500",
      trend: {
        positive: "text-purple-600",
        negative: "text-purple-600",
      },
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      icon: "text-amber-500",
      trend: {
        positive: "text-amber-600",
        negative: "text-amber-600",
      },
    },
    rose: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      icon: "text-rose-500",
      trend: {
        positive: "text-rose-600",
        negative: "text-rose-600",
      },
    },
    slate: {
      bg: "bg-slate-50",
      text: "text-slate-700",
      icon: "text-slate-500",
      trend: {
        positive: "text-slate-600",
        negative: "text-slate-600",
      },
    },
  };

  return (
    <motion.div
      className={`p-6 rounded-xl border border-gray-100 bg-white shadow-sm`}
      whileHover={{ y: -4, boxShadow: "0 12px 24px -12px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.3 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h4 className={`text-2xl font-bold mt-2 ${colorClasses[color].text}`}>
            {value}
          </h4>

          {trend && (
            <div className="flex items-center mt-2 text-xs">
              <span
                className={`mr-1 ${
                  trend.isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {trend.isPositive ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <span
                className={`font-medium ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="ml-1 text-gray-400">vs last period</span>
            </div>
          )}
        </div>

        {icon && (
          <div
            className={`${colorClasses[color].bg} p-3 rounded-lg ${colorClasses[color].icon}`}
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
