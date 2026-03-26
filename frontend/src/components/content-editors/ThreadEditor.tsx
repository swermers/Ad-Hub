"use client";

import { useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";

interface ThreadEditorProps {
  tweets: string[];
  onChange: (tweets: string[]) => void;
  onSharpen?: (index: number, feedback: string) => void;
  disabled?: boolean;
}

const MAX_TWEET_LENGTH = 280;

export default function ThreadEditor({
  tweets,
  onChange,
  onSharpen,
  disabled = false,
}: ThreadEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState("");

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditBuffer(tweets[index]);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...tweets];
    updated[editingIndex] = editBuffer;
    onChange(updated);
    setEditingIndex(null);
    setEditBuffer("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditBuffer("");
  };

  const addTweet = () => {
    onChange([...tweets, ""]);
    setEditingIndex(tweets.length);
    setEditBuffer("");
  };

  const removeTweet = (index: number) => {
    if (tweets.length <= 1) return;
    onChange(tweets.filter((_, i) => i !== index));
    if (editingIndex === index) cancelEdit();
  };

  const charColor = (len: number) => {
    if (len > MAX_TWEET_LENGTH) return "text-[#ffb4ab]";
    if (len > MAX_TWEET_LENGTH * 0.9) return "text-[#ffbd7f]";
    return "text-[#E5E1E4]/30";
  };

  const charBarWidth = (len: number) => {
    return Math.min((len / MAX_TWEET_LENGTH) * 100, 100);
  };

  const charBarColor = (len: number) => {
    if (len > MAX_TWEET_LENGTH) return "bg-[#ffb4ab]";
    if (len > MAX_TWEET_LENGTH * 0.9) return "bg-[#ffbd7f]";
    return "bg-[#FF9500]";
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-[#FF9500]">tag</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
            X Thread
          </span>
          <span className="text-[10px] text-[#E5E1E4]/30">
            {tweets.length} tweet{tweets.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={addTweet}
          disabled={disabled}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#FF9500] border border-[#FF9500]/20 hover:bg-[#FF9500]/10 transition-colors disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add tweet
        </button>
      </div>

      {/* Tweet Cards */}
      <Reorder.Group
        axis="y"
        values={tweets}
        onReorder={onChange}
        className="space-y-2"
      >
        {tweets.map((tweet, index) => (
          <Reorder.Item
            key={`tweet-${index}-${tweet.slice(0, 20)}`}
            value={tweet}
            dragListener={editingIndex !== index && !disabled}
          >
            <motion.div
              layout
              className={`group rounded-xl border transition-all ${
                index === 0
                  ? "border-[#FF9500]/30 bg-[#FF9500]/[0.04]"
                  : "border-[#353437]/50 bg-[#131315]/40"
              } ${editingIndex === index ? "ring-1 ring-[#FF9500]/30" : ""}`}
            >
              {/* Tweet header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#353437]/30">
                {/* Drag handle */}
                <span className="material-symbols-outlined text-sm text-[#E5E1E4]/20 cursor-grab active:cursor-grabbing">
                  drag_indicator
                </span>

                {/* Tweet number */}
                <span
                  className={`text-[10px] font-bold ${
                    index === 0 ? "text-[#FF9500]" : "text-[#E5E1E4]/40"
                  }`}
                >
                  {index === 0 ? "HOOK" : `${index + 1}/${tweets.length}`}
                </span>

                {/* Char count */}
                <div className="flex-1" />
                <span className={`text-[10px] font-mono ${charColor(tweet.length)}`}>
                  {tweet.length}/{MAX_TWEET_LENGTH}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingIndex !== index && (
                    <>
                      <button
                        onClick={() => startEdit(index)}
                        disabled={disabled}
                        className="p-1 rounded hover:bg-[#353437] transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-sm text-[#E5E1E4]/40">edit</span>
                      </button>
                      {onSharpen && (
                        <button
                          onClick={() => onSharpen(index, "Make this punchier")}
                          disabled={disabled}
                          className="p-1 rounded hover:bg-[#353437] transition-colors"
                          title="Sharpen"
                        >
                          <span className="material-symbols-outlined text-sm text-[#FF9500]/60">auto_fix_high</span>
                        </button>
                      )}
                      <button
                        onClick={() => removeTweet(index)}
                        disabled={disabled || tweets.length <= 1}
                        className="p-1 rounded hover:bg-[#ffb4ab]/10 transition-colors disabled:opacity-20"
                        title="Remove"
                      >
                        <span className="material-symbols-outlined text-sm text-[#ffb4ab]/60">close</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tweet content */}
              <div className="px-3 py-2.5">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBuffer}
                      onChange={(e) => setEditBuffer(e.target.value)}
                      rows={3}
                      autoFocus
                      className="w-full bg-transparent text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none resize-none"
                      placeholder={index === 0 ? "The hook — grab attention" : "Continue the thread..."}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 rounded-lg bg-[#FF9500]/10 border border-[#FF9500]/30 text-[10px] font-medium text-[#FF9500]"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 rounded-lg border border-[#353437] text-[10px] text-[#E5E1E4]/50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`text-sm leading-relaxed cursor-pointer ${
                      tweet ? "text-[#E5E1E4]/80" : "text-[#E5E1E4]/20 italic"
                    }`}
                    onClick={() => !disabled && startEdit(index)}
                  >
                    {tweet || "Click to write..."}
                  </p>
                )}
              </div>

              {/* Char bar */}
              <div className="h-0.5 bg-[#353437]/30 rounded-b-xl overflow-hidden">
                <motion.div
                  className={`h-full ${charBarColor(tweet.length)} rounded-b-xl`}
                  initial={{ width: 0 }}
                  animate={{ width: `${charBarWidth(tweet.length)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Thread preview */}
      {tweets.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => {
              const text = tweets.map((t, i) => `${i + 1}/${tweets.length} ${t}`).join("\n\n");
              navigator.clipboard.writeText(text);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-[#E5E1E4]/40 border border-[#353437]/30 hover:border-[#FF9500]/30 hover:text-[#FF9500] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
            Copy thread
          </button>
        </div>
      )}
    </div>
  );
}
