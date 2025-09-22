"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe, getToken, setUser, User } from "../../lib/auth";
import { motion } from "framer-motion";
import ElegantLoader from "../../components/ElegantLoader";

export default function DashboardIndex() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<
    "loading" | "error" | "success"
  >("loading");
  const [loadingMessage, setLoadingMessage] = useState(
    "Authenticating your session..."
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoadingState("error");
      setLoadingMessage("Session expired. Redirecting to login...");
      setTimeout(() => router.push("/"), 1500);
      return;
    }

    // Sequence of loading messages
    const messages = [
      "Authenticating your session...",
      "Fetching your profile...",
      "Preparing your dashboard...",
      "Almost there...",
    ];

    // Show messages in sequence
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 1200);

    fetchMe()
      .then((me: unknown) => {
        if (!me || typeof me !== "object") {
          clearInterval(messageInterval);
          setLoadingState("error");
          setLoadingMessage("Authentication failed. Redirecting to login...");
          setTimeout(() => router.push("/"), 1500);
          return;
        }

        clearInterval(messageInterval);
        setLoadingState("success");
        setLoadingMessage("Access granted! Taking you to your dashboard...");

        const u = me as User;
        setUser(u);
        const role = u.role as string | undefined;

        // Slight delay for smooth animation
        setTimeout(() => {
          if (role === "admin") router.push("/dashboard/admin");
          else if (role === "teacher") router.push("/dashboard/teacher");
          else router.push("/dashboard/student");
        }, 800);
      })
      .catch(() => {
        clearInterval(messageInterval);
        setLoadingState("error");
        setLoadingMessage("Connection error. Redirecting to login...");
        setTimeout(() => router.push("/"), 1500);
      });

    return () => clearInterval(messageInterval);
  }, [router]);

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0 },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Only a centered circular loader — card, messages and progress removed */}
      <motion.div
        className="flex items-center justify-center w-full"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <div className="flex flex-col items-center justify-center h-48">
          <ElegantLoader
            size="lg"
            className={
              loadingState === "error"
                ? "text-red-600"
                : loadingState === "success"
                ? "text-green-600"
                : "text-slate-700"
            }
          />
          <span className="mt-6 text-lg text-gray-700 text-center">
            {loadingMessage}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
