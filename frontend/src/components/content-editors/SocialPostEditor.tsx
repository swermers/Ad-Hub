"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface SocialPostEditorProps {
  body: string;
  hook: string | null;
  platform: string;
  onChange: (updates: { body?: string; hook?: string }) => void;
  onSharpen?: (feedback: string) => void;
  metadata?: {
    specificity_check?: string;
    tension_check?: string;
    stealable_line?: string;
  };
  disabled?: boolean;
}

const PLATFORM_CONFIG: Record<string, { name: string; maxChars: number; icon: string; color: string }> = {
  twitter: { name: "X / Twitter", maxChars: 280, icon: "tag", color: "#1DA1F2" },
  linkedin: { name: "LinkedIn", maxChars: 3000, icon: "work", color: "#0A66C2" },
  meta: { name: "Facebook", maxChars: 63206, icon: "group", color: "#0081FB" },
  general: { name: "General", maxChars: 5000, icon: "public", color: "#FF9500" },
};

export default function SocialPostEditor({
  body,
  hook,
  platform,
  onChange,
  onSharpen,
  metadata,
  disabled = false,
}: SocialPostEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(body);
  const [editHook, setEditHook] = useState(hook || "");

  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.general;
  const charCount = body.length;
  const isOverLimit = charCount > config.maxChars;

  const charPct = Math.min((charCount / config.maxChars) * 100, 100);

  const startEdit = () => {
    setEditBody(body);
    setEditHook(hook || "");
    setEditing(true);
  };

  const saveEdit = () => {
    onChange({ body: editBody, hook: editHook || undefined });
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-lg"
            style={{ color: config.color }}
          >
            {config.icon}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
            {config.name} Post
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onSharpen && !editing && (
            <button
              onClick={() => onSharpen("Make this punchier and more specific")}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#FF9500]/70 border border-[#FF9500]/20 hover:bg-[#FF9500]/10 transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">auto_fix_high</span>
              Sharpen
            </button>
          )}
          {!editing && (
            <button
              onClick={startEdit}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#E5E1E4]/50 border border-[#353437] hover:border-[#FF9500]/30 hover:text-[#FF9500] transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Platform Preview Card */}
      <div className={`rounded-xl border overflow-hidden transition-all ${
        editing ? "border-[#FF9500]/30 ring-1 ring-[#FF9500]/20" : "border-[#353437]/50"
      } bg-[#131315]/40`}>

        {/* Mock platform header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#353437]/30">
          <div className="w-8 h-8 rounded-full bg-[#353437] flex items-center justify-center">
            <span className="material-symbols-outlined text-sm text-[#E5E1E4]/40">person</span>
          </div>
          <div>
            <p className="text-xs font-medium text-[#E5E1E4]/70">Your Name</p>
            <p className="text-[10px] text-[#E5E1E4]/30">
              @handle &middot; {config.name}
            </p>
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 py-3">
          {editing ? (
            <div className="space-y-3">
              {/* Hook input */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#E5E1E4]/30 mb-1 block">
                  Hook / Opening
                </label>
                <input
                  value={editHook}
                  onChange={(e) => setEditHook(e.target.value)}
                  placeholder="The opening line that grabs attention..."
                  className="w-full bg-transparent text-sm text-[#E5E1E4] font-medium placeholder:text-[#E5E1E4]/20 focus:outline-none border-b border-[#353437]/30 pb-2"
                />
              </div>

              {/* Body textarea */}
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={platform === "twitter" ? 4 : 8}
                autoFocus
                className="w-full bg-transparent text-sm text-[#E5E1E4]/80 leading-relaxed placeholder:text-[#E5E1E4]/20 focus:outline-none resize-none"
                placeholder="Write your post..."
              />

              {/* Save/Cancel */}
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  className="px-3 py-1.5 rounded-lg bg-[#FF9500]/10 border border-[#FF9500]/30 text-xs font-medium text-[#FF9500]"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#353437] text-xs text-[#E5E1E4]/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {hook && (
                <p className="text-sm font-medium text-[#E5E1E4]">{hook}</p>
              )}
              <p className="text-sm text-[#E5E1E4]/70 leading-relaxed whitespace-pre-wrap">
                {body || <span className="italic text-[#E5E1E4]/20">No content</span>}
              </p>
            </div>
          )}
        </div>

        {/* Character count bar */}
        <div className="px-4 py-2 border-t border-[#353437]/20 flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="h-1 bg-[#353437]/30 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  isOverLimit ? "bg-[#ffb4ab]" : charPct > 90 ? "bg-[#ffbd7f]" : "bg-[#4ade80]"
                }`}
                animate={{ width: `${charPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className={`text-[10px] font-mono ${
            isOverLimit ? "text-[#ffb4ab]" : "text-[#E5E1E4]/30"
          }`}>
            {charCount}/{config.maxChars}
          </span>
        </div>
      </div>

      {/* Quality checks (if available) */}
      {metadata && (metadata.specificity_check || metadata.tension_check || metadata.stealable_line) && (
        <div className="grid grid-cols-3 gap-2">
          {metadata.specificity_check && (
            <div className="p-2.5 rounded-lg bg-[#4ade80]/[0.04] border border-[#4ade80]/10">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#4ade80]/60 mb-1">
                Specificity
              </p>
              <p className="text-[10px] text-[#E5E1E4]/50 leading-relaxed">
                {metadata.specificity_check}
              </p>
            </div>
          )}
          {metadata.tension_check && (
            <div className="p-2.5 rounded-lg bg-[#ffbd7f]/[0.04] border border-[#ffbd7f]/10">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#ffbd7f]/60 mb-1">
                Tension
              </p>
              <p className="text-[10px] text-[#E5E1E4]/50 leading-relaxed">
                {metadata.tension_check}
              </p>
            </div>
          )}
          {metadata.stealable_line && (
            <div className="p-2.5 rounded-lg bg-[#a4a7ff]/[0.04] border border-[#a4a7ff]/10">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#a4a7ff]/60 mb-1">
                Stealable Line
              </p>
              <p className="text-[10px] text-[#E5E1E4]/50 leading-relaxed italic">
                &ldquo;{metadata.stealable_line}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={() => navigator.clipboard.writeText(body)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-[#E5E1E4]/40 border border-[#353437]/30 hover:border-[#FF9500]/30 hover:text-[#FF9500] transition-colors"
      >
        <span className="material-symbols-outlined text-sm">content_copy</span>
        Copy post
      </button>
    </div>
  );
}
