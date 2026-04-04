"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { api, type ContentPiece, type PipelineFinalizeResult } from "@/lib/api";

const PLATFORM_META: Record<string, { icon: string; label: string; color: string }> = {
  twitter: { icon: "tag", label: "X / Twitter", color: "#1DA1F2" },
  linkedin: { icon: "work", label: "LinkedIn", color: "#0A66C2" },
  meta: { icon: "group", label: "Meta", color: "#1877F2" },
  general: { icon: "public", label: "General", color: "#FF9500" },
};

const TYPE_META: Record<string, { icon: string; label: string }> = {
  social_post: { icon: "forum", label: "Social Post" },
  blog_draft: { icon: "edit_note", label: "Newsletter / Article" },
  ad_copy: { icon: "campaign", label: "Ad Copy" },
  carousel: { icon: "view_carousel", label: "Carousel" },
  story: { icon: "slideshow", label: "Story / Reel" },
  email: { icon: "mail", label: "Email" },
};

interface ContentOutputProps {
  result: PipelineFinalizeResult;
  productId: string;
}

export default function ContentOutput({ result, productId }: ContentOutputProps) {
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPieces = useCallback(async () => {
    if (result.content_ids.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all = await api.listContent({ product_id: productId || undefined });
      const saved = all.filter((p) => result.content_ids.includes(p.id));
      setPieces(saved);
    } catch (err) {
      console.error("Failed to load content pieces:", err);
      setError(err instanceof Error ? err.message : "Failed to load content pieces");
    } finally {
      setLoading(false);
    }
  }, [result, productId]);

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-8"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#FF9500] animate-spin">
            progress_activity
          </span>
          <span className="text-sm text-[#E5E1E4]/50">Loading your content...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-prism rounded-2xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 backdrop-blur-xl p-8 text-center"
      >
        <span className="material-symbols-outlined text-[#ffb4ab] text-4xl mb-3 block">
          error_outline
        </span>
        <p className="text-sm text-[#ffb4ab]/80 mb-1">
          {result.pieces_saved} piece{result.pieces_saved !== 1 ? "s" : ""} saved, but failed to load preview.
        </p>
        <p className="text-xs text-[#E5E1E4]/30 mb-4">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => fetchPieces()}
            className="px-4 py-2 rounded-lg border border-[#FF9500]/40 text-[#FF9500] text-xs font-semibold hover:bg-[#FF9500]/10 transition-colors"
          >
            Retry
          </button>
          <Link href="/content" className="text-[#FF9500] hover:underline text-xs">
            View in Content Library
          </Link>
        </div>
      </motion.div>
    );
  }

  if (pieces.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-8 text-center"
      >
        <span className="material-symbols-outlined text-[#FF9500] text-4xl mb-3 block">
          inventory_2
        </span>
        <p className="text-sm text-[#E5E1E4]/50">
          {result.pieces_saved} piece{result.pieces_saved !== 1 ? "s" : ""} saved.{" "}
          <Link href="/content" className="text-[#FF9500] hover:underline">
            View in Content Library
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4ade80]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#4ade80] text-xl">task_alt</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#E5E1E4]">
              {pieces.length} Piece{pieces.length !== 1 ? "s" : ""} Ready
            </h3>
            <p className="text-[10px] text-[#E5E1E4]/40">
              Copy, review, or schedule your content
            </p>
          </div>
        </div>

        <a
          href="/content"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#554334] text-xs text-[#E5E1E4]/60 hover:border-[#FF9500]/50 hover:text-[#FF9500] transition-colors"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          Content Library
        </a>
      </div>

      {/* Pieces */}
      <div className="space-y-3">
        <AnimatePresence>
          {pieces.map((piece, i) => {
            const platform = PLATFORM_META[piece.platform] || PLATFORM_META.general;
            const type = TYPE_META[piece.content_type] || { icon: "article", label: piece.content_type };
            const isExpanded = expandedId === piece.id;
            const isCopied = copiedId === piece.id;

            return (
              <motion.div
                key={piece.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl overflow-hidden"
              >
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : piece.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#1b1b1d]/80 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${platform.color}15` }}
                  >
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ color: platform.color }}
                    >
                      {platform.icon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#E5E1E4] truncate">
                        {piece.title || type.label}
                      </p>
                      <span className="px-1.5 py-0.5 rounded bg-[#353437] text-[9px] text-[#E5E1E4]/40 flex-shrink-0">
                        {platform.label}
                      </span>
                    </div>
                    {piece.hook && (
                      <p className="text-[11px] text-[#E5E1E4]/40 truncate mt-0.5">
                        {piece.hook}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Copy button */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const text = [piece.hook, piece.body, piece.cta]
                          .filter(Boolean)
                          .join("\n\n");
                        copyToClipboard(text, piece.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isCopied
                          ? "bg-[#4ade80]/10 text-[#4ade80]"
                          : "hover:bg-[#353437]/50 text-[#E5E1E4]/40 hover:text-[#E5E1E4]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isCopied ? "check" : "content_copy"}
                      </span>
                    </motion.div>

                    {/* Expand chevron */}
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="material-symbols-outlined text-lg text-[#E5E1E4]/30"
                    >
                      expand_more
                    </motion.span>
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 pt-1 border-t border-[#353437]/30 space-y-3">
                        {/* Hook */}
                        {piece.hook && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#FF9500] font-semibold mb-1">
                              Hook
                            </p>
                            <p className="text-sm text-[#E5E1E4]/80">{piece.hook}</p>
                          </div>
                        )}

                        {/* Body */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 font-semibold mb-1">
                            Body
                          </p>
                          <div className="text-sm text-[#E5E1E4]/70 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2">
                            {piece.body}
                          </div>
                        </div>

                        {/* CTA */}
                        {piece.cta && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 font-semibold mb-1">
                              CTA
                            </p>
                            <p className="text-sm text-[#ffbd7f]">{piece.cta}</p>
                          </div>
                        )}

                        {/* Actions row */}
                        <div className="flex items-center gap-2 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              const text = [piece.hook, piece.body, piece.cta]
                                .filter(Boolean)
                                .join("\n\n");
                              copyToClipboard(text, piece.id);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isCopied
                                ? "bg-[#4ade80]/10 border border-[#4ade80]/20 text-[#4ade80]"
                                : "border border-[#554334] text-[#E5E1E4]/60 hover:border-[#FF9500]/40 hover:text-[#FF9500]"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isCopied ? "check" : "content_copy"}
                            </span>
                            {isCopied ? "Copied" : "Copy All"}
                          </motion.button>

                          <a
                            href={`/content/${piece.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#554334] text-xs font-medium text-[#E5E1E4]/60 hover:border-[#FF9500]/40 hover:text-[#FF9500] transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            Edit in Detail
                          </a>

                          <a
                            href={`/schedule?content_id=${piece.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#554334] text-xs font-medium text-[#E5E1E4]/60 hover:border-[#FF9500]/40 hover:text-[#FF9500] transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">
                              schedule_send
                            </span>
                            Schedule
                          </a>

                          {/* Meta: type + funnel stage */}
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#353437] text-[9px] text-[#E5E1E4]/40">
                              {type.label}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#353437] text-[9px] text-[#E5E1E4]/40">
                              {piece.funnel_stage}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Seed bank callout */}
      {result.seed_id && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/40"
        >
          <span className="material-symbols-outlined text-[#FF9500] text-lg">database</span>
          <p className="text-xs text-[#E5E1E4]/50">
            Idea saved to{" "}
            <Link href="/seeds" className="text-[#FF9500] hover:underline">
              Seed Bank
            </Link>{" "}
            for future reference
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
