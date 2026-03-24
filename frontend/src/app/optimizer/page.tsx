"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  api,
  type Product,
  type OptimizationConfigData,
  type OptimizationLogItem,
  type WinnerAnalysis,
  type RunOptimizationStatus,
} from "@/lib/api";

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function OptimizerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [config, setConfig] = useState<OptimizationConfigData | null>(null);
  const [logs, setLogs] = useState<OptimizationLogItem[]>([]);
  const [analysis, setAnalysis] = useState<WinnerAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [iterating, setIterating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"config" | "log" | "analysis">("config");

  useEffect(() => {
    api.listProducts().then(setProducts).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (productId) {
      api.getOptimizationConfig(productId).then(setConfig).catch(console.error);
      api.getOptimizationLog(productId).then(setLogs).catch(console.error);
    }
  }, [productId]);

  const handleSaveConfig = async () => {
    if (!productId || !config) return;
    setSaving(true);
    try {
      const updated = await api.updateOptimizationConfig(productId, {
        min_impressions: config.min_impressions,
        max_cpm: config.max_cpm,
        min_ctr: config.min_ctr,
        winner_ctr_threshold: config.winner_ctr_threshold,
        winner_budget_multiplier: config.winner_budget_multiplier,
        check_interval_hours: config.check_interval_hours,
        enabled: config.enabled,
        auto_iterate: config.auto_iterate,
        max_iterations: config.max_iterations,
      });
      setConfig(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleRunOptimization = async () => {
    if (!productId) return;
    setRunning(true);
    try {
      const result = await api.runOptimization(productId);
      const interval = setInterval(async () => {
        const s: RunOptimizationStatus = await api.getOptimizationStatus(productId, result.task_id);
        if (s.status === "completed" || s.status === "failed") {
          clearInterval(interval);
          setRunning(false);
          const updatedLogs = await api.getOptimizationLog(productId);
          setLogs(updatedLogs);
        }
      }, 2000);
    } catch {
      setRunning(false);
    }
  };

  const handleLoadAnalysis = async () => {
    if (!productId) return;
    try {
      const result = await api.getWinnerAnalysis(productId);
      setAnalysis(result);
      setActiveTab("analysis");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerAutoIterate = async () => {
    if (!productId) return;
    setIterating(true);
    try {
      const result = await api.triggerAutoIterate(productId);
      const interval = setInterval(async () => {
        const s = await api.getAutoIterateStatus(productId, result.task_id);
        if (s.status === "completed" || s.status === "failed") {
          clearInterval(interval);
          setIterating(false);
          const updatedLogs = await api.getOptimizationLog(productId);
          setLogs(updatedLogs);
          const updatedConfig = await api.getOptimizationConfig(productId);
          setConfig(updatedConfig);
        }
      }, 3000);
    } catch {
      setIterating(false);
    }
  };

  const handleResetIterations = async () => {
    if (!productId) return;
    await api.resetIterations(productId);
    const updatedConfig = await api.getOptimizationConfig(productId);
    setConfig(updatedConfig);
  };

  const actionColors: Record<string, string> = {
    paused: "text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/20",
    promoted: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20",
    kept: "text-[#dbc2ad] bg-white/5 border-[#dbc2ad]/20",
    auto_iterate: "text-[#FF9500] bg-[#FF9500]/10 border-[#FF9500]/20",
  };

  // Loading skeleton
  if (loading)
    return (
      <motion.div
        className="animate-pulse space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="space-y-3">
          <div className="h-3 w-28 bg-[#FF9500]/20 rounded" />
          <div className="h-12 w-80 bg-[#E5E1E4]/10 rounded" />
          <div className="h-4 w-56 bg-[#E5E1E4]/5 rounded" />
        </div>
        <div className="h-12 w-full max-w-md bg-[#1b1b1d]/60 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-24" />
          ))}
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 bg-[#1b1b1d]/60 rounded-xl" />
          ))}
        </div>
        <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-[#E5E1E4]/5 rounded-xl" />
          ))}
        </div>
      </motion.div>
    );

  // Summary stats from logs
  const totalPaused = logs.filter((l) => l.action === "paused").length;
  const totalPromoted = logs.filter((l) => l.action === "promoted").length;
  const totalSpendSaved = logs
    .filter((l) => l.action === "paused")
    .reduce((sum, l) => sum + (l.metrics_snapshot.spend || 0), 0);

  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
                Ad Optimizer
              </p>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4]">
              Performance<span className="text-[#E5E1E4]/30">{" "}Optimizer.</span>
            </h1>
            <p className="text-[#E5E1E4]/40 text-sm mt-2 font-mono">
              SYS:AD_OPTIMIZER // auto-pause losers, promote winners // {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Product selector */}
      <motion.div {...fadeUp(0.06)} className="mb-8">
        <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-2">
          Select Product
        </p>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full max-w-md px-4 py-3 glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
        >
          <option value="">Select a product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </motion.div>

      {productId && config && (
        <>
          {/* Summary stat cards */}
          <motion.div {...fadeUp(0.1)} className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Ads Paused" value={totalPaused} color="#ffb4ab" delay={0.1} />
            <StatCard label="Winners Promoted" value={totalPromoted} color="#4ade80" delay={0.18} />
            <StatCard
              label="Spend on Paused"
              value={`$${totalSpendSaved.toFixed(2)}`}
              color="#FF9500"
              delay={0.26}
            />
          </motion.div>

          {/* Tabs */}
          <motion.div {...fadeUp(0.16)} className="flex gap-1 mb-8">
            <div className="flex rounded-2xl border border-[#554334]/30 overflow-hidden backdrop-blur-xl">
              {(["config", "log", "analysis"] as const).map((tab) => (
                <motion.button
                  key={tab}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "analysis" && !analysis) handleLoadAnalysis();
                  }}
                  className={`px-5 py-2.5 text-xs font-semibold transition-all ${
                    activeTab === tab
                      ? "bg-[#FF9500] text-[#2d1600]"
                      : "bg-[#1b1b1d]/60 text-[#E5E1E4]/50 hover:bg-[#1b1b1d]/80"
                  }`}
                >
                  {tab === "config" ? "Configuration" : tab === "log" ? "Decision Log" : "Winner Analysis"}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Config tab */}
          {activeTab === "config" && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Auto-Optimization toggle */}
              <motion.div
                className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
                whileHover={{ borderColor: "rgba(255,149,0,0.25)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
                      Auto-Optimization
                    </p>
                    <p className="text-sm text-[#E5E1E4]/40">
                      Runs every {config.check_interval_hours} hours when enabled
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.enabled ? "bg-[#FF9500]" : "bg-[#353437]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#131315] shadow transition-transform ${
                        config.enabled ? "left-6" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </motion.div>

              {/* Threshold config grid */}
              <motion.div
                className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
                whileHover={{ borderColor: "rgba(255,149,0,0.15)" }}
              >
                <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-5">
                  Thresholds
                </p>
                <div className="grid grid-cols-2 gap-5">
                  <InputField
                    label="Min Impressions Before Decision"
                    type="number"
                    value={config.min_impressions}
                    onChange={(v) => setConfig({ ...config, min_impressions: Number(v) })}
                  />
                  <InputField
                    label="Max CPM (kill threshold)"
                    type="number"
                    step="0.5"
                    value={config.max_cpm}
                    onChange={(v) => setConfig({ ...config, max_cpm: Number(v) })}
                  />
                  <InputField
                    label="Min CTR % (kill threshold)"
                    type="number"
                    step="0.1"
                    value={config.min_ctr}
                    onChange={(v) => setConfig({ ...config, min_ctr: Number(v) })}
                  />
                  <InputField
                    label="Winner CTR % (promote threshold)"
                    type="number"
                    step="0.1"
                    value={config.winner_ctr_threshold}
                    onChange={(v) => setConfig({ ...config, winner_ctr_threshold: Number(v) })}
                  />
                  <InputField
                    label="Winner Budget Multiplier"
                    type="number"
                    step="0.5"
                    value={config.winner_budget_multiplier}
                    onChange={(v) => setConfig({ ...config, winner_budget_multiplier: Number(v) })}
                  />
                  <InputField
                    label="Check Interval (hours)"
                    type="number"
                    value={config.check_interval_hours}
                    onChange={(v) => setConfig({ ...config, check_interval_hours: Number(v) })}
                  />
                </div>
              </motion.div>

              {/* Auto-Iterate Flywheel */}
              <motion.div
                className="glass-prism rounded-2xl border border-[#FF9500]/20 bg-[#FF9500]/5 backdrop-blur-xl p-6 space-y-4"
                whileHover={{ borderColor: "rgba(255,149,0,0.35)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
                      Auto-Iterate Flywheel
                    </p>
                    <p className="text-sm text-[#E5E1E4]/40 max-w-lg">
                      When enabled, automatically generates the next batch of ads after finding winners.
                      Analyzes winning patterns and creates evolved variations.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, auto_iterate: !config.auto_iterate })}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-4 ${
                      config.auto_iterate ? "bg-[#FF9500]" : "bg-[#353437]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#131315] shadow transition-transform ${
                        config.auto_iterate ? "left-6" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
                      Max Iterations (safety cap)
                    </label>
                    <input
                      type="number"
                      value={config.max_iterations}
                      onChange={(e) => setConfig({ ...config, max_iterations: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#FF9500]/20 bg-[#1b1b1d]/80 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="glass-prism rounded-2xl border border-[#FF9500]/20 bg-[#1b1b1d]/60 backdrop-blur-xl px-5 py-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-1">
                      Progress
                    </p>
                    <p className="text-2xl font-bold text-[#FF9500]">
                      {config.iterations_run}
                      <span className="text-[#E5E1E4]/20"> / {config.max_iterations}</span>
                    </p>
                  </div>
                  {config.iterations_run > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleResetIterations}
                      className="px-4 py-2.5 text-xs font-semibold text-[#FF9500] bg-[#1b1b1d]/60 border border-[#FF9500]/20 rounded-xl hover:bg-[#FF9500]/10 transition-colors"
                    >
                      Reset Counter
                    </motion.button>
                  )}
                </div>
              </motion.div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold disabled:opacity-50 shadow-lg shadow-[#FF9500]/10 hover:shadow-[#FF9500]/25 transition-shadow"
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRunOptimization}
                  disabled={running}
                  className="px-6 py-2.5 bg-[#FF9500]/15 text-[#FF9500] border border-[#FF9500]/20 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-[#FF9500]/25 transition-colors"
                >
                  {running ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-[#FF9500]/30 border-t-[#FF9500] rounded-full animate-spin" />
                      Running...
                    </span>
                  ) : (
                    "Run Optimization Now"
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleTriggerAutoIterate}
                  disabled={iterating}
                  className="px-6 py-2.5 bg-[#FF9500]/15 text-[#FF9500] border border-[#FF9500]/20 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-[#FF9500]/25 transition-colors"
                >
                  {iterating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-[#FF9500]/30 border-t-[#FF9500] rounded-full animate-spin" />
                      Iterating...
                    </span>
                  ) : (
                    "Run Auto-Iterate Now"
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Log tab */}
          {activeTab === "log" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {logs.length === 0 ? (
                <motion.div
                  className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center"
                  {...fadeUp(0.1)}
                >
                  <p className="text-sm font-semibold text-[#E5E1E4]/50">No optimization decisions yet</p>
                  <p className="text-xs text-[#E5E1E4]/30 mt-1.5">
                    Run the optimizer to start seeing decisions here.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
                    Decision History ({logs.length})
                  </p>
                  {logs.map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ borderColor: "rgba(255,149,0,0.2)" }}
                      className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-4 flex items-start gap-4"
                    >
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${
                          actionColors[log.action] || "text-[#E5E1E4]/50 bg-white/5 border-white/10"
                        }`}
                      >
                        {log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        {log.headline && (
                          <p className="text-sm font-semibold text-[#E5E1E4] truncate">{log.headline}</p>
                        )}
                        <p className="text-sm text-[#E5E1E4]/50 mt-0.5">{log.reason}</p>
                        <div className="flex gap-4 mt-2">
                          {log.metrics_snapshot.impressions !== undefined && (
                            <MetricPill label="IMP" value={String(log.metrics_snapshot.impressions)} />
                          )}
                          {log.metrics_snapshot.ctr !== undefined && (
                            <MetricPill label="CTR" value={`${log.metrics_snapshot.ctr.toFixed(2)}%`} />
                          )}
                          {log.metrics_snapshot.cpm !== undefined && (
                            <MetricPill label="CPM" value={`$${log.metrics_snapshot.cpm.toFixed(2)}`} />
                          )}
                          {log.metrics_snapshot.spend !== undefined && (
                            <MetricPill label="SPEND" value={`$${log.metrics_snapshot.spend.toFixed(2)}`} />
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#E5E1E4]/30 whitespace-nowrap font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Analysis tab */}
          {activeTab === "analysis" && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {!analysis ? (
                <motion.div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center">
                  <span className="w-5 h-5 border-2 border-[#FF9500]/30 border-t-[#FF9500] rounded-full animate-spin inline-block mb-3" />
                  <p className="text-sm text-[#E5E1E4]/50">Loading analysis...</p>
                </motion.div>
              ) : (
                <>
                  {/* Summary */}
                  <motion.div
                    {...fadeUp(0.08)}
                    className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
                  >
                    <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
                      Analysis Summary
                    </p>
                    <p className="text-sm text-[#E5E1E4]/60 leading-relaxed">{analysis.summary}</p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Winning patterns */}
                    <motion.div
                      {...fadeUp(0.14)}
                      className="glass-prism rounded-2xl border border-[#4ade80]/15 bg-[#4ade80]/[0.03] backdrop-blur-xl p-6"
                    >
                      <p className="text-[#4ade80] text-[11px] font-black uppercase tracking-[0.2em] mb-4">
                        Winning Patterns
                      </p>
                      <ul className="space-y-2.5">
                        {analysis.winning_patterns.map((p, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: 0.2 + i * 0.06 }}
                            className="text-sm text-[#E5E1E4]/60 flex items-start gap-2.5"
                          >
                            <span className="text-[#4ade80] mt-0.5 shrink-0 font-bold">+</span>
                            <span>{p}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>

                    {/* Losing patterns */}
                    <motion.div
                      {...fadeUp(0.18)}
                      className="glass-prism rounded-2xl border border-[#ffb4ab]/15 bg-[#ffb4ab]/[0.03] backdrop-blur-xl p-6"
                    >
                      <p className="text-[#ffb4ab] text-[11px] font-black uppercase tracking-[0.2em] mb-4">
                        Losing Patterns
                      </p>
                      <ul className="space-y-2.5">
                        {analysis.losing_patterns.map((p, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: 0.2 + i * 0.06 }}
                            className="text-sm text-[#E5E1E4]/60 flex items-start gap-2.5"
                          >
                            <span className="text-[#ffb4ab] mt-0.5 shrink-0 font-bold">-</span>
                            <span>{p}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>

                  {/* Recommended angles */}
                  <motion.div
                    {...fadeUp(0.22)}
                    className="glass-prism rounded-2xl border border-[#FF9500]/15 bg-[#FF9500]/[0.03] backdrop-blur-xl p-6"
                  >
                    <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-4">
                      Recommended Next Angles
                    </p>
                    <ul className="space-y-2.5">
                      {analysis.recommended_angles.map((a, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: 0.3 + i * 0.06 }}
                          className="text-sm text-[#E5E1E4]/60 flex items-start gap-2.5"
                        >
                          <span className="text-[#FF9500] mt-0.5 shrink-0">&#x2192;</span>
                          <span>{a}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>

                  <motion.button
                    {...fadeUp(0.28)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLoadAnalysis}
                    className="px-5 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm font-semibold text-[#E5E1E4]/60 hover:text-[#FF9500] hover:border-[#FF9500]/30 transition-colors"
                  >
                    Refresh Analysis
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

/** Animated stat card */
function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number | string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ borderColor: `${color}33` }}
      className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight" style={{ color }}>
        {value}
      </p>
      <div className="mt-3 h-1 rounded-full bg-[#353437] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: typeof value === "number" && value > 0 ? "100%" : typeof value === "string" ? "65%" : "0%" }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

/** Styled form input field */
function InputField({
  label,
  type = "text",
  step,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  step?: string;
  value: number | string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/80 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
      />
    </div>
  );
}

/** Compact metric pill for decision log entries */
function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#E5E1E4]/30">
      <span className="font-bold uppercase tracking-wider text-[#E5E1E4]/20">{label}</span>
      {value}
    </span>
  );
}
