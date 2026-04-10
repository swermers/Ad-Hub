"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function StyleGuidesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/brand"); }, [router]);
  return null;
}
