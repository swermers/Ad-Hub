"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  api,
  AnalyticsOverview,
  TopPerformer,
  Insights,
  Product,
} from "@/lib/api";

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedProduct, days]);

  async function loadProducts() {
    try {
      const prods = await api.listProducts();
      setProducts(prods);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    try {
      const [ov, top] = await Promise.all([
        api.getOverview(selectedProduct || undefined, days),
        api.getTopPerformers(selectedProduct || undefined),
      ]);
      setOverview(ov);
      setTopPerformers(top);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights() {
    if (!selectedProduct) {
      alert("Select a product to generate insights.");
      return;
    }
    setInsightsLoading(true);
    try {
      const ins = await api.getInsights(selectedProduct);
      setInsights(ins);
    } catch (err) {
      console.error("Failed to load insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }

  async function handleCollect() {
    try {
      const result = await api.triggerCollect();
      alert(`Collected metrics for ${result.collected} posts.`);
      await loadAnalytics();
    } catch (err) {
      console.error("Failed to collect:", err);
      alert("Failed to trigger metric collection.");
    }
  }

  const statCards = overview
    ? [
        {
          label: "Impressions",
          value: overview.total_impressions.toLocaleString(),
          raw: overview.total_impressions,
          color: "#FF9500",
        },
        {
          label: "Clicks",
          value: overview.total_clicks.toLocaleString(),
          raw: overview.total_clicks,
          color: "#ffbd7f",
        },
        {
          label: "Avg CTR",
          value: `${overview.avg_ctr.toFixed(2)}%`,
          raw: overview.avg_ctr,
          color: "#4ade80",
        },
        {
          label: "Likes",
          value: overview.total_likes.toLocaleString(),
          raw: overview.total_likes,
          color: "#a4a7ff",
        },
        {
          label: "Shares",
          value: overview.total_shares.toLocaleString(),
          raw: overview.total_shares,
          color: "#c6c4df",
        },
        {
          label: "Comments",
          value: overview.total_comments.toLocaleString(),
          raw: overview.total_comments,
          color: "#ffb4ab",
        },
        {
          label: "Conversions",
          value: overview.total_conversions.toLocaleString(),
          raw: overview.total_conversions,
          color: "#FF9500",
        },
        {
          label: "Spend",
          value: `$${overview.total_spend.toFixed(2)}`,
          raw: overview.total_spend,
          color: "#ffbd7f",
        },
      ]
    : [];

  /* ── Loading skeleton ── */
  if (loading)
    return (
      <motion.div
        className="animate-pulse space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <div className="h-3 w-28 bg-[#FF9500]/20 rounded" />
            <div className="h-12 w-72 bg-[#E5E1E4]/10 rounded" />
            <div className="h-4 w-48 bg-[#E5E1E4]/5 rounded" />
          </div>
          <div className="h-10 w-36 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-40 bg-[#1b1b1d]/60 rounded-xl" />
          <div className="h-10 w-40 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-28"
            />
          ))}
        </div>
        <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 space-y-3">
          <div className="h-5 w-48 bg-[#E5E1E4]/10 rounded" />
          <div className="h-12 w-full bg-[#E5E1E4]/5 rounded" />
          <div className="h-12 w-full bg-[#E5E1E4]/5 rounded" />
          <div className="h-12 w-full bg-[#E5E1E4]/5 rounded" />
        </div>
        <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-32" />
      </motion.div>
    );

  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      {/* ── Header ── */}
      <motion.div {...fadeUp(0)} className="mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
                Analytics
              </p>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4]">
              Performance<span className="text-[#E5E1E4]/30"> Metrics.</span>
            </h1>
            <p className="text-[#E5E1E4]/40 text-sm mt-2 font-mono">
              SYS:ANALYTICS {/* // */} {overview ? `${overview.posts_tracked} posts tracked` : "initializing"} {/* // */} {new Date().toLocaleDateString()}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCollect}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1b1b1d]/60 backdrop-blur-xl border border-[#554334]/30 text-[#E5E1E4]/70 hover:border-[#FF9500]/40 hover:text-[#FF9500] transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Collect Metrics
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div {...fadeUp(0.08)} className="flex flex-wrap gap-3 mb-8">
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </motion.div>

      {/* ── Stat Cards Grid ── */}
      <motion.div {...fadeUp(0.12)} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ borderColor: "rgba(255,149,0,0.35)", y: -2 }}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 transition-all"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-[#E5E1E4] tracking-tight">
              {card.value}
            </p>
            <div className="mt-3 h-1 rounded-full bg-[#353437] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: card.color }}
                initial={{ width: 0 }}
                animate={{ width: card.raw > 0 ? "100%" : "0%" }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {overview && (
        <motion.p
          {...fadeUp(0.2)}
          className="text-xs text-[#E5E1E4]/30 mb-8 font-mono"
        >
          TRACKING: {overview.posts_tracked} posts // PERIOD: {overview.period_days} days // STATUS: ACTIVE
        </motion.p>
      )}

      {/* ── Top Performers Table ── */}
      <motion.div {...fadeUp(0.24)} className="mb-8">
        <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-4">
          Top Performing Content
        </p>
        {topPerformers.length === 0 ? (
          <motion.div
            {...fadeUp(0.28)}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-[#353437]/40">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#E5E1E4]/50">
              No performance data yet
            </p>
            <p className="text-xs text-[#E5E1E4]/30 mt-1.5 mb-5">
              Publish content and collect metrics to see your top performers here.
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCollect}
              className="inline-flex px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold cursor-pointer"
            >
              Collect Metrics
            </motion.button>
          </motion.div>
        ) : (
          <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#554334]/30">
                  <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                    Content
                  </th>
                  <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                    Platform
                  </th>
                  <th className="text-right px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                    Impressions
                  </th>
                  <th className="text-right px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                    Clicks
                  </th>
                  <th className="text-right px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                    CTR
                  </th>
                  <th className="text-right px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                    Likes
                  </th>
                  <th className="text-right px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                    Shares
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#554334]/15">
                {topPerformers.map((tp, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="hover:bg-[#FF9500]/[0.03] transition-colors cursor-default group"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#E5E1E4] group-hover:text-[#FF9500] transition-colors">
                        {tp.title || "Untitled"}
                      </p>
                      {tp.body_preview && (
                        <p className="text-xs text-[#E5E1E4]/30 mt-0.5 truncate max-w-xs font-mono">
                          {tp.body_preview}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#353437]/50 text-[#E5E1E4]/60 border border-[#554334]/20 capitalize">
                        {tp.platform}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-[#E5E1E4]/80 font-mono text-xs">
                      {tp.total_impressions.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-[#E5E1E4]/80 font-mono text-xs">
                      {tp.total_clicks.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[#FF9500] font-semibold text-xs">
                        {(tp.avg_ctr * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-[#E5E1E4]/80 font-mono text-xs">
                      {tp.total_likes.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-[#E5E1E4]/80 font-mono text-xs">
                      {tp.total_shares.toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── AI Insights ── */}
      <motion.div {...fadeUp(0.32)}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
            AI Insights
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={loadInsights}
            disabled={insightsLoading}
            className="px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#FF9500]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {insightsLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Insights
              </span>
            )}
          </motion.button>
        </div>

        {insights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                  Key Insights
                </h3>
              </div>
              <ul className="space-y-3">
                {insights.insights.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                    className="text-sm text-[#E5E1E4]/70 flex gap-2.5 leading-relaxed"
                  >
                    <span className="text-[#FF9500] mt-0.5 shrink-0">&#8226;</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                  Recommendations
                </h3>
              </div>
              <ul className="space-y-3">
                {insights.recommendations.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.46 + i * 0.08 }}
                    className="text-sm text-[#E5E1E4]/70 flex gap-2.5 leading-relaxed"
                  >
                    <span className="text-[#4ade80] mt-0.5 shrink-0">&#8226;</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c6c4df]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">
                  Content Angles
                </h3>
              </div>
              <ul className="space-y-3">
                {(insights.content_angles || []).map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.52 + i * 0.08 }}
                    className="text-sm text-[#E5E1E4]/70 flex gap-2.5 leading-relaxed"
                  >
                    <span className="text-[#c6c4df] mt-0.5 shrink-0">&#8226;</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        ) : (
          <motion.div
            {...fadeUp(0.36)}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-[#353437]/40">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#E5E1E4]/50">
              No insights generated yet
            </p>
            <p className="text-xs text-[#E5E1E4]/30 mt-1.5 mb-5 max-w-md mx-auto">
              Select a product and click &quot;Generate Insights&quot; to get
              AI-powered optimization recommendations.
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={loadInsights}
              disabled={insightsLoading || !selectedProduct}
              className="inline-flex px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate Insights
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
