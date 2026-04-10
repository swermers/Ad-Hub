"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const ScheduleView = dynamic(() => import("./ScheduleView"), {
  loading: () => <LoadingSkeleton />,
});
const AnalyticsView = dynamic(() => import("./AnalyticsView"), {
  loading: () => <LoadingSkeleton />,
});
const IntelligenceView = dynamic(() => import("./IntelligenceView"), {
  loading: () => <LoadingSkeleton />,
});
const AgentView = dynamic(() => import("./AgentView"), {
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

const TABS = [
  { key: "schedule", label: "Schedule", icon: "calendar_month" },
  { key: "analytics", label: "Analytics", icon: "bar_chart" },
  { key: "intelligence", label: "Intelligence", icon: "psychology" },
  { key: "agent", label: "Agent", icon: "smart_toy" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function AutopilotPage() {
  const [tab, setTab] = useState<Tab>("schedule");

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF9500] mb-1">Autopilot</p>
          <h1 className="text-2xl font-black tracking-tight text-[#E5E1E4]">
            Automation & Insights
          </h1>
        </div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1 p-1 rounded-xl bg-[#1b1b1d]/60 border border-[#554334]/30 w-fit overflow-x-auto"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                tab === t.key
                  ? "bg-[#FF9500] text-[#2d1600]"
                  : "text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Tab Content */}
      {tab === "schedule" && <ScheduleView />}
      {tab === "analytics" && <AnalyticsView />}
      {tab === "intelligence" && <IntelligenceView />}
      {tab === "agent" && <AgentView />}
    </div>
  );
}
