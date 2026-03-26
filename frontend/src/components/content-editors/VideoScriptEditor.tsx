"use client";

import { useState } from "react";
import { motion, Reorder } from "framer-motion";

interface VideoScriptEditorProps {
  blocks: string[];
  hook: string | null;
  cta: string | null;
  onChange: (updates: { blocks?: string[]; hook?: string; cta?: string }) => void;
  onSharpen?: (blockIndex: number, feedback: string) => void;
  disabled?: boolean;
}

const WORDS_PER_MINUTE = 150;

function estimateDuration(blocks: string[]): string {
  const totalWords = blocks.reduce((sum, b) => sum + b.split(/\s+/).length, 0);
  const seconds = Math.round((totalWords / WORDS_PER_MINUTE) * 60);
  if (seconds < 60) return `~${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `~${min}:${sec.toString().padStart(2, "0")}`;
}

function blockDuration(block: string): string {
  const words = block.split(/\s+/).length;
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);
  return `${seconds}s`;
}

export default function VideoScriptEditor({
  blocks,
  hook,
  cta,
  onChange,
  onSharpen,
  disabled = false,
}: VideoScriptEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [editHook, setEditHook] = useState(false);
  const [editCta, setEditCta] = useState(false);
  const [hookBuffer, setHookBuffer] = useState(hook || "");
  const [ctaBuffer, setCtaBuffer] = useState(cta || "");

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditBuffer(blocks[index]);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...blocks];
    updated[editingIndex] = editBuffer;
    onChange({ blocks: updated });
    setEditingIndex(null);
  };

  const addBlock = () => {
    const updated = [...blocks, ""];
    onChange({ blocks: updated });
    setEditingIndex(updated.length - 1);
    setEditBuffer("");
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return;
    onChange({ blocks: blocks.filter((_, i) => i !== index) });
    if (editingIndex === index) setEditingIndex(null);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-[#FF9500]">movie</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
            Video Script
          </span>
          <span className="text-[10px] text-[#E5E1E4]/30">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""} &middot; {estimateDuration(blocks)}
          </span>
        </div>
        <button
          onClick={addBlock}
          disabled={disabled}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#FF9500] border border-[#FF9500]/20 hover:bg-[#FF9500]/10 transition-colors disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add block
        </button>
      </div>

      {/* Hook */}
      <div className="rounded-xl border border-[#FF9500]/20 bg-[#FF9500]/[0.03] p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#FF9500]/60">
            Opening Hook
          </span>
          {!editHook && (
            <button
              onClick={() => { setEditHook(true); setHookBuffer(hook || ""); }}
              disabled={disabled}
              className="text-[10px] text-[#E5E1E4]/30 hover:text-[#FF9500] transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        {editHook ? (
          <div className="space-y-2">
            <input
              value={hookBuffer}
              onChange={(e) => setHookBuffer(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-sm text-[#E5E1E4] focus:outline-none"
              placeholder="The first thing you say — grab attention"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onChange({ hook: hookBuffer }); setEditHook(false); }}
                className="px-2 py-0.5 rounded text-[10px] text-[#FF9500] bg-[#FF9500]/10"
              >
                Save
              </button>
              <button onClick={() => setEditHook(false)} className="px-2 py-0.5 rounded text-[10px] text-[#E5E1E4]/30">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#E5E1E4]/80 font-medium">
            {hook || <span className="italic text-[#E5E1E4]/20">No hook set</span>}
          </p>
        )}
      </div>

      {/* Breath Blocks */}
      <Reorder.Group
        axis="y"
        values={blocks}
        onReorder={(newBlocks) => onChange({ blocks: newBlocks })}
        className="space-y-2"
      >
        {blocks.map((block, index) => (
          <Reorder.Item
            key={`block-${index}-${block.slice(0, 20)}`}
            value={block}
            dragListener={editingIndex !== index && !disabled}
          >
            <motion.div
              layout
              className={`group rounded-xl border border-[#353437]/50 bg-[#131315]/40 transition-all ${
                editingIndex === index ? "ring-1 ring-[#FF9500]/30" : ""
              }`}
            >
              {/* Block header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#353437]/20">
                <span className="material-symbols-outlined text-sm text-[#E5E1E4]/20 cursor-grab active:cursor-grabbing">
                  drag_indicator
                </span>
                <span className="text-[10px] font-bold text-[#E5E1E4]/40">
                  BLOCK {index + 1}
                </span>
                <span className="text-[10px] text-[#E5E1E4]/20">
                  {blockDuration(block)}
                </span>
                <div className="flex-1" />
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingIndex !== index && (
                    <>
                      <button onClick={() => startEdit(index)} disabled={disabled} className="p-1 rounded hover:bg-[#353437]">
                        <span className="material-symbols-outlined text-sm text-[#E5E1E4]/40">edit</span>
                      </button>
                      {onSharpen && (
                        <button onClick={() => onSharpen(index, "Make this more conversational")} disabled={disabled} className="p-1 rounded hover:bg-[#353437]">
                          <span className="material-symbols-outlined text-sm text-[#FF9500]/60">auto_fix_high</span>
                        </button>
                      )}
                      <button
                        onClick={() => removeBlock(index)}
                        disabled={disabled || blocks.length <= 1}
                        className="p-1 rounded hover:bg-[#ffb4ab]/10 disabled:opacity-20"
                      >
                        <span className="material-symbols-outlined text-sm text-[#ffb4ab]/60">close</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Block content */}
              <div className="px-3 py-2.5">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBuffer}
                      onChange={(e) => setEditBuffer(e.target.value)}
                      rows={3}
                      autoFocus
                      className="w-full bg-transparent text-sm text-[#E5E1E4] focus:outline-none resize-none"
                      placeholder="One thought, 2-4 sentences. Write for speaking aloud."
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="px-3 py-1 rounded-lg bg-[#FF9500]/10 border border-[#FF9500]/30 text-[10px] font-medium text-[#FF9500]">Save</button>
                      <button onClick={() => setEditingIndex(null)} className="px-3 py-1 rounded-lg border border-[#353437] text-[10px] text-[#E5E1E4]/50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`text-sm leading-relaxed cursor-pointer ${block ? "text-[#E5E1E4]/70" : "text-[#E5E1E4]/20 italic"}`}
                    onClick={() => !disabled && startEdit(index)}
                  >
                    {block || "Click to write..."}
                  </p>
                )}
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* CTA */}
      <div className="rounded-xl border border-[#4ade80]/20 bg-[#4ade80]/[0.03] p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#4ade80]/60">
            Closing CTA
          </span>
          {!editCta && (
            <button
              onClick={() => { setEditCta(true); setCtaBuffer(cta || ""); }}
              disabled={disabled}
              className="text-[10px] text-[#E5E1E4]/30 hover:text-[#4ade80] transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        {editCta ? (
          <div className="space-y-2">
            <input
              value={ctaBuffer}
              onChange={(e) => setCtaBuffer(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-sm text-[#E5E1E4] focus:outline-none"
              placeholder="Closing question or call to action"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onChange({ cta: ctaBuffer }); setEditCta(false); }}
                className="px-2 py-0.5 rounded text-[10px] text-[#4ade80] bg-[#4ade80]/10"
              >
                Save
              </button>
              <button onClick={() => setEditCta(false)} className="px-2 py-0.5 rounded text-[10px] text-[#E5E1E4]/30">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#E5E1E4]/80">
            {cta || <span className="italic text-[#E5E1E4]/20">No CTA set</span>}
          </p>
        )}
      </div>

      {/* Duration summary */}
      <div className="flex items-center gap-3 text-[10px] text-[#E5E1E4]/30">
        <span>Estimated duration: <strong className="text-[#E5E1E4]/50">{estimateDuration(blocks)}</strong></span>
        <span>&middot;</span>
        <button
          onClick={() => {
            const full = [hook, ...blocks, cta].filter(Boolean).join("\n\n");
            navigator.clipboard.writeText(full);
          }}
          className="hover:text-[#FF9500] transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xs">content_copy</span>
          Copy full script
        </button>
      </div>
    </div>
  );
}
