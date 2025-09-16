"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-600 via-transparent to-transparent opacity-20"></div>
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23075e54' fill-opacity='0.08'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        ></div>
      </div>

      {/* (Logo removed from outside the card; it will appear inside the card below) */}

      {/* Card with glassmorphism */}
      <div className="relative z-10 max-w-2xl w-full font-poppins">
        <div className="backdrop-blur-md bg-white/80 rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          {/* Decorative accent */}
          <div className="h-1.5 bg-gradient-to-r from-green-600 to-emerald-400"></div>

          <div className="p-8 md:p-10">
            {/* Logo placed inside the card (neutral styling, no green bg) */}
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-white/0 shadow-sm">
                <Image
                  src="/logo.png"
                  alt="Abhigyan Gurukul Logo"
                  width={80}
                  height={80}
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
            </div>

            <header className="mb-6 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-accent bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                Abhigyan Gurukul <br /> Exam Portal
              </h1>
              <p className="text-sm text-muted mt-2">
                Professional center for conducting and managing exams
              </p>
              <p className="text-sm font-medium text-gray-600 mt-3 bg-green-50 py-1.5 px-3 rounded-full inline-block">
                Smart, Secure & AI-Powered Exam Management
              </p>
            </header>

            <section className="mb-8">
              <h2 className="text-base font-medium mb-5 text-center text-gray-700">
                Select Your Role to Continue
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login/student"
                  className="group flex flex-col items-center px-4 py-5 rounded-xl bg-primary bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-200 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="mb-2 p-2.5 bg-blue-400/30 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 0 12 20.904a48.627 48.627 0 0 0 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 0 12 3.493a59.902 59.902 0 0 0 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 0 12 13.489a50.702 50.702 0 0 0 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 0 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                      />
                    </svg>
                  </div>
                  <span className="font-medium">Student Login</span>
                </Link>

                <Link
                  href="/login/teacher"
                  className="group flex flex-col items-center px-4 py-5 rounded-xl bg-cta bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-200 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="mb-2 p-2.5 bg-purple-400/30 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
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
                  </div>
                  <span className="font-medium">Teacher Login</span>
                </Link>

                <Link
                  href="/login/admin"
                  className="group flex flex-col items-center px-4 py-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="mb-2 p-2.5 bg-gray-100 rounded-full text-gray-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                      />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700">Admin Login</span>
                </Link>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-500">
          <p>© 2025 Abhigyan Gurukul | Powered by CBT Platform</p>
        </footer>
      </div>
    </main>
  );
}
