"use client";
import React from "react";
import { motion } from "framer-motion";
import LoginForm from "../../../components/LoginForm";
import Link from "next/link";

export default function AdminLoginPage() {
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white font-poppins p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_theme(colors.slate.100)_0%,_transparent_50%)] opacity-70"></div>
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-slate-100/20 to-slate-200/10 rounded-full blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 1.5 }}
        />
        <div
          className="h-full w-full opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='50' cy='50' r='3'/%3E%3Ccircle cx='0' cy='0' r='1.5'/%3E%3Ccircle cx='100' cy='0' r='1.5'/%3E%3Ccircle cx='0' cy='100' r='1.5'/%3E%3Ccircle cx='100' cy='100' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
              className="flex items-center text-slate-500 hover:text-slate-700 text-sm font-medium"
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
          className="backdrop-blur-sm bg-white/90 rounded-xl shadow-xl border border-slate-100 overflow-hidden"
          variants={itemVariants}
        >
          {/* Top accent bar */}
          <motion.div
            className="h-1 bg-gradient-to-r from-slate-400 to-slate-600"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          <div className="px-8 py-10">
            <motion.div
              className="flex items-center mb-6"
              variants={itemVariants}
            >
              <div className="mr-3 p-2 rounded-full bg-slate-100">
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-700"
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
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </motion.svg>
              </div>
              <div>
                <motion.h1
                  className="text-2xl font-bold text-slate-800"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  Admin Login
                </motion.h1>
                <motion.p
                  className="text-sm text-slate-500"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  Enter your credentials to access the admin panel
                </motion.p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-2">
              <LoginForm role="admin" />
            </motion.div>

            <motion.div
              className="mt-6 pt-6 border-t border-slate-100 text-center"
              variants={itemVariants}
            >
              <p className="text-xs text-slate-500">
                Secure administration access for authorized personnel only
              </p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="mt-6 text-center text-xs text-slate-500"
          variants={itemVariants}
        >
          <p>© 2025 Abhigyan Gurukul Exam Portal</p>
        </motion.div>
      </motion.div>
    </main>
  );
}
