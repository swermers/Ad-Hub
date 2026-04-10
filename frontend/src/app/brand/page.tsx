"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const BrandProfileView = dynamic(() => import("./BrandProfileView"), {
  loading: () => <LoadingSkeleton />,
});
const StyleGuidesView = dynamic(() => import("./StyleGuidesView"), {
  loading: () => <LoadingSkeleton />,
});

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-prism rounded-2xl border border-[#554334]/30 p-6 space-y-3">
          <div className="h-4 w-32 bg-[#353437]/50 rounded" />
          <div className="h-8 w-full bg-[#353437]/40 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

type Tab = "profile" | "guides";

export default function BrandPage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF9500] mb-1">Brand</p>
          <h1 className="text-2xl font-black tracking-tight text-[#E5E1E4]">
            Brand & Voice
          </h1>
        </div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1 p-1 rounded-xl bg-[#1b1b1d]/60 border border-[#554334]/30 w-fit"
        >
          <button
            onClick={() => setTab("profile")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
              tab === "profile"
                ? "bg-[#FF9500] text-[#2d1600]"
                : "text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/5"
            }`}
          >
            Brand Profile
          </button>
          <button
            onClick={() => setTab("guides")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
              tab === "guides"
                ? "bg-[#FF9500] text-[#2d1600]"
                : "text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/5"
            }`}
          >
            Style Guides
          </button>
        </motion.div>
      </div>

      {/* Tab Content */}
      {tab === "profile" ? <BrandProfileView /> : <StyleGuidesView />}
    </div>
  );
}
