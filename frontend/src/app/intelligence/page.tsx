"use client";

import { useEffect, useState } from "react";
import {
  api,
  type Product,
  type IntelligenceDashboard,
  type IntelligenceConfigData,
  type CompetitorData,
  type TrendSignalData,
  type HookPatternData,
  type EvidenceItemData,
  type IntelligenceBriefSummary,
  type IntelligenceBriefData,
} from "@/lib/api";

type Tab = "overview" | "competitors" | "trends" | "hooks" | "evidence" | "briefs" | "config";

export default function IntelligencePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Data
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);
  const [config, setConfig] = useState<IntelligenceConfigData | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [trends, setTrends] = useState<TrendSignalData[]>([]);
  const [hooks, setHooks] = useState<HookPatternData[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItemData[]>([]);
  const [briefs, setBriefs] = useState<IntelligenceBriefSummary[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<IntelligenceBriefData | null>(null);

  // UI state
  const [running, setRunning] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: "", website_url: "", description: "" });
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);

  useEffect(() => {
    api.listProducts().then(setProducts).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!productId) return;
    api.getIntelligenceDashboard(productId).then(setDashboard).catch(console.error);
    api.getIntelligenceConfig(productId).then(setConfig).catch(console.error);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    if (activeTab === "competitors") api.listCompetitors(productId).then(setCompetitors).catch(console.error);
    if (activeTab === "trends") api.listTrends(productId).then(setTrends).catch(console.error);
    if (activeTab === "hooks") api.listHookPatterns(productId).then(setHooks).catch(console.error);
    if (activeTab === "evidence") api.listEvidence(productId).then(setEvidence).catch(console.error);
    if (activeTab === "briefs") api.listBriefs(productId).then(setBriefs).catch(console.error);
  }, [productId, activeTab]);

  const pollTask = async (taskId: string, onDone: () => void) => {
    const interval = setInterval(async () => {
      try {
        const s = await api.getIntelligenceTaskStatus(productId, taskId);
        if (s.status === "completed" || s.status === "failed") {
          clearInterval(interval);
          setRunning("");
          onDone();
        }
      } catch {
        clearInterval(interval);
        setRunning("");
      }
    }, 3000);
  };

  const handleRunCycle = async () => {
    if (!productId) return;
    setRunning("cycle");
    try {
      const { task_id } = await api.runIntelligenceCycle(productId);
      pollTask(task_id, () => {
        api.getIntelligenceDashboard(productId).then(setDashboard);
      });
    } catch { setRunning(""); }
  };

  const handleScanCompetitors = async () => {
    setRunning("competitors");
    try {
      const { task_id } = await api.scanCompetitors(productId);
      pollTask(task_id, () => api.listCompetitors(productId).then(setCompetitors));
    } catch { setRunning(""); }
  };

  const handleScanTrends = async () => {
    setRunning("trends");
    try {
      const { task_id } = await api.scanTrends(productId);
      pollTask(task_id, () => api.listTrends(productId).then(setTrends));
    } catch { setRunning(""); }
  };

  const handleAnalyzeHooks = async () => {
    setRunning("hooks");
    try {
      const { task_id } = await api.analyzeHooks(productId);
      pollTask(task_id, () => api.listHookPatterns(productId).then(setHooks));
    } catch { setRunning(""); }
  };

  const handleGatherEvidence = async () => {
    setRunning("evidence");
    try {
      const { task_id } = await api.gatherEvidence(productId);
      pollTask(task_id, () => api.listEvidence(productId).then(setEvidence));
    } catch { setRunning(""); }
  };

  const handleGenerateBrief = async () => {
    setRunning("brief");
    try {
      const { task_id } = await api.generateBrief(productId);
      pollTask(task_id, () => api.listBriefs(productId).then(setBriefs));
    } catch { setRunning(""); }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.name) return;
    await api.createCompetitor(productId, newCompetitor);
    setNewCompetitor({ name: "", website_url: "", description: "" });
    setShowAddCompetitor(false);
    api.listCompetitors(productId).then(setCompetitors);
  };

  const handleDeleteCompetitor = async (id: string) => {
    await api.deleteCompetitor(productId, id);
    api.listCompetitors(productId).then(setCompetitors);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updateIntelligenceConfig(productId, {
        competitor_monitoring_enabled: config.competitor_monitoring_enabled,
        trend_detection_enabled: config.trend_detection_enabled,
        hook_analysis_enabled: config.hook_analysis_enabled,
        evidence_gathering_enabled: config.evidence_gathering_enabled,
        weekly_brief_enabled: config.weekly_brief_enabled,
        competitor_scan_interval_hours: config.competitor_scan_interval_hours,
        trend_scan_interval_hours: config.trend_scan_interval_hours,
        hook_analysis_interval_hours: config.hook_analysis_interval_hours,
        evidence_refresh_interval_hours: config.evidence_refresh_interval_hours,
        niche_keywords: config.niche_keywords,
        subreddits: config.subreddits,
        x_accounts_to_watch: config.x_accounts_to_watch,
        industry_vertical: config.industry_vertical || undefined,
      });
      api.getIntelligenceConfig(productId).then(setConfig);
    } finally { setSaving(false); }
  };

  const handleViewBrief = async (briefId: string) => {
    const brief = await api.getBrief(productId, briefId);
    setSelectedBrief(brief);
  };

  // ─── Styles ────────────────────────────────────────────────────────────────

  const card = "bg-[#1C1B1F]/60 border border-white/5 rounded-xl p-5";
  const statCard = `${card} flex flex-col gap-1`;
  const btnPrimary = "px-4 py-2 bg-[#FF9500] text-[#1C1B1F] rounded-lg font-medium text-sm hover:bg-[#FFB040] transition-colors disabled:opacity-50";
  const btnSecondary = "px-4 py-2 bg-white/5 text-[#E5E1E4] rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50";
  const badge = (color: string) => `inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`;
  const tabCls = (t: Tab) =>
    `px-4 py-2 text-xs uppercase tracking-wider font-medium transition-colors rounded-lg ${
      activeTab === t ? "bg-[#FF9500]/10 text-[#FF9500]" : "text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/5"
    }`;
  const input = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#E5E1E4]/40">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E1E4]">Marketing Intelligence</h1>
          <p className="text-sm text-[#E5E1E4]/50 mt-1">
            Research, learn, and advise — your bot as a strategic partner
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50"
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {productId && (
            <button onClick={handleRunCycle} disabled={!!running} className={btnPrimary}>
              {running === "cycle" ? "Running..." : "Run Full Cycle"}
            </button>
          )}
        </div>
      </div>

      {!productId ? (
        <div className={`${card} text-center py-16`}>
          <span className="material-symbols-outlined text-5xl text-[#E5E1E4]/20 mb-4 block">psychology</span>
          <p className="text-[#E5E1E4]/40">Select a product to view intelligence data</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 flex-wrap">
            {(["overview", "competitors", "trends", "hooks", "evidence", "briefs", "config"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={tabCls(t)}>{t}</button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && dashboard && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={statCard}>
                  <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40">Competitors</span>
                  <span className="text-2xl font-bold text-[#E5E1E4]">{dashboard.competitors.active}</span>
                  <span className={badge(dashboard.config.competitor_monitoring_enabled ? "bg-green-500/20 text-green-400" : "bg-white/5 text-[#E5E1E4]/30")}>
                    {dashboard.config.competitor_monitoring_enabled ? "Active" : "Off"}
                  </span>
                </div>
                <div className={statCard}>
                  <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40">Trends This Week</span>
                  <span className="text-2xl font-bold text-[#E5E1E4]">{dashboard.trends.this_week}</span>
                  <span className={badge("bg-orange-500/20 text-orange-400")}>
                    {dashboard.trends.rising} rising
                  </span>
                </div>
                <div className={statCard}>
                  <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40">Hook Patterns</span>
                  <span className="text-2xl font-bold text-[#E5E1E4]">{dashboard.hooks.total_patterns}</span>
                </div>
                <div className={statCard}>
                  <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40">Evidence Items</span>
                  <span className="text-2xl font-bold text-[#E5E1E4]">{dashboard.evidence.total}</span>
                  <span className={badge("bg-blue-500/20 text-blue-400")}>
                    {dashboard.evidence.verified} verified
                  </span>
                </div>
              </div>

              {/* Latest Brief Card */}
              {dashboard.latest_brief.id ? (
                <div className={card}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-[#E5E1E4]">Latest Intelligence Brief</h3>
                    {!dashboard.latest_brief.read && (
                      <span className={badge("bg-[#FF9500]/20 text-[#FF9500]")}>Unread</span>
                    )}
                  </div>
                  <p className="text-[#E5E1E4]/70 text-sm">{dashboard.latest_brief.title}</p>
                  <p className="text-[#E5E1E4]/30 text-xs mt-1">
                    {dashboard.latest_brief.created_at && new Date(dashboard.latest_brief.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => { setActiveTab("briefs"); if (dashboard.latest_brief.id) handleViewBrief(dashboard.latest_brief.id); }}
                    className={`${btnSecondary} mt-3`}
                  >
                    Read Brief
                  </button>
                </div>
              ) : (
                <div className={`${card} text-center py-8`}>
                  <p className="text-[#E5E1E4]/30 text-sm">No intelligence briefs yet.</p>
                  <button onClick={handleGenerateBrief} disabled={!!running} className={`${btnPrimary} mt-3`}>
                    {running === "brief" ? "Generating..." : "Generate First Brief"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Competitors Tab */}
          {activeTab === "competitors" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#E5E1E4]/70">Tracked Competitors</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddCompetitor(!showAddCompetitor)} className={btnSecondary}>
                    + Add
                  </button>
                  <button onClick={handleScanCompetitors} disabled={!!running} className={btnPrimary}>
                    {running === "competitors" ? "Scanning..." : "Scan All"}
                  </button>
                </div>
              </div>

              {showAddCompetitor && (
                <div className={`${card} space-y-3`}>
                  <input placeholder="Competitor name" value={newCompetitor.name} onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })} className={input} />
                  <input placeholder="Website URL" value={newCompetitor.website_url} onChange={(e) => setNewCompetitor({ ...newCompetitor, website_url: e.target.value })} className={input} />
                  <input placeholder="Description" value={newCompetitor.description} onChange={(e) => setNewCompetitor({ ...newCompetitor, description: e.target.value })} className={input} />
                  <button onClick={handleAddCompetitor} className={btnPrimary}>Add Competitor</button>
                </div>
              )}

              {competitors.length === 0 ? (
                <div className={`${card} text-center py-8`}>
                  <p className="text-[#E5E1E4]/30 text-sm">No competitors tracked yet. Add one above.</p>
                </div>
              ) : (
                competitors.map((c) => (
                  <div key={c.id} className={card}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-[#E5E1E4]">{c.name}</h3>
                        {c.website_url && <p className="text-xs text-[#E5E1E4]/40 mt-0.5">{c.website_url}</p>}
                        {c.description && <p className="text-sm text-[#E5E1E4]/60 mt-1">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.last_crawled_at && (
                          <span className="text-[10px] text-[#E5E1E4]/30">
                            Scanned {new Date(c.last_crawled_at).toLocaleDateString()}
                          </span>
                        )}
                        <button onClick={() => handleDeleteCompetitor(c.id)} className="text-[#E5E1E4]/30 hover:text-red-400 transition-colors">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                    {c.latest_snapshot && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {Array.isArray(c.latest_snapshot.messaging_angles) && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40">Messaging Angles</span>
                            <ul className="mt-1 space-y-0.5">
                              {(c.latest_snapshot.messaging_angles as string[]).slice(0, 3).map((a, i) => (
                                <li key={i} className="text-xs text-[#E5E1E4]/60">{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(c.latest_snapshot.opportunities) && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40">Opportunities</span>
                            <ul className="mt-1 space-y-0.5">
                              {(c.latest_snapshot.opportunities as string[]).slice(0, 3).map((o, i) => (
                                <li key={i} className="text-xs text-[#FF9500]/70">{o}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === "trends" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#E5E1E4]/70">Trend Signals</h2>
                <button onClick={handleScanTrends} disabled={!!running} className={btnPrimary}>
                  {running === "trends" ? "Scanning..." : "Detect Trends"}
                </button>
              </div>

              {trends.length === 0 ? (
                <div className={`${card} text-center py-8`}>
                  <p className="text-[#E5E1E4]/30 text-sm">No trends detected yet. Run a scan.</p>
                </div>
              ) : (
                trends.map((t) => (
                  <div key={t.id} className={card}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[#E5E1E4] text-sm">{t.title}</h3>
                          <span className={badge(
                            t.momentum === "rising" ? "bg-green-500/20 text-green-400" :
                            t.momentum === "declining" ? "bg-red-500/20 text-red-400" :
                            "bg-white/5 text-[#E5E1E4]/40"
                          )}>{t.momentum}</span>
                          <span className={badge("bg-purple-500/20 text-purple-400")}>{t.category}</span>
                        </div>
                        <p className="text-xs text-[#E5E1E4]/60 mt-1">{t.summary}</p>
                        {t.source_snippet && (
                          <p className="text-xs text-[#E5E1E4]/30 mt-2 italic border-l-2 border-white/10 pl-2">
                            &ldquo;{t.source_snippet}&rdquo;
                          </p>
                        )}
                        {t.suggested_angle && (
                          <div className="mt-2 bg-[#FF9500]/5 border border-[#FF9500]/10 rounded-lg px-3 py-2">
                            <span className="text-[10px] uppercase tracking-wider text-[#FF9500]/60">Suggested Angle</span>
                            <p className="text-xs text-[#E5E1E4]/70 mt-0.5">{t.suggested_angle}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-lg font-bold text-[#E5E1E4]">{Math.round(t.relevance_score * 100)}%</div>
                        <div className="text-[10px] text-[#E5E1E4]/30">relevance</div>
                        <span className="text-[10px] text-[#E5E1E4]/20 mt-1 block">{t.source_type}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Hooks Tab */}
          {activeTab === "hooks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#E5E1E4]/70">Hook & Copy Patterns</h2>
                <button onClick={handleAnalyzeHooks} disabled={!!running} className={btnPrimary}>
                  {running === "hooks" ? "Analyzing..." : "Analyze Hooks"}
                </button>
              </div>

              {hooks.length === 0 ? (
                <div className={`${card} text-center py-8`}>
                  <p className="text-[#E5E1E4]/30 text-sm">No patterns analyzed yet. Run analysis.</p>
                </div>
              ) : (
                hooks.map((h) => (
                  <div key={h.id} className={card}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[#E5E1E4] text-sm">{h.pattern_name}</h3>
                          <span className={badge("bg-cyan-500/20 text-cyan-400")}>{h.pattern_type}</span>
                          <span className={badge("bg-white/5 text-[#E5E1E4]/40")}>{h.source_platform}</span>
                        </div>
                        <p className="text-xs text-[#E5E1E4]/60 mt-1">{h.description}</p>
                        <div className="mt-2 bg-white/5 rounded-lg px-3 py-2">
                          <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/30">Example</span>
                          <p className="text-xs text-[#E5E1E4]/80 mt-0.5">&ldquo;{h.example}&rdquo;</p>
                        </div>
                        {h.template && (
                          <div className="mt-2 bg-[#FF9500]/5 border border-[#FF9500]/10 rounded-lg px-3 py-2">
                            <span className="text-[10px] uppercase tracking-wider text-[#FF9500]/60">Template</span>
                            <p className="text-xs text-[#E5E1E4]/70 mt-0.5 font-mono">{h.template}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-lg font-bold text-[#E5E1E4]">{Math.round(h.engagement_score * 100)}%</div>
                        <div className="text-[10px] text-[#E5E1E4]/30">engagement</div>
                        {h.times_used > 0 && (
                          <div className="text-[10px] text-[#E5E1E4]/20 mt-1">Used {h.times_used}x</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Evidence Tab */}
          {activeTab === "evidence" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#E5E1E4]/70">Evidence Library</h2>
                <button onClick={handleGatherEvidence} disabled={!!running} className={btnPrimary}>
                  {running === "evidence" ? "Gathering..." : "Gather Evidence"}
                </button>
              </div>

              {evidence.length === 0 ? (
                <div className={`${card} text-center py-8`}>
                  <p className="text-[#E5E1E4]/30 text-sm">No evidence gathered yet. Run evidence gathering.</p>
                </div>
              ) : (
                evidence.map((e) => (
                  <div key={e.id} className={card}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={badge("bg-indigo-500/20 text-indigo-400")}>{e.evidence_type}</span>
                          <span className={badge(
                            e.freshness === "fresh" ? "bg-green-500/20 text-green-400" :
                            e.freshness === "recent" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-red-500/20 text-red-400"
                          )}>{e.freshness}</span>
                          {e.verified && <span className={badge("bg-green-500/20 text-green-400")}>Verified</span>}
                        </div>
                        <p className="text-sm text-[#E5E1E4]/80 font-medium">{e.evidence_text}</p>
                        <p className="text-xs text-[#E5E1E4]/40 mt-1">Supports: {e.claim}</p>
                        {e.source_name && (
                          <p className="text-[10px] text-[#E5E1E4]/30 mt-1">Source: {e.source_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <div className="text-center">
                          <div className="text-lg font-bold text-[#E5E1E4]">{Math.round(e.credibility_score * 100)}%</div>
                          <div className="text-[10px] text-[#E5E1E4]/30">credibility</div>
                        </div>
                        {!e.verified && (
                          <button
                            onClick={() => api.verifyEvidence(productId, e.id, true).then(() => api.listEvidence(productId).then(setEvidence))}
                            className="text-[#E5E1E4]/30 hover:text-green-400 transition-colors"
                            title="Mark as verified"
                          >
                            <span className="material-symbols-outlined text-base">verified</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Briefs Tab */}
          {activeTab === "briefs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#E5E1E4]/70">Intelligence Briefs</h2>
                <button onClick={handleGenerateBrief} disabled={!!running} className={btnPrimary}>
                  {running === "brief" ? "Generating..." : "Generate Brief"}
                </button>
              </div>

              {selectedBrief ? (
                <div className="space-y-4">
                  <button onClick={() => setSelectedBrief(null)} className={btnSecondary}>Back to list</button>
                  <div className={card}>
                    <h2 className="text-lg font-bold text-[#E5E1E4] mb-2">{selectedBrief.title}</h2>
                    <p className="text-sm text-[#E5E1E4]/70 mb-4">{selectedBrief.summary}</p>

                    {selectedBrief.whats_working.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs uppercase tracking-wider text-green-400 font-bold mb-2">What&apos;s Working</h3>
                        {selectedBrief.whats_working.map((w, i) => (
                          <div key={i} className="bg-green-500/5 border border-green-500/10 rounded-lg px-3 py-2 mb-2">
                            <p className="text-sm text-[#E5E1E4]/80">{w.insight}</p>
                            <p className="text-xs text-[#E5E1E4]/40 mt-0.5">{w.data_point}</p>
                            <p className="text-xs text-green-400/70 mt-0.5">{w.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedBrief.competitor_moves.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-2">Competitor Moves</h3>
                        {selectedBrief.competitor_moves.map((c, i) => (
                          <div key={i} className="bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2 mb-2">
                            <p className="text-sm text-[#E5E1E4]/80"><strong>{c.competitor}:</strong> {c.action}</p>
                            <p className="text-xs text-orange-400/70 mt-0.5">{c.implication}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedBrief.trend_alerts.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs uppercase tracking-wider text-purple-400 font-bold mb-2">Trend Alerts</h3>
                        {selectedBrief.trend_alerts.map((t, i) => (
                          <div key={i} className="bg-purple-500/5 border border-purple-500/10 rounded-lg px-3 py-2 mb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-[#E5E1E4]/80">{t.trend}</p>
                              <span className={badge(
                                t.relevance === "high" ? "bg-red-500/20 text-red-400" :
                                t.relevance === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-white/5 text-[#E5E1E4]/40"
                              )}>{t.relevance}</span>
                            </div>
                            <p className="text-xs text-purple-400/70 mt-0.5">{t.suggested_action}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedBrief.creative_recommendations.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs uppercase tracking-wider text-cyan-400 font-bold mb-2">Creative Recommendations</h3>
                        {selectedBrief.creative_recommendations.map((r, i) => (
                          <div key={i} className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg px-3 py-2 mb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-[#E5E1E4]/80">{r.format}</p>
                              <span className={badge(
                                r.expected_impact === "high" ? "bg-green-500/20 text-green-400" : "bg-white/5 text-[#E5E1E4]/40"
                              )}>{r.expected_impact} impact</span>
                            </div>
                            <p className="text-xs text-cyan-400/70 mt-0.5">{r.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedBrief.next_actions.length > 0 && (
                      <div>
                        <h3 className="text-xs uppercase tracking-wider text-[#FF9500] font-bold mb-2">Next Actions</h3>
                        {selectedBrief.next_actions.map((a, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                            <span className={badge(
                              a.priority === "high" ? "bg-red-500/20 text-red-400" :
                              a.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-white/5 text-[#E5E1E4]/40"
                            )}>{a.priority}</span>
                            <div>
                              <p className="text-sm text-[#E5E1E4]/80">{a.action}</p>
                              <p className="text-[10px] text-[#E5E1E4]/30">{a.rationale}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {briefs.length === 0 ? (
                    <div className={`${card} text-center py-8`}>
                      <p className="text-[#E5E1E4]/30 text-sm">No briefs generated yet.</p>
                    </div>
                  ) : (
                    briefs.map((b) => (
                      <div key={b.id} className={`${card} cursor-pointer hover:border-[#FF9500]/20 transition-colors`} onClick={() => handleViewBrief(b.id)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-[#E5E1E4] text-sm">{b.title}</h3>
                            <p className="text-xs text-[#E5E1E4]/50 mt-0.5">{b.summary.slice(0, 150)}...</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-[10px] text-[#E5E1E4]/30">{new Date(b.created_at).toLocaleDateString()}</p>
                            {!b.read_at && <span className={badge("bg-[#FF9500]/20 text-[#FF9500]")}>New</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {/* Config Tab */}
          {activeTab === "config" && config && (
            <div className="space-y-6">
              <div className={card}>
                <h3 className="text-sm font-medium text-[#E5E1E4] mb-4">Intelligence Modules</h3>
                <div className="space-y-3">
                  {[
                    { key: "competitor_monitoring_enabled" as const, label: "Competitor Monitoring", desc: "Crawl competitor sites, analyze messaging" },
                    { key: "trend_detection_enabled" as const, label: "Trend Detection", desc: "Monitor Reddit, X, forums for emerging signals" },
                    { key: "hook_analysis_enabled" as const, label: "Hook & Copy Analysis", desc: "Reverse-engineer top-performing content patterns" },
                    { key: "evidence_gathering_enabled" as const, label: "Evidence Gathering", desc: "Find stats, studies, and data to back ad claims" },
                    { key: "weekly_brief_enabled" as const, label: "Weekly Intelligence Brief", desc: "Auto-generate strategic summaries" },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                      <div>
                        <span className="text-sm text-[#E5E1E4]">{label}</span>
                        <p className="text-[10px] text-[#E5E1E4]/30">{desc}</p>
                      </div>
                      <div
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${config[key] ? "bg-[#FF9500]" : "bg-white/10"}`}
                        onClick={() => setConfig({ ...config, [key]: !config[key] })}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className={card}>
                <h3 className="text-sm font-medium text-[#E5E1E4] mb-4">Niche Context</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 mb-1 block">Industry Vertical</label>
                    <input
                      value={config.industry_vertical || ""}
                      onChange={(e) => setConfig({ ...config, industry_vertical: e.target.value || null })}
                      placeholder="e.g. real_estate, education, ecommerce"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 mb-1 block">Niche Keywords (comma-separated)</label>
                    <input
                      value={config.niche_keywords.join(", ")}
                      onChange={(e) => setConfig({ ...config, niche_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      placeholder="e.g. marketing automation, lead gen, CRM"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 mb-1 block">Subreddits (comma-separated)</label>
                    <input
                      value={config.subreddits.join(", ")}
                      onChange={(e) => setConfig({ ...config, subreddits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      placeholder="e.g. r/SaaS, r/marketing, r/Entrepreneur"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 mb-1 block">X Accounts to Watch (comma-separated)</label>
                    <input
                      value={config.x_accounts_to_watch.join(", ")}
                      onChange={(e) => setConfig({ ...config, x_accounts_to_watch: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      placeholder="e.g. @competitor1, @industryexpert"
                      className={input}
                    />
                  </div>
                </div>
              </div>

              <div className={card}>
                <h3 className="text-sm font-medium text-[#E5E1E4] mb-4">Scan Intervals (hours)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "competitor_scan_interval_hours" as const, label: "Competitor Scan" },
                    { key: "trend_scan_interval_hours" as const, label: "Trend Detection" },
                    { key: "hook_analysis_interval_hours" as const, label: "Hook Analysis" },
                    { key: "evidence_refresh_interval_hours" as const, label: "Evidence Refresh" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 mb-1 block">{label}</label>
                      <input
                        type="number"
                        min={1}
                        value={config[key]}
                        onChange={(e) => setConfig({ ...config, [key]: parseInt(e.target.value) || 1 })}
                        className={input}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveConfig} disabled={saving} className={btnPrimary}>
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
