"use client";

import { motion } from "framer-motion";

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const barHeights = [45, 72, 58, 88, 65, 92, 78, 96];

const insights = [
  {
    color: "#FF9500",
    title: "Reallocate 18% of APAC social budget to programmatic.",
    desc: "Predicted +3.2% conversion lift based on attribution modeling.",
    time: "2h ago",
  },
  {
    color: "#c6c4df",
    title: "Email open rates declining in EMEA — subject line fatigue detected.",
    desc: "A/B test new templates. Confidence: 94%.",
    time: "5h ago",
  },
  {
    color: "#ffbd7f",
    title: "Organic search volume spike for branded terms in AMER.",
    desc: "Capitalize with landing page refresh. Est. +12k sessions/week.",
    time: "8h ago",
  },
];

const campaigns = [
  {
    label: "Direct Traffic",
    value: "142.8k",
    change: "+2.4%",
    positive: true,
    progress: 68,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    label: "Social Velocity",
    value: "89.4k",
    change: "+18.1%",
    positive: true,
    progress: 54,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    label: "Email Engagement",
    value: "12.1k",
    change: "-0.4%",
    positive: false,
    progress: 22,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffb4ab" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <polyline points="22,4 12,13 2,4" />
      </svg>
    ),
  },
  {
    label: "Organic Discovery",
    value: "64.2k",
    change: "+5.9%",
    positive: true,
    progress: 42,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
];

const avatarUrls = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCbNzpxzeZ2KjsuEnH45MancHSVjFNK9MKBjchD8Q4MVo3vh0F-OQ7Y116nor0FJKjhF2nzvLVefITmJuxUk3XNuLnReGE4hGKXKkklKX-XIKcGqNb5_TskYnXpJJ-Z9Odc3Dtvzzt3Vji7-zUEnt68ADK4koXS71yFChTBlJp5Dq0VyBWFtWmK40XAWFRKllzQp_NO9RsQ9v-RRgyk_hfsUoZvOuLVG1j9J4Grk4x_1haxkw0RGnXVlPLs5V88y53-cc-uWWD3Lw5J",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBSpSijP6D9IRd__96UER5gEjwijypc8UKOWz2FrrS-4XmeD-8UCg5E0kB5OeBaoUmPUa_K5sng-p_1DQnp8bnJS5KtCfIEZ1blspkMqPyf54P7oEed_n6IBL5NQDu16KwXcCdUSpAfCiS548E6M41AvyEJ8I3yirJl0_k-7xbNDA_qOiSJVSN42HTfeA_xcXzS89QliCvuLSSibKiR5iyMpYVjxFV0jzqk0RGye5iSYm9Lbetmz0GlWB2cDS8AvUcHyq53cE1a33Xh",
];

