"use client";
import React, { useState } from "react";
import AppSidebar from "@/components/admin/app-management/AppSidebar";

export default function AppManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Layout wrapper */}
      <div className="flex min-h-screen">
        {/* Sidebar - Fixed on desktop, slide-in on mobile */}
        <aside 
          className={`
            fixed lg:sticky top-0 left-0 h-screen z-50 flex-shrink-0
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <AppSidebar onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col min-h-screen w-full">
          {/* Mobile Top Bar - Sticky, not fixed */}
          <header className="sticky top-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 z-30 flex items-center px-4 lg:hidden shadow-sm">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
              aria-label="Open sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="ml-3 flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-[10px] font-bold">AM</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm">App Management</span>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        /* Thin scrollbar for content */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

