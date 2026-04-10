"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function IntelligenceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/autopilot"); }, [router]);
  return null;
}
