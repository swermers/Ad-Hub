"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, AgentLogItem } from "@/lib/api";

function getActionIcon(actionType: string): string {
  const map: Record<string, string> = {
    content_approved: "check_circle",
    approved: "check_circle",
    generation_complete: "auto_awesome",
    generated: "auto_awesome",
    schedule_posted: "send",
    scheduled: "schedule_send",
    published: "publish",
    budget_change: "payments",
    budget_adjusted: "payments",
    paused: "pause_circle",
    resumed: "play_circle",
    alert: "warning",
    guardrail_triggered: "shield",
    error: "error",
  };
  for (const [key, icon] of Object.entries(map)) {
    if (actionType.toLowerCase().includes(key)) return icon;
  }
  return "notifications";
}

function getActionColor(actionType: string): string {
  const lower = actionType.toLowerCase();
  if (lower.includes("approved") || lower.includes("complete") || lower.includes("published"))
    return "text-emerald-400";
  if (lower.includes("error") || lower.includes("alert") || lower.includes("guardrail"))
    return "text-red-400";
  if (lower.includes("paused")) return "text-yellow-400";
  if (lower.includes("schedule") || lower.includes("posted")) return "text-blue-400";
  return "text-[#FF9500]";
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTitle(item: AgentLogItem): string {
  const action = item.action_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const resource = item.resource_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${action} — ${resource}`;
}

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationDropdown({
  open,
  onClose,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const [items, setItems] = useState<AgentLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("adhub_read_notifications");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const persistReadIds = useCallback(
    (ids: Set<string>) => {
      try {
        localStorage.setItem(
          "adhub_read_notifications",
          JSON.stringify([...ids])
        );
      } catch {
        // storage full — ignore
      }
    },
    []
  );

  // Fetch activity when dropdown opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .getActivityLog(20)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Report unread count upstream
  useEffect(() => {
    const unread = items.filter((i) => !readIds.has(i.id)).length;
    onUnreadCountChange?.(unread);
  }, [items, readIds, onUnreadCountChange]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    // Delay listener so the opening click doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  const markAllRead = () => {
    const next = new Set(readIds);
    items.forEach((i) => next.add(i.id));
    setReadIds(next);
    persistReadIds(next);
  };

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute right-0 top-full mt-2 w-[400px] z-[60] bg-[#1b1b1d]/90 backdrop-blur-xl border border-[#554334]/30 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#554334]/30">
            <h3 className="text-sm font-semibold text-[#E5E1E4]">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-medium text-[#FF9500]">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#FF9500] hover:text-[#FF9500]/80 transition-colors font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto overscroll-contain custom-scrollbar">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-[#FF9500]/30 border-t-[#FF9500] rounded-full animate-spin" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="material-symbols-outlined text-3xl text-[#E5E1E4]/20">
                  notifications_off
                </span>
                <p className="text-sm text-[#E5E1E4]/40">
                  No notifications yet
                </p>
              </div>
            )}

            {!loading &&
              items.map((item, idx) => {
                const isUnread = !readIds.has(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    className={`flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer ${
                      isUnread ? "bg-white/[0.02]" : ""
                    }`}
                    onClick={() => {
                      if (isUnread) {
                        const next = new Set(readIds);
                        next.add(item.id);
                        setReadIds(next);
                        persistReadIds(next);
                      }
                    }}
                  >
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center ${getActionColor(
                        item.action_type
                      )}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {getActionIcon(item.action_type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          isUnread
                            ? "text-[#E5E1E4] font-medium"
                            : "text-[#E5E1E4]/60"
                        }`}
                      >
                        {formatTitle(item)}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/40 mt-0.5">
                        {formatTimestamp(item.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <span className="flex-shrink-0 mt-2 w-2 h-2 rounded-full bg-[#FF9500]" />
                    )}
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
