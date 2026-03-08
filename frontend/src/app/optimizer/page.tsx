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

  const actionColors: Record<string, string> = {
    paused: "text-red-600 bg-red-50",
    promoted: "text-green-600 bg-green-50",
    kept: "text-gray-600 bg-gray-50",
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  // Summary stats from logs
  const totalPaused = logs.filter((l) => l.action === "paused").length;
  const totalPromoted = logs.filter((l) => l.action === "promoted").length;
  const totalSpendSaved = logs
    .filter((l) => l.action === "paused")
    .reduce((sum, l) => sum + (l.metrics_snapshot.spend || 0), 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Ad Optimizer</h1>
      <p className="text-gray-500 mb-6">
        Automatically pause low-performing ads and promote winners.
      </p>

      {/* Product selector */}
      <div className="mb-6">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
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
            <div className="p-4 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-700">{totalPaused}</p>
              <p className="text-sm text-red-600">Ads Paused</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-700">{totalPromoted}</p>
              <p className="text-sm text-green-600">Winners Promoted</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-700">${totalSpendSaved.toFixed(2)}</p>
              <p className="text-sm text-blue-600">Spend on Paused Ads</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {(["config", "log", "analysis"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "analysis" && !analysis) handleLoadAnalysis();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "config" ? "Configuration" : tab === "log" ? "Decision Log" : "Winner Analysis"}
              </button>
            ))}
          </div>

          {/* Config tab */}
          {activeTab === "config" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Auto-Optimization</p>
                  <p className="text-sm text-gray-500">
                    Runs every {config.check_interval_hours} hours when enabled
                  </p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.enabled ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      config.enabled ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Impressions Before Decision
                  </label>
                  <input
                    type="number"
                    value={config.min_impressions}
                    onChange={(e) => setConfig({ ...config, min_impressions: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max CPM (kill threshold)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.max_cpm}
                    onChange={(e) => setConfig({ ...config, max_cpm: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min CTR % (kill threshold)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.min_ctr}
                    onChange={(e) => setConfig({ ...config, min_ctr: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Winner CTR % (promote threshold)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.winner_ctr_threshold}
                    onChange={(e) => setConfig({ ...config, winner_ctr_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Winner Budget Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.winner_budget_multiplier}
                    onChange={(e) => setConfig({ ...config, winner_budget_multiplier: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check Interval (hours)
                  </label>
                  <input
                    type="number"
                    value={config.check_interval_hours}
                    onChange={(e) => setConfig({ ...config, check_interval_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
                <button
                  onClick={handleRunOptimization}
                  disabled={running}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {running ? "Running..." : "Run Optimization Now"}
                </button>
              </div>
            </div>
          )}

          {/* Log tab */}
          {activeTab === "log" && (
            <div>
              {logs.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No optimization decisions yet. Run the optimizer to start.
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${actionColors[log.action] || ""}`}>
                        {log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        {log.headline && (
                          <p className="text-sm font-medium text-gray-900 truncate">{log.headline}</p>
                        )}
                        <p className="text-sm text-gray-600">{log.reason}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
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
                      <span className="text-xs text-gray-400 whitespace-nowrap">
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
                <p className="text-center py-8 text-gray-500">Loading analysis...</p>
              ) : (
                <>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-700">{analysis.summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-green-700 mb-2">Winning Patterns</h3>
                      <ul className="space-y-1">
                        {analysis.winning_patterns.map((p, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">+</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-red-700 mb-2">Losing Patterns</h3>
                      <ul className="space-y-1">
                        {analysis.losing_patterns.map((p, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">-</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-blue-700 mb-2">Recommended Next Angles</h3>
                    <ul className="space-y-1">
                      {analysis.recommended_angles.map((a, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">&#x2192;</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={handleLoadAnalysis}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
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
