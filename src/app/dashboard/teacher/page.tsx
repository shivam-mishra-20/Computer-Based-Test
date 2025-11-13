"use client";
import React, { useEffect, useState } from "react";
import Protected from "../../../components/Protected";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TeacherDashboardHome from "@/components/teacher/TeacherDashboardHome";
import TeacherQuestionBank from "@/components/teacher/TeacherQuestionBank";
import TeacherExams from "@/components/teacher/TeacherExams";
import AIQuestionGenerator from "@/components/teacher/AIQuestionGenerator";
import SmartQuestionImport from "@/components/teacher/SmartQuestionImport";
import TeacherAnalytics from "@/components/teacher/TeacherAnalytics";
import CreatePaperFlow from "@/components/teacher/CreatePaperFlow";
import CreateExamFlow from "@/components/teacher/CreateExamFlow";
//import TeacherReports from "@/components/teacher/TeacherReports";
import QuestionPapers from "@/components/teacher/QuestionPapers";
import DashboardHeader from "@/components/ui/dashboard-header";
//import DashboardTabs from "@/components/ui/dashboard-tabs";

const TABS = [
  "dashboard",
  "create-paper",
  "create-exam",
  "bank",
  "exams",
  "ai",
  "import",
  "papers",
  "analytics",
  //"reports",
] as const;
type Tab = (typeof TABS)[number];

// Map tab keys to display names
const tabLabels: Record<Tab, string> = {
  dashboard: "Dashboard",
  "create-paper": "Create Paper",
  "create-exam": "Create Exam",
  bank: "Question Bank",
  exams: "Exams",
  ai: "AI Tools",
  import: "Smart Import",
  papers: "Question Papers",
  analytics: "Analytics",
  //reports: "Reports",
};

// Get icon for each tab
const getTabIcon = (tab: Tab) => {
  switch (tab) {
    case "dashboard":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
          />
        </svg>
      );
    case "bank":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
          />
        </svg>
      );
    case "exams":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      );
    case "ai":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
          />
        </svg>
      );
    case "import":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
      );
    case "create-paper":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 12.75h3.375m-3.375 3.75h3.375m-3.375 3.75h3.375m6.75-9v7.5a2.25 2.25 0 0 1-2.25 2.25h-12A2.25 2.25 0 0 1 3 18.75v-15A2.25 2.25 0 0 1 5.25 1.5h7.5a2.25 2.25 0 0 1 2.25 2.25v.75"
          />
        </svg>
      );
    case "create-exam":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
      );
    case "papers":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      );
    case "analytics":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"
          />
        </svg>
      );
    // case "reports":
    //   return (
    //     <svg
    //       xmlns="http://www.w3.org/2000/svg"
    //       className="h-5 w-5"
    //       fill="none"
    //       viewBox="0 0 24 24"
    //       stroke="currentColor"
    //     >
    //       <path
    //         strokeLinecap="round"
    //         strokeLinejoin="round"
    //         strokeWidth={2}
    //         d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
    //       />
    //     </svg>
    //   );
  }
};

