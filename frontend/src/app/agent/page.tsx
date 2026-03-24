"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  type AgentSystemStatus,
  type AgentLogItem,
  type GuardrailItem,
} from "@/lib/api";

type Tab = "overview" | "approvals" | "activity" | "guardrails";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  transcript_processed: { label: "Content Generated", icon: "description", color: "text-[#FF9500] bg-[#FF9500]/10 border-[#FF9500]/20" },
  content_generated: { label: "Creative Bundle", icon: "palette", color: "text-[#a4a7ff] bg-[#a4a7ff]/10 border-[#a4a7ff]/20" },
  campaign_created: { label: "Campaign Created", icon: "rocket_launch", color: "text-[#ffbd7f] bg-[#ffbd7f]/10 border-[#ffbd7f]/20" },
  campaign_paused: { label: "Campaign Paused", icon: "pause_circle", color: "text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/20" },
  performance_ingested: { label: "Metrics Ingested", icon: "monitoring", color: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20" },
  guardrail_triggered: { label: "Guardrail Triggered", icon: "shield", color: "text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/20" },
  guardrail_created: { label: "Guardrail Created", icon: "add_moderator", color: "text-[#c6c4df] bg-[#c6c4df]/10 border-[#c6c4df]/20" },
  kill_switch_activated: { label: "Kill Switch", icon: "emergency_home", color: "text-[#ffb4ab] bg-[#ffb4ab]/20 border-[#ffb4ab]/30" },
  optimization_run: { label: "Optimization", icon: "auto_awesome", color: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20" },
};

const RULE_TYPE_LABELS: Record<string, string> = {
  daily_spend_cap: "Daily Spend Cap",
  campaign_spend_cap: "Campaign Spend Cap",
  total_spend_cap: "Total Spend Cap",
  min_roas: "Min ROAS",
  max_cpc: "Max CPC",
  max_frequency: "Max Frequency",
  pause_no_conversions: "Pause if No Conversions",
};

const glassInput =
  "w-full px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors";

export default function AgentPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<AgentSystemStatus | null>(null);
  const [approvals, setApprovals] = useState<AgentLogItem[]>([]);
  const [activity, setActivity] = useState<AgentLogItem[]>([]);
  const [guardrails, setGuardrails] = useState<GuardrailItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [killConfirm, setKillConfirm] = useState(false);

  const [showNewGuardrail, setShowNewGuardrail] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_type: "daily_spend_cap",
    threshold_value: 50,
    action: "alert",
    cooldown_hours: 48,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [s, a, act, g] = await Promise.all([
        api.getAgentStatus(),
        api.getPendingApprovals(),
        api.getActivityLog(30),
        api.listGuardrails(),
      ]);
      setStatus(s);
      setApprovals(a);
      setActivity(act);
      setGuardrails(g);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleApprove = async (logId: string, approved: boolean) => {
    try {
      await api.approveAction(logId, approved);
      setApprovals((prev) => prev.filter((a) => a.id !== logId));
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleKillSwitch = async () => {
    try {
      setKillSwitchActive(true);
      const result = await api.activateKillSwitch();
      alert(result.message);
      setKillConfirm(false);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setKillSwitchActive(false);
    }
  };

  const handleCreateGuardrail = async () => {
    try {
      await api.createGuardrail(newRule);
      setShowNewGuardrail(false);
      const g = await api.listGuardrails();
      setGuardrails(g);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGuardrail = async (id: string, enabled: boolean) => {
    try {
      await api.updateGuardrail(id, { enabled });
      setGuardrails((prev) =>
        prev.map((g) => (g.id === id ? { ...g, enabled } : g))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGuardrail = async (id: string) => {
    try {
      await api.deleteGuardrail(id);
      setGuardrails((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Loading Skeleton ── */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#353437]/50 rounded-xl" />
        <div className="h-4 w-80 bg-[#353437]/30 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-prism rounded-2xl border border-[#554334]/30 p-5 space-y-3">
              <div className="h-3 w-20 bg-[#353437]/50 rounded" />
              <div className="h-8 w-16 bg-[#353437]/40 rounded-lg" />
              <div className="h-1 bg-[#353437]/30 rounded-full" />
            </div>
          ))}
        </div>
        <div className="h-12 bg-[#353437]/20 rounded-xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-prism rounded-2xl border border-[#554334]/30 p-5 h-20" />
          ))}
        </div>
      </div>
    );
  }

  const tabs: [Tab, string][] = [
    ["overview", "Overview"],
    ["approvals", `Approvals${approvals.length > 0 ? ` (${approvals.length})` : ""}`],
    ["activity", "Activity Log"],
    ["guardrails", "Guardrails"],
  ];

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="space-y-8">
      {/* ── Header ── */}
      <motion.div {...fadeUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">Autonomous Agent</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]" />
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#E5E1E4]">
            Agent <span className="text-[#E5E1E4]/30">Control.</span>
          </h1>
          <p className="text-sm font-mono text-[#E5E1E4]/40 mt-1">
            Monitor, approve, and control your autonomous agent
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => fetchAll()}
            className="px-4 py-2.5 text-sm font-bold glass-prism rounded-xl border border-[#554334]/30 text-[#E5E1E4]/70 hover:border-[#FF9500]/30 transition-colors"
          >
            <span className="material-symbols-outlined text-base align-middle mr-1">refresh</span>
            Refresh
          </motion.button>
          <AnimatePresence mode="wait">
            {!killConfirm ? (
              <motion.button
                key="kill-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setKillConfirm(true)}
                className="px-4 py-2.5 text-sm font-bold glass-prism rounded-xl border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-colors"
              >
                <span className="material-symbols-outlined text-base align-middle mr-1">emergency_home</span>
                Kill Switch
              </motion.button>
            ) : (
              <motion.div
                key="kill-confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex gap-1"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleKillSwitch}
                  disabled={killSwitchActive}
                  className="px-4 py-2.5 text-sm font-bold rounded-xl bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/30 transition-colors disabled:opacity-50"
                >
                  {killSwitchActive ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Pausing...
                    </span>
                  ) : "Confirm Pause All"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setKillConfirm(false)}
                  className="px-3 py-2.5 text-sm font-bold glass-prism rounded-xl border border-[#554334]/30 text-[#E5E1E4]/70 transition-colors"
                >
                  Cancel
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Status Cards ── */}
      {status && (
        <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Products" value={status.products.length} icon="inventory_2" />
          <StatCard label="Active Campaigns" value={status.campaigns.filter((c) => c.status === "active").length} icon="campaign" color="#4ade80" />
          <StatCard label="Pending Approvals" value={status.pending_approvals} icon="pending_actions" color={status.pending_approvals > 0 ? "#ffbd7f" : undefined} />
          <StatCard label="Active Guardrails" value={status.active_guardrails} icon="shield" color="#a4a7ff" />
        </motion.div>
      )}

      {/* ── Pending Approvals Banner ── */}
      <AnimatePresence>
        {approvals.length > 0 && tab !== "approvals" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => setTab("approvals")}
            className="glass-prism rounded-2xl border border-[#ffbd7f]/20 p-4 flex items-center justify-between cursor-pointer hover:border-[#FF9500]/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                <span className="text-[#FF9500] font-black text-sm">{approvals.length}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#E5E1E4]">
                  {approvals.length} action{approvals.length > 1 ? "s" : ""} awaiting approval
                </p>
                <p className="text-xs text-[#E5E1E4]/40">
                  {approvals[0].action_type.replace(/_/g, " ")}
                  {approvals.length > 1 ? ` and ${approvals.length - 1} more` : ""}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#E5E1E4]/30 group-hover:text-[#FF9500] transition-colors">chevron_right</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab Bar ── */}
      <motion.div {...fadeUp} className="flex gap-1 p-1 glass-prism rounded-xl border border-[#554334]/30">
        {tabs.map(([key, label]) => (
          <motion.button
            key={key}
            onClick={() => setTab(key)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
              tab === key
                ? "bg-[#FF9500] text-[#2d1600] shadow-lg shadow-[#FF9500]/20"
                : "text-[#E5E1E4]/50 hover:text-[#E5E1E4]"
            }`}
          >
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Overview Tab ── */}
      <AnimatePresence mode="wait">
        {tab === "overview" && status && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {status.campaigns.length > 0 && (
              <div>
                <span className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">Active Campaigns</span>
                <div className="space-y-3 mt-3">
                  {status.campaigns.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass-prism rounded-2xl border border-[#554334]/30 p-5 flex items-center justify-between hover:border-[#FF9500]/20 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#E5E1E4] group-hover:text-[#FF9500] transition-colors">{c.name}</p>
                        <p className="text-xs text-[#E5E1E4]/40 mt-0.5">{c.platform} &middot; ${c.daily_budget}/day</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                          c.status === "active"
                            ? "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20"
                            : "text-[#ffbd7f] bg-[#ffbd7f]/10 border-[#ffbd7f]/20"
                        }`}>
                          {c.status}
                        </span>
                        <span className="text-xs font-mono text-[#E5E1E4]/40">${c.total_spend.toFixed(2)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {status.recent_actions.length > 0 && (
              <div>
                <span className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">Recent Activity</span>
                <div className="space-y-2 mt-3">
                  {status.recent_actions.slice(0, 10).map((a, i) => {
                    const info = ACTION_LABELS[a.action_type] || { label: a.action_type.replace(/_/g, " "), icon: "info", color: "text-[#E5E1E4]/50 bg-[#353437]/50 border-[#554334]/20" };
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 py-3 border-b border-[#554334]/10 last:border-0"
                      >
                        <span className={`material-symbols-outlined text-base px-2.5 py-1 rounded-lg border ${info.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{info.icon}</span>
                        <span className="text-sm text-[#E5E1E4]/70 truncate flex-1">{formatDetails(a.details)}</span>
                        <span className="text-xs font-mono text-[#E5E1E4]/30 shrink-0">{formatTime(a.created_at)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {status.campaigns.length === 0 && status.recent_actions.length === 0 && (
              <div className="text-center py-16 glass-prism rounded-2xl border border-[#554334]/30">
                <div className="w-14 h-14 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-[#FF9500]">smart_toy</span>
                </div>
                <p className="text-sm text-[#E5E1E4]/50">No agent activity yet.</p>
                <p className="text-xs text-[#E5E1E4]/30 mt-1">Use the Content Studio to generate content, or create a campaign.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Approvals Tab ── */}
        {tab === "approvals" && (
          <motion.div
            key="approvals"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {approvals.length === 0 ? (
              <div className="text-center py-16 glass-prism rounded-2xl border border-[#554334]/30">
                <div className="w-14 h-14 rounded-2xl bg-[#4ade80]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-[#4ade80]">check_circle</span>
                </div>
                <p className="text-sm text-[#E5E1E4]/50">No pending approvals. You&apos;re all caught up.</p>
              </div>
            ) : (
              approvals.map((a, i) => {
                const info = ACTION_LABELS[a.action_type] || { label: a.action_type.replace(/_/g, " "), icon: "info", color: "text-[#E5E1E4]/50 bg-[#353437]/50 border-[#554334]/20" };
                const details = a.details as Record<string, unknown>;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-prism rounded-2xl border border-[#554334]/30 p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${info.color}`}>
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{info.icon}</span>
                          {info.label}
                        </span>
                        <p className="text-sm font-bold text-[#E5E1E4] mt-3">{formatDetails(details)}</p>
                        <p className="text-xs font-mono text-[#E5E1E4]/30 mt-1">{formatTime(a.created_at)}</p>
                      </div>
                    </div>

                    <div className="glass-prism rounded-xl border border-[#554334]/20 p-4 mb-4">
                      {Object.entries(details).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs py-1">
                          <span className="text-[#E5E1E4]/40">{key.replace(/_/g, " ")}</span>
                          <span className="text-[#E5E1E4]/70 font-mono">
                            {typeof val === "number"
                              ? key.includes("budget") || key.includes("spend")
                                ? `$${val.toFixed(2)}`
                                : val
                              : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleApprove(a.id, true)}
                        className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#4ade80]/30 transition-colors"
                      >
                        Approve
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleApprove(a.id, false)}
                        className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl glass-prism border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-colors"
                      >
                        Reject
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* ── Activity Log Tab ── */}
        {tab === "activity" && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {activity.length === 0 ? (
              <div className="text-center py-16 glass-prism rounded-2xl border border-[#554334]/30">
                <div className="w-14 h-14 rounded-2xl bg-[#353437]/50 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-[#E5E1E4]/30">history</span>
                </div>
                <p className="text-sm text-[#E5E1E4]/50">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="glass-prism rounded-2xl border border-[#554334]/30 overflow-hidden divide-y divide-[#554334]/10">
                {activity.map((a, i) => {
                  const info = ACTION_LABELS[a.action_type] || { label: a.action_type.replace(/_/g, " "), icon: "info", color: "text-[#E5E1E4]/50 bg-[#353437]/50 border-[#554334]/20" };
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FF9500]/[0.02] transition-colors"
                    >
                      <span className={`material-symbols-outlined text-base px-2 py-0.5 rounded-lg border shrink-0 ${info.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{info.icon}</span>
                      <span className="text-sm text-[#E5E1E4]/60 truncate flex-1">{formatDetails(a.details)}</span>
                      {a.approval_required && (
                        <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border shrink-0 ${
                          a.approved === true
                            ? "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20"
                            : a.approved === false
                            ? "text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/20"
                            : "text-[#ffbd7f] bg-[#ffbd7f]/10 border-[#ffbd7f]/20"
                        }`}>
                          {a.approved === true ? "approved" : a.approved === false ? "rejected" : "pending"}
                        </span>
                      )}
                      <span className="text-xs font-mono text-[#E5E1E4]/30 shrink-0">{formatTime(a.created_at)}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Guardrails Tab ── */}
        {tab === "guardrails" && (
          <motion.div
            key="guardrails"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowNewGuardrail(!showNewGuardrail)}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                  showNewGuardrail
                    ? "glass-prism border border-[#ffb4ab]/30 text-[#ffb4ab]"
                    : "bg-[#FF9500] text-[#2d1600] shadow-lg shadow-[#FF9500]/20"
                }`}
              >
                {showNewGuardrail ? "Cancel" : "Add Guardrail"}
              </motion.button>
            </div>

            <AnimatePresence>
              {showNewGuardrail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-prism rounded-2xl border border-[#FF9500]/20 p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#FF9500]">add_moderator</span>
                      <span className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">New Safety Guardrail</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">Rule Type</label>
                        <select
                          value={newRule.rule_type}
                          onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                          className={glassInput}
                        >
                          {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">Threshold</label>
                        <input
                          type="number"
                          value={newRule.threshold_value}
                          onChange={(e) => setNewRule({ ...newRule, threshold_value: Number(e.target.value) })}
                          className={glassInput}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">Action</label>
                        <select
                          value={newRule.action}
                          onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                          className={glassInput}
                        >
                          <option value="alert">Alert Only</option>
                          <option value="pause">Pause Campaign</option>
                          <option value="reduce_budget">Reduce Budget</option>
                          <option value="rotate_creative">Rotate Creative</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">Cooldown (hours)</label>
                        <input
                          type="number"
                          value={newRule.cooldown_hours}
                          onChange={(e) => setNewRule({ ...newRule, cooldown_hours: Number(e.target.value) })}
                          className={glassInput}
                        />
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleCreateGuardrail}
                      className="px-5 py-2.5 text-sm font-bold bg-[#FF9500] text-[#2d1600] rounded-xl shadow-lg shadow-[#FF9500]/20"
                    >
                      Create Guardrail
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {guardrails.length === 0 && !showNewGuardrail ? (
              <div className="text-center py-16 glass-prism rounded-2xl border border-[#554334]/30">
                <div className="w-14 h-14 rounded-2xl bg-[#a4a7ff]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-[#a4a7ff]">shield</span>
                </div>
                <p className="text-sm text-[#E5E1E4]/50">No guardrails configured.</p>
                <p className="text-xs text-[#E5E1E4]/30 mt-1">Add one to protect your ad spend.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {guardrails.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-prism rounded-2xl border p-5 flex items-center justify-between transition-all ${
                      g.enabled
                        ? "border-[#554334]/30 hover:border-[#FF9500]/20"
                        : "border-[#554334]/10 opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleGuardrail(g.id, !g.enabled)}
                        className={`w-11 h-6 rounded-full relative transition-colors ${
                          g.enabled ? "bg-[#4ade80]" : "bg-[#353437]"
                        }`}
                      >
                        <motion.span
                          animate={{ x: g.enabled ? 20 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 w-5 h-5 bg-[#131315] rounded-full shadow"
                        />
                      </button>
                      <div>
                        <p className="text-sm font-bold text-[#E5E1E4]">
                          {RULE_TYPE_LABELS[g.rule_type] || g.rule_type}
                        </p>
                        <p className="text-xs text-[#E5E1E4]/40 mt-0.5">
                          Threshold: <span className="font-mono text-[#E5E1E4]/60">{g.rule_type.includes("spend") || g.rule_type.includes("cpc") ? `$${g.threshold_value}` : g.threshold_value}</span>
                          {" "}&middot; Action: <span className="text-[#E5E1E4]/60">{g.action}</span>
                          {" "}&middot; Cooldown: <span className="font-mono text-[#E5E1E4]/60">{g.cooldown_hours}h</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {g.last_triggered_at && (
                        <span className="text-xs font-mono text-[#ffb4ab]/70">
                          Fired {formatTime(g.last_triggered_at)}
                        </span>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteGuardrail(g.id)}
                        className="p-2 text-[#E5E1E4]/30 hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-xl transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-prism rounded-2xl border border-[#554334]/30 p-5 hover:border-[#FF9500]/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-base" style={{ color: color || "#E5E1E4", fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">{label}</span>
      </div>
      <p className="text-3xl font-black" style={{ color: color || "#E5E1E4" }}>{value}</p>
      <div className="h-1 w-full bg-[#353437] rounded-full overflow-hidden mt-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color || "#FF9500" }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value * 10, 100)}%` }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

/* ── Utilities ── */
function formatDetails(details: Record<string, unknown>): string {
  if (details.name) return String(details.name);
  if (details.pieces_generated) return `${details.pieces_generated} pieces from transcript`;
  if (details.campaigns_paused) return `${details.campaigns_paused} campaigns paused`;
  if (details.rule_type)
    return `${RULE_TYPE_LABELS[String(details.rule_type)] || details.rule_type}: ${details.threshold_value}`;
  if (details.impressions !== undefined)
    return `${details.impressions} impressions, $${Number(details.spend || 0).toFixed(2)} spend`;
  const keys = Object.keys(details);
  if (keys.length > 0) return `${keys[0].replace(/_/g, " ")}: ${String(details[keys[0]])}`;
  return "Action performed";
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return isoString;
  }
}
