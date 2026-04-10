"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function BrandProfileRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/brand"); }, [router]);
  return null;
}
