"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { getUser, User } from "../lib/auth";

interface MenuItemProps {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  delay?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({
  href,
  label,
  icon,
  isActive,
  delay = 0,
}) => {
  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      className="mb-1"
    >
      <Link href={href}>
        <motion.div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
            isActive
              ? "bg-green-50 text-green-700 font-medium"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className={`${isActive ? "text-green-600" : "text-gray-400"}`}>
            {getMenuIcon(icon)}
          </span>
          <span className="text-sm">{label}</span>
          {isActive && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute left-0 w-1 h-8 bg-green-500 rounded-r"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.div>
      </Link>
    </motion.li>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [roleMenu, setRoleMenu] = useState<
    Array<{ href: string; label: string; icon: string }>
  >([]);

  // Toggle sidebar collapse on mobile
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  useEffect(() => {
    // Get user on mount
    const cachedUser = getUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    // Role-based menu items
    const role = cachedUser?.role;
    if (role === "admin") {
      setRoleMenu([
        { href: "/dashboard/admin", label: "Dashboard", icon: "dashboard" },
        { href: "/dashboard/admin?tab=users", label: "Users", icon: "users" },
        {
          href: "/dashboard/admin?tab=exams",
          label: "Exams",
          icon: "document-text",
        },
        {
          href: "/dashboard/leaves",
          label: "Leave Management",
          icon: "calendar",
        },
        {
          href: "/dashboard/admin?tab=eod-reports",
          label: "EOD Reports",
          icon: "file-text",
        },
        {
          href: "/dashboard/admin?tab=reports",
          label: "Reports",
          icon: "chart-bar",
        },
        {
          href: "/dashboard/admin?tab=analytics",
          label: "Analytics",
          icon: "chart-pie",
        },
      ]);
    } else if (role === "teacher") {
      setRoleMenu([
        { href: "/dashboard/teacher", label: "Home", icon: "home" },
        {
          href: "/dashboard/teacher?tab=content",
          label: "Content",
          icon: "video",
        },
        {
          href: "/dashboard/teacher?tab=batches",
          label: "Batches",
          icon: "users",
        },
        {
          href: "/dashboard/teacher?tab=exams",
          label: "Exams",
          icon: "document-text",
        },
        {
          href: "/dashboard/teacher?tab=doubts",
          label: "Doubts",
          icon: "question",
        },
        {
          href: "/dashboard/teacher?tab=performance",
          label: "Reports",
          icon: "chart-bar",
        },
        {
          href: "/dashboard/teacher?tab=announcements",
          label: "Announcements",
          icon: "megaphone",
        },
        {
          href: "/dashboard/teacher?tab=ai",
          label: "AI Tools",
          icon: "sparkles",
        },
      ]);
    } else {
      setRoleMenu([
        {
          href: "/dashboard/student?tab=exams",
          label: "Exams",
          icon: "document-text",
        },
        {
          href: "/dashboard/student?tab=progress",
          label: "Progress",
          icon: "chart-bar",
        },
        {
          href: "/dashboard/student?tab=practice",
          label: "Practice",
          icon: "academic-cap",
        },
        {
          href: "/dashboard/student?tab=results",
          label: "Results",
          icon: "clipboard",
        },
      ]);
    }

    // Close sidebar when route changes on mobile
    setCollapsed(window.innerWidth < 768);
  }, []);

  // Common menu items for all roles
  const commonMenu = [
    { href: "/dashboard", label: "Overview", icon: "home" },
    { href: "/dashboard/exam", label: "Exams", icon: "document-text" },
    { href: "/dashboard/schedule", label: "Schedule", icon: "calendar" },
  ];

  // Check if a menu item is active
  const isActive = (href: string) => {
    const [base, query] = href.split("?");
    if (!pathname) return false;

    // Exact match for paths without query params
    if (!query) return pathname === base;

    // For paths with query params
    if (!pathname.startsWith(base)) return false;

    // Special handling for dashboard tabs
    if (
      base === "/dashboard/admin" ||
      base === "/dashboard/teacher" ||
      base === "/dashboard/student"
    ) {
      const tabParam = query?.split("=")[1];
      if (!tabParam) return pathname === base;

      // URL has tab param
      const urlParams = new URLSearchParams(window.location.search);
      const currentTab = urlParams.get("tab");
      return (
        currentTab === tabParam || (!currentTab && tabParam === "dashboard")
      );
    }

    return true;
  };

  return (
    <>
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-16 left-4 z-30">
        <motion.button
          onClick={toggleSidebar}
          className="p-2 bg-white rounded-md shadow-md border border-gray-100"
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? "M4 6h16M4 12h16m-7 6h7" : "M6 18L18 6M6 6l12 12"}
            />
          </svg>
        </motion.button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(!collapsed || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
            className="h-[calc(100vh-4rem)] py-6 px-3 border-r border-gray-100 bg-white shadow-sm overflow-y-auto fixed left-0 top-16 bottom-0 z-20 md:relative md:top-0 md:h-full"
          >
            {/* Sidebar header */}
            <div className="mb-6 px-3">
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center"
              >
                <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h2 className="ml-2 text-lg font-semibold text-gray-800">
                  {user?.role === "admin"
                    ? "Admin Panel"
                    : user?.role === "teacher"
                    ? "Teacher Portal"
                    : "Student Area"}
                </h2>
              </motion.div>

              {user && (
                <motion.div
                  className="flex items-center mt-3 py-2 px-2 bg-gray-50 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700">
                    {user.name?.charAt(0) || "U"}
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-800">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                      {user.email}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Role-specific menu */}
            <div className="mb-6">
              <motion.h3
                className="text-xs uppercase text-gray-400 font-medium tracking-wider px-4 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Main Menu
              </motion.h3>
              <ul className="relative">
                {roleMenu.map((item, index) => (
                  <MenuItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive(item.href)}
                    delay={index}
                  />
                ))}
              </ul>
            </div>

            {/* Common menu */}
            <div>
              <motion.h3
                className="text-xs uppercase text-gray-400 font-medium tracking-wider px-4 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                General
              </motion.h3>
              <ul className="relative">
                {commonMenu.map((item, index) => (
                  <MenuItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive(item.href)}
                    delay={index + 5}
                  />
                ))}
              </ul>
            </div>

            {/* Help section */}
            <motion.div
              className="mt-8 p-3 bg-blue-50 rounded-lg border border-blue-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-start">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-500 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="ml-2">
                  <h4 className="text-sm font-medium text-blue-700">
                    Need Help?
                  </h4>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Check our help center or contact support.
                  </p>
                </div>
              </div>
              <button className="mt-2 text-xs w-full py-1.5 bg-white border border-blue-200 rounded text-blue-600 font-medium hover:bg-blue-50 transition-colors">
                View Help Center
              </button>
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay when sidebar is open on mobile */}
      {!collapsed && window.innerWidth < 768 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}

// Helper function to render menu icons
function getMenuIcon(name: string) {
  switch (name) {
    case "home":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      );
    case "dashboard":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    case "document-text":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    case "document":
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case "calendar":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
          />
        </svg>
      );
    case "users":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    case "chart-bar":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
      );
    case "chart-pie":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    case "clipboard":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
          />
        </svg>
      );
    case "question":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    case "file-text":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case "academic-cap":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 0 12 20.904a48.62 48.62 0 0 0 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 0 12 3.493a59.903 59.903 0 0 0 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 0 12 13.489a50.702 50.702 0 0 0 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 0 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
          />
        </svg>
      );
    case "sparkles":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    case "plus":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      );
    case "upload":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      );
  }
}
