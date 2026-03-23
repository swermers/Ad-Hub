"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      {isLoginPage ? (
        children
      ) : (
        <div className="flex h-screen">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar — always visible on desktop, slide-in on mobile */}
          <div
            className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {/* Mobile header with hamburger */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900">Ad-Hub</h1>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
