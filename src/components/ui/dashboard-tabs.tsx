"use client";
import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface DashboardTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  label,
  isActive,
  onClick,
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-white text-cta shadow-sm border border-gray-100"
          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-transparent"
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
      {isActive && (
        <motion.div
          layoutId="dashboard-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cta to-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.button>
  );
};

interface DashboardTabsProps<T extends string> {
  tabs: { key: T; label: string }[];
  currentTab: T;
  onTabChange: (tab: T) => void;
  baseUrl?: string;
  actionButton?: React.ReactNode;
}

export default function DashboardTabs<T extends string>({
  tabs,
  currentTab,
  onTabChange,
  baseUrl,
  actionButton,
}: DashboardTabsProps<T>) {
  const router = useRouter();

  const handleTabChange = (tab: T) => {
    onTabChange(tab);
    if (baseUrl) {
      router.push(`${baseUrl}?tab=${tab}`);
    }
  };

  return (
    <motion.div
      className="flex flex-wrap items-center gap-2 mb-6 bg-white/60 backdrop-blur-sm p-2 rounded-xl border border-gray-100"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <DashboardTab
            key={tab.key}
            label={tab.label}
            isActive={currentTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
          />
        ))}
      </div>

      {actionButton && (
        <motion.div
          className="ml-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.2 }}
        >
          {actionButton}
        </motion.div>
      )}
    </motion.div>
  );
}
