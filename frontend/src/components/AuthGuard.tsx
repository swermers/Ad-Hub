"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const checkAuth = async () => {
      // Don't check auth on the login page
      if (pathname === "/login") {
        setStatus("authenticated");
        return;
      }

      const token = localStorage.getItem("iterant_token");
      if (!token) {
        setStatus("unauthenticated");
        router.push("/login");
        return;
      }

      // Verify token is still valid
      try {
        await api.checkAuth();
        setStatus("authenticated");
      } catch {
        localStorage.removeItem("iterant_token");
        setStatus("unauthenticated");
        router.push("/login");
      }
    };
    checkAuth();
  }, [pathname, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
