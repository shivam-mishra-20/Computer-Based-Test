"use client";
import React from "react";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export default function DashboardHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs,
}: DashboardHeaderProps) {
  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <motion.div
          className="flex items-center text-xs text-gray-500 mb-2 gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="mx-1 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
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
                </span>
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-gray-700 hover:underline"
                >
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center">
          {icon && (
            <motion.div
              className="mr-3 p-2 bg-cta/10 rounded-lg text-cta"
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              {icon}
            </motion.div>
          )}

          <div>
            <motion.h1
              className="text-2xl font-bold text-accent"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {title}
            </motion.h1>

            {subtitle && (
              <motion.p
                className="text-sm text-gray-500 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>

        {actions && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.2 }}
          >
            {actions}
          </motion.div>
        )}
      </div>

      <motion.div
        className="h-1 w-24 bg-gradient-to-r from-cta to-primary rounded-full mt-4"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      />
    </motion.div>
  );
}
