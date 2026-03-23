"use client";

import { useEffect, useState } from "react";
import {
  api,
  type Product,
  type OptimizationConfigData,
  type OptimizationLogItem,
  type WinnerAnalysis,
  type RunOptimizationStatus,
} from "@/lib/api";

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
    paused: "text-[#ffb4ab] bg-[#ffb4ab]/10",
    promoted: "text-[#4ade80] bg-[#4ade80]/10",
    kept: "text-[#dbc2ad] bg-white/5",
    auto_iterate: "text-purple-600 bg-purple-50",
  };

  if (loading) return <div className="text-[#E5E1E4]/50">Loading...</div>;

  // Summary stats from logs
  const totalPaused = logs.filter((l) => l.action === "paused").length;
  const totalPromoted = logs.filter((l) => l.action === "promoted").length;
  const totalSpendSaved = logs
    .filter((l) => l.action === "paused")
    .reduce((sum, l) => sum + (l.metrics_snapshot.spend || 0), 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#E5E1E4] mb-2">Ad Optimizer</h1>
      <p className="text-[#E5E1E4]/50 mb-6">
        Automatically pause low-performing ads and promote winners.
      </p>

      {/* Product selector */}
      <div className="mb-6">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21] text-[#E5E1E4]"
        >
          <option value="">Select a product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {productId && config && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-[#ffb4ab]/10 rounded-xl">
              <p className="text-2xl font-bold text-[#ffb4ab]">{totalPaused}</p>
              <p className="text-sm text-[#ffb4ab]">Ads Paused</p>
            </div>
            <div className="p-4 bg-[#4ade80]/10 rounded-xl">
              <p className="text-2xl font-bold text-[#4ade80]">{totalPromoted}</p>
              <p className="text-sm text-[#4ade80]">Winners Promoted</p>
            </div>
            <div className="p-4 bg-[#FF9500]/10 rounded-xl">
              <p className="text-2xl font-bold text-[#FF9500]">${totalSpendSaved.toFixed(2)}</p>
              <p className="text-sm text-[#FF9500]">Spend on Paused Ads</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-white/10">
            {(["config", "log", "analysis"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "analysis" && !analysis) handleLoadAnalysis();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-[#FF9500] text-[#FF9500]"
                    : "border-transparent text-[#E5E1E4]/50 hover:text-[#dbc2ad]"
                }`}
              >
                {tab === "config" ? "Configuration" : tab === "log" ? "Decision Log" : "Winner Analysis"}
              </button>
            ))}
          </div>

          {/* Config tab */}
          {activeTab === "config" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-[#E5E1E4]">Auto-Optimization</p>
                  <p className="text-sm text-[#E5E1E4]/50">
                    Runs every {config.check_interval_hours} hours when enabled
                  </p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.enabled ? "bg-[#FF9500]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#201f21] shadow transition-transform ${
                      config.enabled ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                    Min Impressions Before Decision
                  </label>
                  <input
                    type="number"
                    value={config.min_impressions}
                    onChange={(e) => setConfig({ ...config, min_impressions: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                    Max CPM (kill threshold)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.max_cpm}
                    onChange={(e) => setConfig({ ...config, max_cpm: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                    Min CTR % (kill threshold)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.min_ctr}
                    onChange={(e) => setConfig({ ...config, min_ctr: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                    Winner CTR % (promote threshold)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.winner_ctr_threshold}
                    onChange={(e) => setConfig({ ...config, winner_ctr_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                    Winner Budget Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.winner_budget_multiplier}
                    onChange={(e) => setConfig({ ...config, winner_budget_multiplier: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                    Check Interval (hours)
                  </label>
                  <input
                    type="number"
                    value={config.check_interval_hours}
                    onChange={(e) => setConfig({ ...config, check_interval_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Auto-Iterate Flywheel */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-purple-900">Auto-Iterate Flywheel</p>
                    <p className="text-sm text-purple-700">
                      When enabled, automatically generates the next batch of ads after finding winners.
                      Analyzes winning patterns and creates evolved variations.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, auto_iterate: !config.auto_iterate })}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-4 ${
                      config.auto_iterate ? "bg-purple-600" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#201f21] shadow transition-transform ${
                        config.auto_iterate ? "left-6" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-purple-800 mb-1">
                      Max Iterations (safety cap)
                    </label>
                    <input
                      type="number"
                      value={config.max_iterations}
                      onChange={(e) => setConfig({ ...config, max_iterations: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border border-purple-300 rounded-lg text-sm"
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-purple-700">Progress</p>
                    <p className="text-lg font-bold text-purple-900">
                      {config.iterations_run} / {config.max_iterations}
                    </p>
                  </div>
                  {config.iterations_run > 0 && (
                    <button
                      onClick={handleResetIterations}
                      className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-[#201f21] border border-purple-300 rounded-lg hover:bg-purple-50"
                    >
                      Reset Counter
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-6 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
                <button
                  onClick={handleRunOptimization}
                  disabled={running}
                  className="px-6 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {running ? "Running..." : "Run Optimization Now"}
                </button>
                <button
                  onClick={handleTriggerAutoIterate}
                  disabled={iterating}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {iterating ? "Iterating..." : "Run Auto-Iterate Now"}
                </button>
              </div>
            </div>
          )}

          {/* Log tab */}
          {activeTab === "log" && (
            <div>
              {logs.length === 0 ? (
                <p className="text-center py-8 text-[#E5E1E4]/50">
                  No optimization decisions yet. Run the optimizer to start.
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-[#201f21] rounded-lg border border-white/10">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${actionColors[log.action] || ""}`}>
                        {log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        {log.headline && (
                          <p className="text-sm font-medium text-[#E5E1E4] truncate">{log.headline}</p>
                        )}
                        <p className="text-sm text-[#dbc2ad]">{log.reason}</p>
                        <div className="flex gap-3 mt-1 text-xs text-[#E5E1E4]/40">
                          {log.metrics_snapshot.impressions !== undefined && (
                            <span>{log.metrics_snapshot.impressions} imp</span>
                          )}
                          {log.metrics_snapshot.ctr !== undefined && (
                            <span>{log.metrics_snapshot.ctr.toFixed(2)}% CTR</span>
                          )}
                          {log.metrics_snapshot.cpm !== undefined && (
                            <span>${log.metrics_snapshot.cpm.toFixed(2)} CPM</span>
                          )}
                          {log.metrics_snapshot.spend !== undefined && (
                            <span>${log.metrics_snapshot.spend.toFixed(2)} spent</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-[#E5E1E4]/40 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analysis tab */}
          {activeTab === "analysis" && (
            <div className="space-y-6">
              {!analysis ? (
                <p className="text-center py-8 text-[#E5E1E4]/50">Loading analysis...</p>
              ) : (
                <>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-sm text-[#dbc2ad]">{analysis.summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-[#4ade80] mb-2">Winning Patterns</h3>
                      <ul className="space-y-1">
                        {analysis.winning_patterns.map((p, i) => (
                          <li key={i} className="text-sm text-[#dbc2ad] flex items-start gap-2">
                            <span className="text-[#4ade80] mt-0.5">+</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#ffb4ab] mb-2">Losing Patterns</h3>
                      <ul className="space-y-1">
                        {analysis.losing_patterns.map((p, i) => (
                          <li key={i} className="text-sm text-[#dbc2ad] flex items-start gap-2">
                            <span className="text-[#ffb4ab] mt-0.5">-</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#FF9500] mb-2">Recommended Next Angles</h3>
                    <ul className="space-y-1">
                      {analysis.recommended_angles.map((a, i) => (
                        <li key={i} className="text-sm text-[#dbc2ad] flex items-start gap-2">
                          <span className="text-[#FF9500] mt-0.5">&#x2192;</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={handleLoadAnalysis}
                    className="px-4 py-2 border border-white/10 rounded-lg text-sm"
                  >
                    Refresh Analysis
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
