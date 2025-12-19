"use client";
import React, { useEffect, useState } from "react";
import Protected from "../../../components/Protected";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminDashboardHome from "@/components/admin/AdminDashboardHome";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminExams from "@/components/admin/AdminExams";
import AdminGuidance from "@/components/admin/AdminGuidance";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminQuestionBank from "@/components/admin/AdminQuestionBank";
import CreatePaperFlow from "@/components/teacher/CreatePaperFlow";
import AdminPapers from "@/components/admin/AdminPapers";
import SmartQuestionImport from "@/components/teacher/SmartQuestionImport";
import DashboardHeader from "@/components/ui/dashboard-header";
//import DashboardTabs from "@/components/ui/dashboard-tabs";
const TABS = [
  "dashboard",
  "create-paper",
  "users",
  "exams",
  "analytics",
  "guidance",
  "questions",
  "papers",
  "smart-import",
] as const;
type Tab = (typeof TABS)[number];

// Map tab keys to display names
const tabLabels: Record<Tab, string> = {
  dashboard: "Dashboard",
  "create-paper": "Create Paper",
  users: "Users",
  exams: "Exams",
  analytics: "Analytics",
  guidance: "LLM Guidance",
  questions: "Question Bank",
  papers: "Question Papers",
  "smart-import": "Smart Import",
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
    case "users":
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
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
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
    case "guidance":
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
            d="M12 9a4 4 0 00-4 4v1a4 4 0 004 4v0a4 4 0 004-4v-1a4 4 0 00-4-4z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.95 6.95l-1.414-1.414M6.464 6.464 5.05 5.05"
          />
        </svg>
      );
    case "questions":
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
            d="M12 6v6m-3-3h6M4 6h16M4 12h16M4 18h16"
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9v10a2 2 0 01-2 2z"
          />
        </svg>
      );
    case "smart-import":
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
  }
};

export default function AdminDashboardPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<Tab>("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  // Ensure a default tab param exists for consistency with navbar
  useEffect(() => {
    // Guard against search possibly being null (it can be null briefly)
    const tabValue = search?.get("tab");
    if (!tabValue) {
      router.replace("/dashboard/admin?tab=dashboard");
      return;
    }

    const tabParam = tabValue as Tab;
    if (TABS.includes(tabParam)) {
      setCurrentTab(tabParam);
    } else {
      router.replace("/dashboard/admin?tab=dashboard");
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
      content = <AdminDashboardHome />;
      break;
    case "create-paper":
      content = <CreatePaperFlow />;
      break;
    case "users":
      content = <AdminUsers />;
      break;
    case "exams":
      content = <AdminExams />;
      break;
    case "analytics":
      content = <AdminAnalytics />;
      break;
    case "guidance":
      content = <AdminGuidance />;
      break;
    case "questions":
      content = <AdminQuestionBank />;
      break;
    case "papers":
      content = <AdminPapers />;
      break;
    case "smart-import":
      content = <SmartQuestionImport />;
      break;
  }

  // Action button based on current tab
  // const getActionButton = () => {
  //   switch (currentTab) {
  //     case "users":
  //       return (
  //         <motion.button
  //           whileHover={{ scale: 1.05 }}
  //           whileTap={{ scale: 0.95 }}
  //           className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center"
  //         >
  //           <svg
  //             xmlns="http://www.w3.org/2000/svg"
  //             className="h-4 w-4 mr-1.5"
  //             fill="none"
  //             viewBox="0 0 24 24"
  //             stroke="currentColor"
  //           >
  //             <path
  //               strokeLinecap="round"
  //               strokeLinejoin="round"
  //               strokeWidth={2}
  //               d="M12 4.5v15m7.5-7.5h-15"
  //             />
  //           </svg>
  //           Add New User
  //         </motion.button>
  //       );

  //     default:
  //       return null;
  //   }
  // };

  return (
    <Protected requiredRole="admin">
      <main className="min-h-screen p-6 bg-gray-50 font-poppins">
        <DashboardHeader
          title="Admin Panel"
          subtitle="Manage platform entities and view insights"
          icon={getTabIcon(currentTab)}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin" },
            { label: tabLabels[currentTab] },
          ]}
        />

        {/* <DashboardTabs
          tabs={tabList}
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab as Tab)}
          baseUrl="/dashboard/admin"
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
                  className="h-8 w-8 border-2 border-t-green-500 border-green-200 rounded-full"
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