export default function TeacherDashboardPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<Tab>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  //const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"}`,
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem("accessToken") || ""
              }`,
            },
          }
        );
        if (data.ok) {
          //const j = await data.json();
          //setReviewCount(j.total || 0);
        } else {
          //setReviewCount(0);
        }
      } catch {
        //setReviewCount(0);
      }
    })();
  }, []);

  // Ensure a default tab is always present in URL
  useEffect(() => {
    if (!search?.get("tab")) {
      router.replace("/dashboard/teacher?tab=dashboard");
      return;
    }

    const tabParam = search.get("tab") as Tab;
    if (TABS.includes(tabParam)) {
      setCurrentTab(tabParam);
    } else {
      router.replace("/dashboard/teacher?tab=dashboard");
    }

    // Add a small delay to simulate loading for smoother transitions
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, router]);

  // Create tab list for the DashboardTabs component
  //const tabList = TABS.map((tab) => ({ key: tab, label: tabLabels[tab] }));

  // Determine content based on selected tab
  let content: React.ReactNode = null;
  switch (currentTab) {
    case "dashboard":
      content = <TeacherDashboardHome />;
      break;
    case "create-paper":
      content = <CreatePaperFlow />;
      break;
    case "create-exam":
      content = <CreateExamFlow />;
      break;
    case "bank":
      content = <TeacherQuestionBank />;
      break;
    case "exams":
      content = <TeacherExams />;
      break;
    case "ai":
      content = <AIQuestionGenerator />;
      break;
    case "import":
      content = <SmartQuestionImport />;
      break;
    case "papers":
      content = <QuestionPapers />;
      break;
    case "analytics":
      content = <TeacherAnalytics />;
      break;
    // case "reports":
    //   content = <TeacherReports />;
    //   break;
  }

  // Action button with pending reviews notification
  // const reviewsButton = (
  //   <motion.button
  //     onClick={() => router.push("/dashboard/teacher/reviews")}
  //     className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg shadow-sm"
  //     whileHover={{ scale: 1.05 }}
  //     whileTap={{ scale: 0.98 }}
  //   >
  //     <svg
  //       xmlns="http://www.w3.org/2000/svg"
  //       className="h-4 w-4"
  //       fill="none"
  //       viewBox="0 0 24 24"
  //       stroke="currentColor"
  //     >
  //       <path
  //         strokeLinecap="round"
  //         strokeLinejoin="round"
  //         strokeWidth={2}
  //         d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
  //       />
  //     </svg>
  //     <span className="text-sm font-medium">Pending Reviews</span>
  //     {reviewCount > 0 && (
  //       <motion.div
  //         className="flex items-center justify-center h-5 w-5 bg-white text-amber-600 rounded-full text-xs font-bold"
  //         initial={{ scale: 0 }}
  //         animate={{ scale: 1 }}
  //         transition={{ type: "spring", stiffness: 500, damping: 15 }}
  //       >
  //         {reviewCount}
  //       </motion.div>
  //     )}
  //   </motion.button>
  // );

  // Action button based on current tab
  // const getActionButton = () => {
  //   switch (currentTab) {
  //     case "exams":
  //       return (
  //         <div className="flex items-center gap-3">
  //           {reviewsButton}
  //           <motion.button
  //             whileHover={{ scale: 1.05 }}
  //             whileTap={{ scale: 0.95 }}
  //             className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center"
  //           >
  //             <svg
  //               xmlns="http://www.w3.org/2000/svg"
  //               className="h-4 w-4 mr-1.5"
  //               fill="none"
  //               viewBox="0 0 24 24"
  //               stroke="currentColor"
  //             >
  //               <path
  //                 strokeLinecap="round"
  //                 strokeLinejoin="round"
  //                 strokeWidth={2}
  //                 d="M12 4.5v15m7.5-7.5h-15"
  //               />
  //             </svg>
  //             Create Exam
  //           </motion.button>
  //         </div>
  //       );
  //     case "bank":
  //       return (
  //         <div className="flex items-center gap-3">
  //           {reviewsButton}
  //           <motion.button
  //             whileHover={{ scale: 1.05 }}
  //             whileTap={{ scale: 0.95 }}
  //             className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center"
  //           >
  //             <svg
  //               xmlns="http://www.w3.org/2000/svg"
  //               className="h-4 w-4 mr-1.5"
  //               fill="none"
  //               viewBox="0 0 24 24"
  //               stroke="currentColor"
  //             >
  //               <path
  //                 strokeLinecap="round"
  //                 strokeLinejoin="round"
  //                 strokeWidth={2}
  //                 d="M12 4.5v15m7.5-7.5h-15"
  //               />
  //             </svg>
  //             Add Question
  //           </motion.button>
  //         </div>
  //       );
  //     default:
  //       return reviewsButton;
  //   }
  // };

  return (
    <Protected requiredRole="teacher">
      <main className="min-h-screen p-6 bg-gray-50 font-poppins">
        <DashboardHeader
          title="Teacher Portal"
          subtitle="Create and manage exams, questions, and review student work"
          icon={getTabIcon(currentTab)}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Teacher" },
            { label: tabLabels[currentTab] },
          ]}
        />

        {/* <DashboardTabs
          tabs={tabList}
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab as Tab)}
          baseUrl="/dashboard/teacher"
          actionButton={getActionButton()}
        /> */}

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-20"
            >
              <div className="flex flex-col items-center">
                <motion.div
                  className="h-8 w-8 border-2 border-t-purple-500 border-purple-200 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear" as const,
                  }}
                />
                <p className="mt-3 text-sm text-gray-500">Loading content...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="pt-2"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </Protected>
  );
}
