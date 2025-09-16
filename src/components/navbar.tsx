"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getToken, getUser, fetchMe, logout, User } from "../lib/auth";
import { useRouter, usePathname } from "next/navigation";

type Role = "admin" | "teacher" | "student" | null;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname(); // For active link detection
  const [isAuthed, setAuthed] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasToken = !!getToken();
        setAuthed(hasToken);
        if (!hasToken) {
          setRole(null);
          return;
        }
        const cached = getUser();
        if (cached?.role) {
          setRole((cached.role as Role) ?? null);
        } else {
          const me = (await fetchMe()) as User;
          setRole((me?.role as Role) ?? null);
        }
      } catch {
        setAuthed(false);
        setRole(null);
      }
    })();
  }, []);

  function onLogout() {
    logout();
    setAuthed(false);
    setRole(null);
    setOpen(false);
    router.push("/login");
  }

  // Build role-based menus (same logic as before)
  const menu = useMemo(() => {
    if (!isAuthed || !role) {
      return [
        { href: "/", label: "Home", icon: "home" },
        { href: "/theme", label: "Theme", icon: "palette" },
      ];
    }
    if (role === "admin") {
      return [
        { href: "/dashboard/admin", label: "Dashboard", icon: "dashboard" },
        { href: "/dashboard/admin?tab=users", label: "Users", icon: "users" },
        { href: "/dashboard/exam", label: "Exams", icon: "document-text" },
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
      ];
    }
    if (role === "teacher") {
      return [
        { href: "/dashboard/teacher", label: "Dashboard", icon: "dashboard" },
        {
          href: "/dashboard/teacher?tab=bank",
          label: "Question Bank",
          icon: "question",
        },
        { href: "/dashboard/exam", label: "Exams", icon: "document-text" },
        {
          href: "/dashboard/teacher?tab=ai",
          label: "AI Tools",
          icon: "sparkles",
        },
        {
          href: "/dashboard/teacher?tab=analytics",
          label: "Analytics",
          icon: "chart-pie",
        },
        {
          href: "/dashboard/teacher?tab=reports",
          label: "Reports",
          icon: "chart-bar",
        },
      ];
    }
    // student
    return [
      { href: "/dashboard/student", label: "Dashboard", icon: "dashboard" },
      { href: "/dashboard/exam", label: "My Exams", icon: "document-text" },
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
    ];
  }, [isAuthed, role]);

  // Helper to check if a menu item is active
  const isActive = (href: string) => {
    if (href.includes("?")) {
      return pathname === href.split("?")[0];
    }
    return pathname === href;
  };

  // Icon helper for menu items
  const getIcon = (name: string) => {
    switch (name) {
      case "home":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
        );
      case "dashboard":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
            />
          </svg>
        );
      case "users":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
        );
      case "document-text":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 0 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
        );
      case "chart-bar":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
        );
      case "chart-pie":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"
            />
          </svg>
        );
      case "question":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
            />
          </svg>
        );
      case "sparkles":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
            />
          </svg>
        );
      case "academic-cap":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 0 12 20.904a48.627 48.627 0 0 0 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 0 12 3.493a59.902 59.902 0 0 0 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 0 12 13.489a50.702 50.702 0 0 0 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 0 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
            />
          </svg>
        );
      case "clipboard":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
            />
          </svg>
        );
      case "palette":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="sticky top-0 w-full z-50">
      {/* Glassy background effect */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-gray-200/50 shadow-sm"></div>

      {/* Navbar content */}
      <div className="relative max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo section with animation */}
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label="Go to home"
          >
            {/* Plain neutral circular background removed per request; larger logo for better presence */}
            <div className="relative overflow-hidden rounded-full w-14 h-14 flex items-center justify-center shadow-sm transition-transform duration-300 ease-out transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Abhigyan Gurukul"
                width={56}
                height={56}
                className="object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-lg hidden sm:block transition-all">
                Abhigyan Gurukul
              </span>
              <span className="text-xs text-gray-500 hidden sm:block">
                Tree of Knowledge
              </span>
            </div>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-1">
            {menu.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-all duration-300
                    ${
                      active
                        ? "text-green-700 bg-green-50 font-medium shadow-sm"
                        : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
                    }`}
                >
                  <span
                    className={`transition-transform ${
                      active ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {getIcon(item.icon)}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 transform origin-left transition-transform duration-300"></div>
                  )}
                </Link>
              );
            })}

            {/* Auth button with animation */}
            {!isAuthed ? (
              <Link
                href="/login"
                className="ml-3 px-5 py-1.5 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:brightness-105"
              >
                Login
              </Link>
            ) : (
              <button
                onClick={onLogout}
                className="ml-3 px-5 py-1.5 rounded-full text-red-600 border border-red-200 hover:bg-red-50 font-medium text-sm transition-all duration-300"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile hamburger button with animation */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <div
              className={`w-5 h-0.5 bg-gray-600 rounded transition-all duration-300 ${
                open ? "transform rotate-45 translate-y-1.5" : "mb-1.5"
              }`}
            ></div>
            <div
              className={`w-5 h-0.5 bg-gray-600 rounded transition-all duration-300 ${
                open ? "opacity-0" : "mb-1.5"
              }`}
            ></div>
            <div
              className={`w-5 h-0.5 bg-gray-600 rounded transition-all duration-300 ${
                open ? "transform -rotate-45 -translate-y-1.5" : ""
              }`}
            ></div>
          </button>
        </div>
      </div>

      {/* Mobile menu with slide animation */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="relative bg-white shadow-lg">
          <div className="px-4 py-2 space-y-1">
            {menu.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? "text-green-700 bg-green-50 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className={active ? "text-green-600" : "text-gray-400"}>
                    {getIcon(item.icon)}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Auth button for mobile */}
            <div className="pt-2 pb-3">
              {!isAuthed ? (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium shadow-sm"
                >
                  Login
                </Link>
              ) : (
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-3 rounded-lg text-red-600 bg-red-50 font-medium"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
