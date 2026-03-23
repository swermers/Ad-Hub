"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type AgentSystemStatus,
  type AgentLogItem,
  type GuardrailItem,
} from "@/lib/api";

type Tab = "overview" | "approvals" | "activity" | "guardrails";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  transcript_processed: { label: "Content Generated", color: "bg-[#FF9500]/10 text-[#FF9500]" },
  content_generated: { label: "Creative Bundle", color: "bg-violet-100 text-violet-700" },
  campaign_created: { label: "Campaign Created", color: "bg-amber-100 text-amber-700" },
  campaign_paused: { label: "Campaign Paused", color: "bg-[#ffb4ab]/10 text-[#ffb4ab]" },
  performance_ingested: { label: "Metrics Ingested", color: "bg-[#4ade80]/10 text-[#4ade80]" },
  guardrail_triggered: { label: "Guardrail Triggered", color: "bg-[#ffb4ab]/10 text-[#ffb4ab]" },
  guardrail_created: { label: "Guardrail Created", color: "bg-cyan-100 text-cyan-700" },
  kill_switch_activated: { label: "Kill Switch", color: "bg-[#ffb4ab]/20 text-[#ffb4ab]" },
  optimization_run: { label: "Optimization", color: "bg-emerald-100 text-emerald-700" },
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

