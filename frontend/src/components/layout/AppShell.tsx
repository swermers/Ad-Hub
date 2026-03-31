"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { NotificationDropdown } from "@/components/NotificationDropdown";

function TopNav() {
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  const topLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/content", label: "Campaigns" },
    { href: "/analytics", label: "Analytics" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav border-b border-white/5 flex justify-between items-center px-8 h-20">
      <div className="flex items-center gap-8 entrance-fade stagger-1">
        <span className="text-2xl font-bold tracking-tighter text-[#E5E1E4]">
          Iterant
        </span>
        <div className="hidden md:flex gap-6 ml-4">
          {topLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors duration-200 haptic-btn ${
                  isActive
                    ? "text-[#FF9500] font-bold border-b-2 border-[#FF9500] pb-1"
                    : "text-[#E5E1E4]/70 hover:text-[#E5E1E4]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4 entrance-fade stagger-1">
        <Link
          href="/products/new"
          className="bg-[#FF9500] text-[#2d1600] px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-95 hover-lift"
        >
          New Product
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="p-2 text-[#E5E1E4]/70 hover:bg-white/10 rounded-full transition-all hover-lift"
            >
              <span className="material-symbols-outlined">notifications</span>
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
          <button className="p-2 text-[#E5E1E4]/70 hover:bg-white/10 rounded-full transition-all hover-lift">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  return (
    <AuthGuard>
      {isLoginPage ? (
        children
      ) : (
        <div className="min-h-screen bg-[#131315]">
          <TopNav />
          <Sidebar />
          <main className="ml-72 pt-28 min-h-screen relative overflow-hidden">
            <div className="px-12 pb-20">{children}</div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
