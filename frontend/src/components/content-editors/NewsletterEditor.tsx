"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface NewsletterEditorProps {
  body: string;
  title: string;
  subjectLine?: string;
  previewText?: string;
  onChange: (updates: { body?: string; title?: string; subjectLine?: string; previewText?: string }) => void;
  onSharpen?: (feedback: string) => void;
  disabled?: boolean;
}

export default function NewsletterEditor({
  body,
  title,
  subjectLine,
  previewText,
  onChange,
  onSharpen,
  disabled = false,
}: NewsletterEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(body);
  const [editTitle, setEditTitle] = useState(title);
  const [editSubject, setEditSubject] = useState(subjectLine || "");
  const [editPreview, setEditPreview] = useState(previewText || "");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 238));

  const startEdit = () => {
    setEditBody(body);
    setEditTitle(title);
    setEditSubject(subjectLine || "");
    setEditPreview(previewText || "");
    setEditing(true);
    setViewMode("edit");
  };

  const saveEdit = () => {
    onChange({
      body: editBody,
      title: editTitle,
      subjectLine: editSubject || undefined,
      previewText: editPreview || undefined,
    });
    setEditing(false);
    setViewMode("preview");
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-[#ffbd7f]">mail</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
            Newsletter
          </span>
          <span className="text-[10px] text-[#E5E1E4]/30">
            {wordCount} words &middot; {readTime} min read
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              {onSharpen && (
                <button
                  onClick={() => onSharpen("Tighten the opening, make the hook stronger")}
                  disabled={disabled}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#FF9500]/70 border border-[#FF9500]/20 hover:bg-[#FF9500]/10 transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                  Sharpen
                </button>
              )}
              <button
                onClick={startEdit}
                disabled={disabled}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#E5E1E4]/50 border border-[#353437] hover:border-[#FF9500]/30 hover:text-[#FF9500] transition-colors disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Email envelope preview */}
      <div className="rounded-xl border border-[#353437]/50 bg-[#131315]/40 overflow-hidden">
        {/* Subject line / preview text bar */}
        <div className="px-4 py-3 border-b border-[#353437]/30 space-y-1.5">
          {editing ? (
            <>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#E5E1E4]/30 mb-1 block">Subject</label>
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#E5E1E4] font-medium focus:outline-none"
                  placeholder="Email subject line"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#E5E1E4]/30 mb-1 block">Preview</label>
                <input
                  value={editPreview}
                  onChange={(e) => setEditPreview(e.target.value)}
                  className="w-full bg-transparent text-[11px] text-[#E5E1E4]/50 focus:outline-none"
                  placeholder="Preview text (shown in inbox before opening)"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#E5E1E4]/30 mb-1 block">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#E5E1E4] font-semibold focus:outline-none"
                  placeholder="Newsletter title"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#E5E1E4]/30">Subject:</span>
                <p className="text-sm text-[#E5E1E4]/70 font-medium truncate">
                  {subjectLine || title || "Untitled"}
                </p>
              </div>
              {previewText && (
                <p className="text-[11px] text-[#E5E1E4]/30 truncate">{previewText}</p>
              )}
            </>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {editing ? (
            <div className="space-y-3">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={20}
                className="w-full bg-transparent text-sm text-[#E5E1E4]/80 leading-relaxed focus:outline-none resize-y font-mono"
                placeholder="Newsletter body (markdown supported)..."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  className="px-3 py-1.5 rounded-lg bg-[#FF9500]/10 border border-[#FF9500]/30 text-xs font-medium text-[#FF9500]"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditing(false); setViewMode("preview"); }}
                  className="px-3 py-1.5 rounded-lg border border-[#353437] text-xs text-[#E5E1E4]/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {title && !subjectLine && (
                <h2 className="text-xl font-bold text-[#E5E1E4]">{title}</h2>
              )}
              <div className="prose prose-invert prose-sm max-w-none text-[#E5E1E4]/70 leading-relaxed whitespace-pre-wrap">
                {body || <span className="italic text-[#E5E1E4]/20">No content</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 text-[10px] text-[#E5E1E4]/30">
        <span>{wordCount} words &middot; {readTime} min read</span>
        <span>&middot;</span>
        <button
          onClick={() => navigator.clipboard.writeText(body)}
          className="hover:text-[#FF9500] transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xs">content_copy</span>
          Copy body
        </button>
      </div>
    </div>
  );
}
