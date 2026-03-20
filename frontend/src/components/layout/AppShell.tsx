"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <AuthGuard>
      {isLoginPage ? (
        children
      ) : (
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
