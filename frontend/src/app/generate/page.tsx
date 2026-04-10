"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function GenerateRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/studio"); }, [router]);
  return null;
}
