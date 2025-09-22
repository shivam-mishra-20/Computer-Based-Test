"use client";
import React from "react";
import { motion } from "framer-motion";
import LoginForm from "../../../components/LoginForm";
import Link from "next/link";

export default function TeacherLoginPage() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50 font-poppins p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_theme(colors.purple.100)_0%,_transparent_50%)] opacity-60"></div>
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-100/20 to-purple-200/10 rounded-full blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 1.5 }}
        />
        <div
          className="h-full w-full opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z' fill='%239333ea' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Return to home link */}
        <motion.div
          className="mb-6 flex justify-center"
          variants={itemVariants}
        >
          <Link href="/">
            <motion.div
              className="flex items-center text-purple-500 hover:text-purple-700 text-sm font-medium"
              whileHover={{ x: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Home
            </motion.div>
          </Link>
        </motion.div>

        {/* Login card */}
        <motion.div
          className="backdrop-blur-sm bg-white/90 rounded-xl shadow-xl border border-purple-50 overflow-hidden"
          variants={itemVariants}
        >
          {/* Top accent bar */}
          <motion.div
            className="h-1 bg-gradient-to-r from-purple-400 to-purple-600"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          <div className="px-8 py-10">
            <motion.div
              className="flex items-center mb-6"
              variants={itemVariants}
            >
              <div className="mr-3 p-2 rounded-full bg-purple-50">
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, rotate: [0, -10, 0] }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </motion.svg>
              </div>
              <div>
                <motion.h1
                  className="text-2xl font-bold text-purple-800"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  Teacher Login
                </motion.h1>
                <motion.p
                  className="text-sm text-purple-600/70"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  Enter your credentials to access the teacher dashboard
                </motion.p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-2">
              <LoginForm role="teacher" />
            </motion.div>

            <motion.div
              className="mt-6 pt-6 border-t border-purple-50 text-center"
              variants={itemVariants}
            >
              <p className="text-xs text-purple-500/70">
                Secure access for authorized teaching staff
              </p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="mt-6 text-center text-xs text-purple-500/70"
          variants={itemVariants}
        >
          <p>© 2025 Abhigyan Gurukul Exam Portal</p>
        </motion.div>
      </motion.div>
    </main>
  );
}
