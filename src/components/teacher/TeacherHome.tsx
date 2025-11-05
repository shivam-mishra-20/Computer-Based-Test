"use client";
import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FileText, FolderOpen, Upload, Sparkles } from "lucide-react";

interface FeatureCardProps {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, icon, onClick }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="md:w-[20vw] w-full bg-white hover:bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[140px] active:shadow-sm"
    >
      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
        <div className="text-emerald-700">{icon}</div>
      </div>
      <span className="text-sm font-semibold text-gray-800 text-center leading-tight">
        {title}
      </span>
    </motion.button>
  );
};

interface TeacherHomeProps {
  onNavigate?: (tab: string) => void;
}

export default function TeacherHome({ onNavigate }: TeacherHomeProps) {
  const router = useRouter();

  const handleNavigate = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      router.push(`/dashboard/teacher?tab=${tab}`);
    }
  };

  const features = [
    {
      title: "Create",
      icon: <FileText className="w-6 h-6" />,
      action: () => handleNavigate("create-paper"),
    },
    {
      title: "Manage",
      icon: <FolderOpen className="w-6 h-6" />,
      action: () => handleNavigate("papers"),
    },
    {
      title: "Import",
      icon: <Upload className="w-6 h-6" />,
      action: () => handleNavigate("import"),
    },
    {
      title: "AI Tools",
      icon: <Sparkles className="w-6 h-6" />,
      action: () => handleNavigate("ai"),
    },
  ];

  return (
    <div className="min-h-screen py-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-emerald-900 mb-1">
            Your Workspace
          </h1>
          <p className="text-sm text-gray-600">Quick access to your tools</p>
        </motion.div>

        {/* 2x2 Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 gap-4 md:flex md:flex-row md:justify-center md:gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <FeatureCard
                title={feature.title}
                icon={feature.icon}
                onClick={feature.action}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
