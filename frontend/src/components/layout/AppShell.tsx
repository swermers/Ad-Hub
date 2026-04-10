"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { isDemo } from "@/lib/api";

function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav border-b border-white/5 flex justify-between items-center px-4 md:px-8 h-16 md:h-20">
      <div className="flex items-center gap-4 md:gap-8 entrance-fade stagger-1">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-[#E5E1E4]/70 hover:bg-white/10 rounded-lg transition-all"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>
        <span className="text-xl md:text-2xl font-bold tracking-tighter text-[#E5E1E4]">
          Iterant
        </span>
      </div>
      <div className="flex items-center gap-2 md:gap-4 entrance-fade stagger-1">
        <Link
          href="/products/new"
          className="hidden sm:inline-flex bg-[#FF9500] text-[#2d1600] px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-95 hover-lift"
        >
          New Product
        </Link>
        <div className="flex items-center gap-1 md:gap-2">
          <div className="relative">
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="p-2 text-[#E5E1E4]/70 hover:bg-white/10 rounded-full transition-all hover-lift"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#FF9500] ring-2 ring-[#131315]" />
              )}
            </button>
            <NotificationDropdown
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              onUnreadCountChange={handleUnreadCountChange}
            />
          </div>
          <Link href="/settings" className="p-2 text-[#E5E1E4]/70 hover:bg-white/10 rounded-full transition-all hover-lift inline-flex">
            <span className="material-symbols-outlined text-xl">account_circle</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function DemoBanner() {
  return (
    <div className="mx-4 md:mx-12 mt-2 mb-0 px-4 md:px-5 py-3 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/20 flex items-center gap-3">
      <span className="text-[#FF9500] text-xs md:text-sm font-bold uppercase tracking-widest shrink-0">Demo</span>
      <span className="text-[#E5E1E4]/70 text-xs md:text-sm">
        You&apos;re viewing a read-only demo with sample data. Actions like generating content or posting are disabled.
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <AuthGuard>
      {isLoginPage ? (
        children
      ) : (
        <div className="min-h-screen bg-[#131315]">
          <TopNav onMenuToggle={() => setSidebarOpen((v) => !v)} />

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="md:ml-72 pt-20 md:pt-28 min-h-screen relative overflow-hidden">
            {isDemo() && <DemoBanner />}
            <div className="px-4 md:px-12 pb-20">{children}</div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
