"use client";
import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Calendar, Clock, Award, Building } from "lucide-react";
import { PaperFormData } from "../CreatePaperFlow";

interface PaperBasicInfoProps {
  formData: PaperFormData;
  updateFormData: (data: Partial<PaperFormData>) => void;
}

const classes = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Science",
  "Computer Science",
  "Accountancy",
  "Business Studies",
  "Economics",
];

export default function PaperBasicInfo({
  formData,
  updateFormData,
}: PaperBasicInfoProps) {
  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-bold text-emerald-900 mb-1">
          Basic Information
        </h2>
        <p className="text-sm text-gray-600">Enter exam details</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4">
        {/* Class Selection */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-1.5"
        >
          <label className="flex items-center text-sm font-medium text-gray-700">
            <BookOpen className="w-4 h-4 mr-2 text-emerald-600" />
            Class <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={formData.className}
            onChange={(e) => updateFormData({ className: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 transition-all"
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Subject Selection */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1.5"
        >
          <label className="flex items-center text-sm font-medium text-gray-700">
            <BookOpen className="w-4 h-4 mr-2 text-emerald-600" />
            Subject <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={formData.subject}
            onChange={(e) => updateFormData({ subject: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 transition-all"
          >
            <option value="">Select Subject</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Exam Title */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-1.5"
        >
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Award className="w-4 h-4 mr-2 text-emerald-600" />
            Exam Title <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={formData.examTitle}
            onChange={(e) => updateFormData({ examTitle: e.target.value })}
            placeholder="e.g., Mid-Term Examination"
            className="w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 transition-all"
          />
        </motion.div>

        {/* Total Marks */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-1.5"
        >
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Award className="w-4 h-4 mr-2 text-emerald-600" />
            Total Marks
          </label>
          <input
            type="number"
            value={formData.totalMarks || ""}
            onChange={(e) =>
              updateFormData({ totalMarks: parseInt(e.target.value) || 0 })
            }
            placeholder="100"
            className="w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 transition-all"
          />
        </motion.div>

        {/* Duration */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-1.5"
        >
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Clock className="w-4 h-4 mr-2 text-emerald-600" />
            Duration
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => updateFormData({ duration: e.target.value })}
            placeholder="3 Hours"
            className="w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 transition-all"
          />
        </motion.div>

        {/* Exam Date */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-1.5"
        >
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
            Exam Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => updateFormData({ date: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 transition-all"
          />
        </motion.div>

        {/* Institute Name */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-1.5"
        >
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Building className="w-4 h-4 mr-2 text-emerald-600" />
            Institute Name (Optional)
          </label>
          <input
            type="text"
            value={formData.instituteName || ""}
            onChange={(e) => updateFormData({ instituteName: e.target.value })}
            placeholder="Your School/Institute Name"
            className="w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-800 transition-all"
          />
        </motion.div>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl"
      >
        <p className="text-xs text-emerald-800">
          <strong>Tip:</strong> Fill required fields (*) to continue
        </p>
      </motion.div>
    </div>
  );
}
