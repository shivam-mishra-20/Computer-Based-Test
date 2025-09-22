"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, easeInOut } from "framer-motion";

// Animation variants for reusability
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeInOut" as const,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut" as const,
    },
  },
};

const cardVariants = {
  hover: {
    y: -8,
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: easeInOut,
    },
  },
  hover: {
    scale: 1.05,
    rotate: 5,
    transition: {
      duration: 0.3,
      ease: easeInOut,
    },
  },
};

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 relative overflow-hidden">
      {/* Enhanced background with depth */}
      <div className="absolute inset-0 z-0">
        {/* Primary gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_theme(colors.green.100)_0%,_transparent_50%)] opacity-40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_theme(colors.blue.100)_0%,_transparent_50%)] opacity-30"></div>

        {/* Floating elements for depth */}
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-green-200/20 to-emerald-200/20 rounded-full blur-xl"
          animate={{
            y: [-10, 10, -10],
            x: [-5, 5, -5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-32 right-32 w-40 h-40 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-xl"
          animate={{
            y: [10, -10, 10],
            x: [5, -5, 5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Subtle pattern overlay */}
        <div
          className="h-full w-full opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main content */}
      <motion.div
        className="relative z-10 max-w-2xl w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Enhanced glassmorphism card */}
        <motion.div
          className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative"
          variants={itemVariants}
          whileHover={{
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            transition: { duration: 0.3 },
          }}
        >
          {/* Animated gradient accent */}
          <motion.div
            className="h-2 bg-gradient-to-r from-green-600 via-emerald-500 to-blue-600"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          />

          <div className="p-8 md:p-12">
            {/* Animated logo */}
            <motion.div
              className="flex justify-center mb-6"
              variants={logoVariants}
              whileHover="hover"
            >
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-white to-gray-50 shadow-lg ring-4 ring-white/50">
                <Image
                  src="/logo.png"
                  alt="Abhigyan Gurukul Logo"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
            </motion.div>

            {/* Header section */}
            <motion.header className="mb-8 text-center" variants={itemVariants}>
              <motion.h1
                className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-gray-800 via-green-700 to-emerald-600 bg-clip-text text-transparent leading-tight"
                variants={itemVariants}
              >
                Abhigyan Gurukul
                <br />
                <span className="text-2xl md:text-3xl">Exam Portal</span>
              </motion.h1>

              <motion.p
                className="text-gray-600 text-sm mb-4 font-medium"
                variants={itemVariants}
              >
                Professional center for conducting and managing exams
              </motion.p>

              <motion.div
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 py-2 px-4 rounded-full border border-green-100"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700">
                  Smart, Secure & AI-Powered Management
                </span>
              </motion.div>
            </motion.header>

            {/* Role selection section */}
            <motion.section className="mb-6" variants={itemVariants}>
              <motion.h2
                className="text-lg font-semibold mb-6 text-center text-gray-700"
                variants={itemVariants}
              >
                Select Your Role to Continue
              </motion.h2>

              <div className="grid sm:grid-cols-3 gap-4">
                {/* Student Login */}
                <motion.div variants={itemVariants}>
                  <Link href="/login/student">
                    <motion.div
                      className="group relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer overflow-hidden"
                      variants={cardVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <motion.div
                        className="mb-3 p-3 bg-blue-400/30 rounded-xl relative z-10"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-7 w-7"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 0 12 20.904a48.627 48.627 0 0 0 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 0 12 3.493a59.902 59.902 0 0 0 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 0 12 13.489a50.702 50.702 0 0 0 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 0 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                          />
                        </svg>
                      </motion.div>
                      <span className="font-semibold text-center relative z-10">
                        Student Login
                      </span>
                    </motion.div>
                  </Link>
                </motion.div>

                {/* Teacher Login */}
                <motion.div variants={itemVariants}>
                  <Link href="/login/teacher">
                    <motion.div
                      className="group relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer overflow-hidden"
                      variants={cardVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <motion.div
                        className="mb-3 p-3 bg-purple-400/30 rounded-xl relative z-10"
                        whileHover={{ rotate: -10, scale: 1.1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-7 w-7"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                          />
                        </svg>
                      </motion.div>
                      <span className="font-semibold text-center relative z-10">
                        Teacher Login
                      </span>
                    </motion.div>
                  </Link>
                </motion.div>

                {/* Admin Login */}
                <motion.div variants={itemVariants}>
                  <Link href="/login/admin">
                    <motion.div
                      className="group relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/50 text-slate-700 cursor-pointer overflow-hidden"
                      variants={cardVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <motion.div
                        className="mb-3 p-3 bg-slate-200/70 rounded-xl relative z-10"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-7 w-7"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                          />
                        </svg>
                      </motion.div>
                      <span className="font-semibold text-center relative z-10">
                        Admin Login
                      </span>
                    </motion.div>
                  </Link>
                </motion.div>
              </div>
            </motion.section>
          </div>

          {/* Subtle bottom accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </motion.div>

        {/* Footer */}
        <motion.footer className="mt-8 text-center" variants={itemVariants}>
          <motion.p
            className="text-xs text-gray-500 font-medium"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            © 2025 Abhigyan Gurukul Exam Portal | All Rights Reserved
          </motion.p>
        </motion.footer>
      </motion.div>
    </main>
  );
}
