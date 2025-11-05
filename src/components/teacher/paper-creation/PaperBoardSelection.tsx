"use client";
import React from "react";
import { motion } from "framer-motion";
import { GraduationCap, Trophy, Atom, BookOpenCheck } from "lucide-react";
import { PaperFormData } from "../CreatePaperFlow";

interface PaperBoardSelectionProps {
  formData: PaperFormData;
  updateFormData: (data: Partial<PaperFormData>) => void;
}

const boards = [
  {
    id: "CBSE",
    name: "CBSE",
    fullName: "Central Board of Secondary Education",
    icon: <GraduationCap className="w-8 h-8" />,
    color: "from-blue-500 to-blue-700",
    description: "National level curriculum",
  },
  {
    id: "GSEB",
    name: "GSEB",
    fullName: "Gujarat Secondary Education Board",
    icon: <BookOpenCheck className="w-8 h-8" />,
    color: "from-green-500 to-green-700",
    description: "Gujarat state board",
  },
  {
    id: "JEE",
    name: "JEE",
    fullName: "Joint Entrance Examination",
    icon: <Atom className="w-8 h-8" />,
    color: "from-purple-500 to-purple-700",
    description: "Engineering entrance exam",
  },
  {
    id: "NEET",
    name: "NEET",
    fullName: "National Eligibility cum Entrance Test",
    icon: <Atom className="w-8 h-8" />,
    color: "from-pink-500 to-pink-700",
    description: "Medical entrance exam",
  },
  {
    id: "Olympiad",
    name: "Olympiad",
    fullName: "Science & Math Olympiad",
    icon: <Trophy className="w-8 h-8" />,
    color: "from-orange-500 to-orange-700",
    description: "Competitive examinations",
  },
  {
    id: "Custom",
    name: "Custom",
    fullName: "Custom Board/Exam",
    icon: <GraduationCap className="w-8 h-8" />,
    color: "from-gray-500 to-gray-700",
    description: "Design your own format",
  },
];

export default function PaperBoardSelection({
  formData,
  updateFormData,
}: PaperBoardSelectionProps) {
  const handleBoardSelect = (boardId: string) => {
    updateFormData({ board: boardId });
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-bold text-emerald-900 mb-1">
          Select Exam Board
        </h2>
        <p className="text-sm text-gray-600">Choose the board or exam type</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {boards.map((board, index) => (
          <motion.button
            key={board.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * index }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleBoardSelect(board.id)}
            className={`relative overflow-hidden p-4 rounded-xl border-2 transition-all ${
              formData.board === board.id
                ? "bg-emerald-50 border-emerald-500"
                : "bg-white border-emerald-200 hover:border-emerald-300"
            }`}
          >
            {/* Selected Indicator */}
            {formData.board === board.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <div className="[&>svg]:w-5 [&>svg]:h-5">{board.icon}</div>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-800">
                  {board.name}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-1">
                  {board.description}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Selected Board Info */}
      {formData.board && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl"
        >
          <p className="text-xs text-emerald-800">
            <strong>Selected:</strong>{" "}
            {boards.find((b) => b.id === formData.board)?.fullName}
          </p>
        </motion.div>
      )}
    </div>
  );
}