export default function AgentPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<AgentSystemStatus | null>(null);
  const [approvals, setApprovals] = useState<AgentLogItem[]>([]);
  const [activity, setActivity] = useState<AgentLogItem[]>([]);
  const [guardrails, setGuardrails] = useState<GuardrailItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Kill switch
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [killConfirm, setKillConfirm] = useState(false);

  // New guardrail form
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9500]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E1E4]">Agent Dashboard</h1>
          <p className="text-[#E5E1E4]/50 text-sm mt-1">
            Monitor, approve, and control your autonomous agent
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAll()}
            className="px-4 py-2 text-sm font-medium bg-[#201f21] border border-white/10 rounded-lg hover:bg-[#201f21]/5"
          >
            Refresh
          </button>
          {!killConfirm ? (
            <button
              onClick={() => setKillConfirm(true)}
              className="px-4 py-2 text-sm font-medium bg-[#201f21] text-[#ffb4ab] border border-[#ffb4ab]/30 rounded-lg hover:bg-[#ffb4ab]/10"
            >
              Kill Switch
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={handleKillSwitch}
                disabled={killSwitchActive}
                className="px-4 py-2 text-sm font-medium bg-[#ffb4ab]/20 text-[#ffb4ab] rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {killSwitchActive ? "Pausing..." : "Confirm Pause All"}
              </button>
              <button
                onClick={() => setKillConfirm(false)}
                className="px-3 py-2 text-sm font-medium bg-[#201f21] border border-white/10 rounded-lg hover:bg-[#201f21]/5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatusCard
            label="Products"
            value={status.products.length}
          />
          <StatusCard
            label="Active Campaigns"
            value={status.campaigns.filter((c) => c.status === "active").length}
            color="green"
          />
          <StatusCard
            label="Pending Approvals"
            value={status.pending_approvals}
            color={status.pending_approvals > 0 ? "amber" : undefined}
          />
          <StatusCard
            label="Active Guardrails"
            value={status.active_guardrails}
            color="blue"
          />
        </div>
      )}

      {/* Pending approvals banner */}
      {approvals.length > 0 && tab !== "approvals" && (
        <div
          onClick={() => setTab("approvals")}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
              <span className="text-amber-800 font-bold text-sm">
                {approvals.length}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">
                {approvals.length} action{approvals.length > 1 ? "s" : ""} awaiting your approval
              </p>
              <p className="text-xs text-amber-700">
                {approvals[0].action_type.replace(/_/g, " ")}
                {approvals.length > 1 ? ` and ${approvals.length - 1} more` : ""}
              </p>
            </div>
          </div>
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-white/10 rounded-lg p-1">
        {(
          [
            ["overview", "Overview"],
            ["approvals", `Approvals${approvals.length > 0 ? ` (${approvals.length})` : ""}`],
            ["activity", "Activity Log"],
            ["guardrails", "Guardrails"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === key
                ? "bg-[#201f21] text-[#E5E1E4] shadow-sm"
                : "text-[#E5E1E4]/50 hover:text-[#dbc2ad]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────────── */}
      {tab === "overview" && status && (
        <div className="space-y-6">
          {/* Campaigns */}
          {status.campaigns.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[#E5E1E4] mb-3">
                Active Campaigns
              </h2>
              <div className="space-y-2">
                {status.campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="bg-[#201f21] border border-white/10 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#E5E1E4]">
                        {c.name}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/50">
                        {c.platform} &middot; ${c.daily_budget}/day
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          c.status === "active"
                            ? "bg-[#4ade80]/10 text-[#4ade80]"
                            : "bg-[#ffbd7f]/10 text-[#ffbd7f]"
                        }`}
                      >
                        {c.status}
                      </span>
                      <p className="text-xs text-[#E5E1E4]/50 mt-1">
                        ${c.total_spend.toFixed(2)} spent
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {status.recent_actions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[#E5E1E4] mb-3">
                Recent Activity
              </h2>
              <div className="space-y-2">
                {status.recent_actions.slice(0, 10).map((a) => {
                  const actionInfo = ACTION_LABELS[a.action_type] || {
                    label: a.action_type.replace(/_/g, " "),
                    color: "bg-white/10 text-[#dbc2ad]",
                  };
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                    >
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${actionInfo.color}`}
                      >
                        {actionInfo.label}
                      </span>
                      <span className="text-sm text-[#dbc2ad] truncate flex-1">
                        {formatDetails(a.details)}
                      </span>
                      <span className="text-xs text-[#E5E1E4]/40 shrink-0">
                        {formatTime(a.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {status.campaigns.length === 0 && status.recent_actions.length === 0 && (
            <div className="text-center py-12 bg-[#201f21] border border-white/10 rounded-xl">
              <p className="text-[#E5E1E4]/50 text-sm">
                No agent activity yet. Use the Content Studio to generate content, or create a campaign.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Approvals Tab ─────────────────────────────────────────────── */}
      {tab === "approvals" && (
        <div className="space-y-3">
          {approvals.length === 0 ? (
            <div className="text-center py-12 bg-[#201f21] border border-white/10 rounded-xl">
              <p className="text-[#E5E1E4]/50 text-sm">
                No pending approvals. You're all caught up.
              </p>
            </div>
          ) : (
            approvals.map((a) => {
              const actionInfo = ACTION_LABELS[a.action_type] || {
                label: a.action_type.replace(/_/g, " "),
                color: "bg-white/10 text-[#dbc2ad]",
              };
              const details = a.details as Record<string, unknown>;
              return (
                <div
                  key={a.id}
                  className="bg-[#201f21] border border-white/10 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${actionInfo.color}`}
                      >
                        {actionInfo.label}
                      </span>
                      <p className="text-sm font-medium text-[#E5E1E4] mt-2">
                        {formatDetails(details)}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/40 mt-1">
                        {formatTime(a.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Detail breakdown */}
                  <div className="bg-white/5 rounded-lg p-3 mb-4">
                    {Object.entries(details).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs py-0.5">
                        <span className="text-[#E5E1E4]/50">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-[#dbc2ad] font-medium">
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
                    <button
                      onClick={() => handleApprove(a.id, true)}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-[#4ade80]/20 text-[#4ade80] rounded-lg hover:opacity-90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApprove(a.id, false)}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-[#201f21] text-[#ffb4ab] border border-[#ffb4ab]/30 rounded-lg hover:bg-[#ffb4ab]/10"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Activity Log Tab ──────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="bg-[#201f21] border border-white/10 rounded-xl overflow-hidden">
          {activity.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#E5E1E4]/50 text-sm">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {activity.map((a) => {
                const actionInfo = ACTION_LABELS[a.action_type] || {
                  label: a.action_type.replace(/_/g, " "),
                  color: "bg-white/10 text-[#dbc2ad]",
                };
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded shrink-0 ${actionInfo.color}`}
                    >
                      {actionInfo.label}
                    </span>
                    <span className="text-sm text-[#dbc2ad] truncate flex-1">
                      {formatDetails(a.details)}
                    </span>
                    {a.approval_required && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
                          a.approved === true
                            ? "bg-[#4ade80]/10 text-[#4ade80]"
                            : a.approved === false
                            ? "bg-[#ffb4ab]/10 text-[#ffb4ab]"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {a.approved === true
                          ? "approved"
                          : a.approved === false
                          ? "rejected"
                          : "pending"}
                      </span>
                    )}
                    <span className="text-xs text-[#E5E1E4]/40 shrink-0">
                      {formatTime(a.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Guardrails Tab ────────────────────────────────────────────── */}
      {tab === "guardrails" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewGuardrail(!showNewGuardrail)}
              className="px-4 py-2 text-sm font-medium bg-[#FF9500] text-[#2d1600] rounded-lg hover:opacity-90"
            >
              {showNewGuardrail ? "Cancel" : "Add Guardrail"}
            </button>
          </div>

          {/* New guardrail form */}
          {showNewGuardrail && (
            <div className="bg-[#201f21] border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#E5E1E4]">
                New Safety Guardrail
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#dbc2ad] mb-1">
                    Rule Type
                  </label>
                  <select
                    value={newRule.rule_type}
                    onChange={(e) =>
                      setNewRule({ ...newRule, rule_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21]"
                  >
                    {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#dbc2ad] mb-1">
                    Threshold
                  </label>
                  <input
                    type="number"
                    value={newRule.threshold_value}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        threshold_value: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#dbc2ad] mb-1">
                    Action
                  </label>
                  <select
                    value={newRule.action}
                    onChange={(e) =>
                      setNewRule({ ...newRule, action: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21]"
                  >
                    <option value="alert">Alert Only</option>
                    <option value="pause">Pause Campaign</option>
                    <option value="reduce_budget">Reduce Budget</option>
                    <option value="rotate_creative">Rotate Creative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#dbc2ad] mb-1">
                    Cooldown (hours)
                  </label>
                  <input
                    type="number"
                    value={newRule.cooldown_hours}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        cooldown_hours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateGuardrail}
                className="px-4 py-2 text-sm font-medium bg-[#FF9500] text-[#2d1600] rounded-lg hover:opacity-90"
              >
                Create Guardrail
              </button>
            </div>
          )}

          {/* Existing guardrails */}
          {guardrails.length === 0 && !showNewGuardrail ? (
            <div className="text-center py-12 bg-[#201f21] border border-white/10 rounded-xl">
              <p className="text-[#E5E1E4]/50 text-sm">
                No guardrails configured. Add one to protect your ad spend.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {guardrails.map((g) => (
                <div
                  key={g.id}
                  className={`bg-[#201f21] border rounded-xl p-4 flex items-center justify-between ${
                    g.enabled
                      ? "border-white/10"
                      : "border-white/5 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleGuardrail(g.id, !g.enabled)}
                      className={`w-10 h-6 rounded-full relative transition-colors ${
                        g.enabled ? "bg-green-500" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-[#201f21] rounded-full shadow transition-transform ${
                          g.enabled ? "left-4.5" : "left-0.5"
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-[#E5E1E4]">
                        {RULE_TYPE_LABELS[g.rule_type] || g.rule_type}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/50">
                        Threshold: {g.rule_type.includes("spend") || g.rule_type.includes("cpc")
                          ? `$${g.threshold_value}`
                          : g.threshold_value}{" "}
                        &middot; Action: {g.action} &middot; Cooldown:{" "}
                        {g.cooldown_hours}h
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.last_triggered_at && (
                      <span className="text-xs text-[#ffb4ab]">
                        Last fired: {formatTime(g.last_triggered_at)}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteGuardrail(g.id)}
                      className="p-1.5 text-[#E5E1E4]/40 hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Utility Components ───────────────────────────────────────────────────────

function StatusCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "amber" | "blue";
}) {
  const colorMap = {
    green: "text-[#4ade80]",
    amber: "text-amber-600",
    blue: "text-[#FF9500]",
  };
  return (
    <div className="bg-[#201f21] border border-white/10 rounded-xl p-4">
      <p className="text-sm text-[#E5E1E4]/50">{label}</p>
      <p
        className={`text-2xl font-bold ${
          color ? colorMap[color] : "text-[#E5E1E4]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatDetails(details: Record<string, unknown>): string {
  if (details.name) return String(details.name);
  if (details.pieces_generated)
    return `${details.pieces_generated} pieces from transcript`;
  if (details.campaigns_paused)
    return `${details.campaigns_paused} campaigns paused`;
  if (details.rule_type)
    return `${RULE_TYPE_LABELS[String(details.rule_type)] || details.rule_type}: ${details.threshold_value}`;
  if (details.impressions !== undefined)
    return `${details.impressions} impressions, $${Number(details.spend || 0).toFixed(2)} spend`;
  const keys = Object.keys(details);
  if (keys.length > 0)
    return `${keys[0].replace(/_/g, " ")}: ${String(details[keys[0]])}`;
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
