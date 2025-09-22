"use client";
import React, { useEffect, useState } from "react";
import Protected from "../../../components/Protected";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import DashboardHeader from "@/components/ui/dashboard-header";
//import DashboardTabs from "@/components/ui/dashboard-tabs";

// Lazy load heavier components
const AssignedExams = dynamic(
  () => import("../../../components/student/StudentAssignedExams"),
  {
    ssr: false,
    loading: () => <TabLoadingSkeleton />,
  }
);
const ProgressTabReal = dynamic(
  () => import("../../../components/student/StudentProgress"),
  {
    ssr: false,
    loading: () => <TabLoadingSkeleton />,
  }
);
const ResultsTabReal = dynamic(
  () => import("@/components/student/StudentResults"),
  {
    ssr: false,
    loading: () => <TabLoadingSkeleton />,
  }
);

// Loading skeleton for dynamic tabs
function TabLoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full py-10"
    >
      <div className="flex flex-col items-center justify-center">
        <motion.div
          className="h-10 w-10 border-2 border-t-primary border-primary/30 rounded-full mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-sm text-gray-500">Loading content...</p>
      </div>
    </motion.div>
  );
}

// Temporary placeholder for Practice tab with improved styling
function PracticeTab() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 mt-4 text-center border border-gray-100">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">
        Practice Mode Coming Soon
      </h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto">
        Practice mode will allow you to test your knowledge with randomly
        generated questions based on your course material.
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
      >
        Get Notified When Available
      </motion.button>
    </div>
  );
}

type TabKey = "exams" | "progress" | "results" | "practice";

// Tab metadata with icons
const tabsMetadata: Record<TabKey, { label: string; icon: React.ReactNode }> = {
  exams: {
    label: "My Exams",
    icon: (
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
    ),
  },
  progress: {
    label: "My Progress",
    icon: (
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
          d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
        />
      </svg>
    ),
  },
  results: {
    label: "My Results",
    icon: (
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
          d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
        />
      </svg>
    ),
  },
  practice: {
    label: "Practice Mode",
    icon: (
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
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    ),
  },
};

export default function StudentDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<TabKey>("exams");
  const [isLoading, setIsLoading] = useState(true);

  // Keep local state in sync when URL changes (e.g., via navbar)
  useEffect(() => {
    const current = (search.get("tab") as TabKey) || "exams";
    if (tabsMetadata[current]) {
      setTab(current);
    } else {
      router.replace("/dashboard/student?tab=exams");
      setTab("exams");
    }

    // Add a small loading delay for smoother transitions
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, router]);

  // Handle tab change
  // const handleTabChange = (newTab: string) => {
  //   setTab(newTab as TabKey);
  //   router.push(`/dashboard/student?tab=${newTab}`);
  // };

  // Format tabs for DashboardTabs component
  // const formattedTabs = Object.entries(tabsMetadata).map(([key, value]) => ({
  //   key,
  //   label: value.label,
  // }));

  // Get current tab icon
  const currentTabIcon = tabsMetadata[tab].icon;

  // Render the appropriate tab content
  const renderTab = () => {
    if (isLoading) {
      return <TabLoadingSkeleton />;
    }

    switch (tab) {
      case "exams":
        return <AssignedExams />;
      case "progress":
        return <ProgressTabReal />;
      case "results":
        return <ResultsTabReal />;
      case "practice":
        return <PracticeTab />;
      default:
        return null;
    }
  };

  // Action button based on current tab
  // const getActionButton = () => {
  //   switch (tab) {
  //     case "exams":
  //       return (
  //         <motion.button
  //           whileHover={{ scale: 1.05 }}
  //           whileTap={{ scale: 0.95 }}
  //           className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
  //         >
  //           <svg
  //             xmlns="http://www.w3.org/2000/svg"
  //             className="h-4 w-4"
  //             fill="none"
  //             viewBox="0 0 24 24"
  //             stroke="currentColor"
  //           >
  //             <path
  //               strokeLinecap="round"
  //               strokeLinejoin="round"
  //               strokeWidth={2}
  //               d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
  //             />
  //           </svg>
  //           <span className="text-sm font-medium">Find Exams</span>
  //         </motion.button>
  //       );
  //     case "results":
  //       return (
  //         <motion.button
  //           whileHover={{ scale: 1.05 }}
  //           whileTap={{ scale: 0.95 }}
  //           className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
  //         >
  //           <svg
  //             xmlns="http://www.w3.org/2000/svg"
  //             className="h-4 w-4"
  //             fill="none"
  //             viewBox="0 0 24 24"
  //             stroke="currentColor"
  //           >
  //             <path
  //               strokeLinecap="round"
  //               strokeLinejoin="round"
  //               strokeWidth={2}
  //               d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
  //             />
  //           </svg>
  //           <span className="text-sm font-medium">Export Results</span>
  //         </motion.button>
  //       );
  //     default:
  //       return null;
  //   }
  // };

  return (
    <Protected requiredRole="student">
      <main className="min-h-screen p-6 bg-gray-50 font-poppins">
        <DashboardHeader
          title="Student Portal"
          subtitle="Access your exams, track progress, and view your results"
          icon={currentTabIcon}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Student" },
            { label: tabsMetadata[tab].label },
          ]}
        />

        {/* <DashboardTabs
          tabs={formattedTabs}
          currentTab={tab}
          onTabChange={handleTabChange}
          baseUrl="/dashboard/student"
          actionButton={getActionButton()}
        /> */}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="pt-2"
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </Protected>
  );
}