export default function CommandCenterPage() {
  return (
    <motion.div
      className="min-h-screen bg-[#131315] text-[#E5E1E4] px-4 md:px-8 py-8 pb-28"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.header
        className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10"
        variants={stagger}
      >
        <div>
          <motion.p
            className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3"
            {...fadeUp(0)}
          >
            Command Center
          </motion.p>
          <motion.h1
            className="text-4xl md:text-7xl font-bold tracking-tighter leading-[0.95]"
            {...fadeUp(0.05)}
          >
            Global Performance{" "}
            <span className="text-[#E5E1E4]/30">Intelligence.</span>
          </motion.h1>
        </div>

        <motion.div
          className="flex flex-col items-start md:items-end gap-2 shrink-0"
          {...fadeUp(0.1)}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
            </span>
            <span className="text-xs text-[#E5E1E4]/60 font-medium">
              Live Precision Tracking
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#E5E1E4]/30 tracking-wider">
            SERVER_STATUS: OPTIMAL [0.04ms]
          </span>
        </motion.div>
      </motion.header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* ROI Card */}
        <motion.div
          className="glass-prism md:col-span-8 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 md:p-8 overflow-hidden"
          {...fadeUp(0.12)}
        >
          <p className="text-xs text-[#E5E1E4]/50 uppercase tracking-widest mb-1">
            Annual Net ROI
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="text-6xl md:text-9xl font-black text-[#FF9500] leading-none tracking-tighter">
                +842%
              </span>
              <p className="text-sm text-[#E5E1E4]/50 mt-2">
                <span className="text-[#FF9500]">&#9650; 12.4%</span> vs prev.
                period
              </p>
            </div>

            {/* Animated Bar Chart */}
            <div className="flex items-end gap-[6px] h-28 md:h-36">
              {barHeights.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-5 md:w-7 rounded-t-md bg-gradient-to-t from-[#FF9500]/80 to-[#ffbd7f]/60 cursor-pointer"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{
                    duration: 0.7,
                    delay: 0.3 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    height: "100%",
                    backgroundColor: "#FF9500",
                    transition: { duration: 0.25 },
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Conversion Donut Card */}
        <motion.div
          className="glass-prism md:col-span-4 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-4"
          {...fadeUp(0.18)}
        >
          <p className="text-xs text-[#E5E1E4]/50 uppercase tracking-widest self-start">
            Conversion Rate
          </p>
          <div className="relative">
            <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
              <defs>
                <linearGradient
                  id="donutGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#ff9500" />
                  <stop offset="100%" stopColor="#ffbd7f" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#353437"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#donutGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="210 282"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
                style={{ strokeDashoffset: 0 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-[#FF9500]">24.8%</span>
            </div>
          </div>
          <p className="text-xs text-[#E5E1E4]/40">
            Benchmark <span className="text-[#E5E1E4]/60">18%</span>
          </p>
          <motion.button
            className="mt-1 px-5 py-2 rounded-full text-xs font-semibold bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 hover:bg-[#FF9500]/20 transition-colors"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Analyze Segment
          </motion.button>
        </motion.div>

        {/* Global Map */}
        <motion.div
          className="md:col-span-12 lg:col-span-7 rounded-2xl bg-[#1b1b1d] border border-[#554334]/20 overflow-hidden relative min-h-[320px]"
          {...fadeUp(0.22)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6tkJN8qK3-bgCH40o1oCGwR50P9JZrFwnVkGpxJ9pvBmlY4RacYrPeOC-qOkAjY738aJVOc6B8GBMUBLAjzos5qN-erzmu9ZP2hznvi1XaPT99Gl-P2mWv6N_kI-czAyivyfSL-3bIj7rEaM51MNxsQIxEZqzgdYIUUJrC1c75t7uxCsVlljY8N8li2q-JJ49dXKQHIECSSOScIR9bGvzD0YrMv9J4g0tnKnxM2rQ40oDcAVEZvO7uSpYjNlCs-6u7TyK92ZEGw0f"
            alt="Global reach map"
            className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale pointer-events-none"
          />
          <div className="relative z-10 p-6 md:p-8 flex flex-col justify-between h-full gap-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-3">
                Expansion Pulse
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#353437]/70 text-[#E5E1E4]/60 border border-[#554334]/30">
                  LATENCY: 12ms
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF9500]" />
                  </span>
                  LIVE
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              {[
                { region: "EMEA", value: "14.2M" },
                { region: "APAC", value: "32.8M" },
                { region: "AMER", value: "28.1M" },
              ].map((r) => (
                <div key={r.region}>
                  <p className="text-[10px] text-[#E5E1E4]/40 font-mono uppercase tracking-wider">
                    {r.region}
                  </p>
                  <p className="text-xl font-bold text-[#E5E1E4]">{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          className="glass-prism md:col-span-12 lg:col-span-5 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
          {...fadeUp(0.26)}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold tracking-tight">
              AI Insights
            </h3>
            <div className="flex -space-x-2">
              {avatarUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt="Team member"
                  className="w-7 h-7 rounded-full border-2 border-[#1b1b1d] object-cover"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {insights.map((item, i) => (
              <motion.div
                key={i}
                className="border-l-4 rounded-r-lg bg-[#353437]/30 p-4 cursor-pointer hover:bg-[#353437]/50 transition-colors"
                style={{ borderColor: item.color }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              >
                <p className="text-sm font-semibold leading-snug mb-1">
                  {item.title}
                </p>
                <p className="text-xs text-[#E5E1E4]/40 leading-relaxed">
                  {item.desc}
                </p>
                <p className="text-[10px] text-[#E5E1E4]/25 mt-2 font-mono">
                  {item.time}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Active Campaign Cluster */}
      <motion.section className="mt-8" {...fadeUp(0.32)}>
        <h2 className="text-lg font-bold tracking-tight mb-4">
          Active Campaign Cluster
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {campaigns.map((c, i) => (
            <motion.div
              key={c.label}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 + i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-lg bg-[#353437]/50">{c.icon}</span>
                <span
                  className={`text-xs font-semibold ${
                    c.positive ? "text-[#FF9500]" : "text-[#ffb4ab]"
                  }`}
                >
                  {c.change}
                </span>
              </div>
              <p className="text-2xl font-bold mb-0.5">{c.value}</p>
              <p className="text-xs text-[#E5E1E4]/40 mb-3">{c.label}</p>
              <div className="w-full h-1.5 rounded-full bg-[#353437]/60 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: c.positive
                      ? "linear-gradient(90deg, #FF9500, #ffbd7f)"
                      : "linear-gradient(90deg, #ffb4ab, #ff897a)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${c.progress}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.6 + i * 0.1,
                    ease: "easeOut",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Floating Generate Report FAB */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#FF9500] text-[#2d1600] font-semibold text-sm shadow-lg shadow-[#FF9500]/20 hover:shadow-[#FF9500]/40 transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Generate Report
      </motion.button>
    </motion.div>
  );
}
