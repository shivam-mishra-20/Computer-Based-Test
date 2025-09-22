"use client";
import React from "react";
import { motion } from "framer-motion";

interface DashboardContentProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export default function DashboardContent({
  children,
  className = "",
  animate = true,
}: DashboardContentProps) {
  if (!animate) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function DashboardSection({
  title,
  subtitle,
  children,
  className = "",
  rightContent,
  collapsible = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  rightContent?: React.ReactNode;
  collapsible?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  const toggleCollapse = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };

  return (
    <motion.div
      className={`mb-8 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div
            className={`flex items-center ${
              collapsible ? "cursor-pointer" : ""
            }`}
            onClick={toggleCollapse}
          >
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {collapsible && (
              <motion.div
                initial={false}
                animate={{ rotate: collapsed ? -90 : 0 }}
                transition={{ duration: 0.3 }}
                className="ml-2 text-gray-500"
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.div>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {rightContent && (
          <div className="ml-4 flex items-center">{rightContent}</div>
        )}
      </div>

      {(!collapsible || !collapsed) && (
        <motion.div
          initial={collapsible ? { opacity: 0, height: 0 } : false}
          animate={collapsible ? { opacity: 1, height: "auto" } : {}}
          exit={collapsible ? { opacity: 0, height: 0 } : {}}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

export function DashboardGrid({
  children,
  columns = 3,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}) {
  const columnClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return <div className={`grid ${columnClass} gap-6`}>{children}</div>;
}
