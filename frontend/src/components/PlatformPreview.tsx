"use client";

import React from "react";

interface PlatformPreviewProps {
  platform: string;
  title?: string | null;
  hook?: string | null;
  body: string;
  cta?: string | null;
  imageUrl?: string | null;
  authorName?: string;
}

/* ── X / Twitter ──────────────────────────────────────────────────────────── */
function XPreview({ hook, body, authorName }: PlatformPreviewProps) {
  const text = hook ? `${hook}\n\n${body}` : body;
  const charLimit = 280;
  const truncated = text.length > charLimit ? text.slice(0, charLimit - 1) + "\u2026" : text;
  const overLimit = text.length > charLimit;

  return (
    <div className="bg-black rounded-2xl p-4 max-w-[380px] text-white font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
          {(authorName || "Y")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">{authorName || "Your Brand"}</p>
          <p className="text-gray-500 text-xs">@{(authorName || "yourbrand").toLowerCase().replace(/\s+/g, "")}</p>
        </div>
      </div>
      {/* Body */}
      <p className="text-[15px] leading-snug whitespace-pre-wrap">{truncated}</p>
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800 text-gray-500 text-xs">
        <span>{text.length}/{charLimit}</span>
        {overLimit && (
          <span className="text-amber-500 font-medium">Over character limit</span>
        )}
      </div>
      {/* Engagement mock */}
      <div className="flex gap-6 mt-3 text-gray-500">
        <span className="flex items-center gap-1 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          Reply
        </span>
        <span className="flex items-center gap-1 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Repost
        </span>
        <span className="flex items-center gap-1 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          Like
        </span>
      </div>
    </div>
  );
}

/* ── LinkedIn ─────────────────────────────────────────────────────────────── */
function LinkedInPreview({ hook, body, cta, authorName }: PlatformPreviewProps) {
  const charLimit = 3000;
  const text = hook ? `${hook}\n\n${body}` : body;
  const showReadMore = text.length > 300;
  const displayText = showReadMore ? text.slice(0, 297) + "..." : text;

  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-[380px] font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
          {(authorName || "Y")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{authorName || "Your Brand"}</p>
          <p className="text-xs text-gray-500">Founder & CEO</p>
          <p className="text-xs text-gray-400">Just now</p>
        </div>
      </div>
      {/* Body */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{displayText}</p>
        {showReadMore && (
          <button className="text-sm text-gray-500 font-medium mt-1">...see more</button>
        )}
      </div>
      {/* CTA */}
      {cta && (
        <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-blue-600 font-medium">{cta}</p>
        </div>
      )}
      {/* Engagement */}
      <div className="border-t border-gray-100 px-4 py-2 flex justify-between text-xs text-gray-500">
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </div>
      <div className="px-4 pb-2 text-xs text-gray-400">
        {text.length}/{charLimit} characters
      </div>
    </div>
  );
}

/* ── Substack / Newsletter ────────────────────────────────────────────────── */
function SubstackPreview({ title, hook, body, cta, authorName }: PlatformPreviewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-[380px] font-serif overflow-hidden">
      {/* Top bar */}
      <div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex items-center justify-between">
        <span className="text-xs font-medium text-orange-700">Newsletter Preview</span>
        <span className="text-xs text-orange-500">{authorName || "Your Brand"}</span>
      </div>
      {/* Title */}
      <div className="p-6">
        {title && (
          <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{title}</h2>
        )}
        {hook && (
          <p className="text-base text-gray-700 italic mb-4 border-l-2 border-orange-300 pl-3">{hook}</p>
        )}
        {/* Body preview */}
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {body.length > 500 ? body.slice(0, 497) + "..." : body}
        </div>
        {/* CTA */}
        {cta && (
          <div className="mt-4">
            <button className="w-full py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg">
              {cta}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Meta / Instagram ─────────────────────────────────────────────────────── */
function MetaPreview({ hook, body, cta, authorName, imageUrl }: PlatformPreviewProps) {
  const caption = hook ? `${hook}\n\n${body}` : body;
  const charLimit = 2200;
  const showMore = caption.length > 125;
  const displayCaption = showMore ? caption.slice(0, 122) + "..." : caption;

  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-[380px] font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold ring-2 ring-pink-200">
          {(authorName || "Y")[0].toUpperCase()}
        </div>
        <p className="text-sm font-semibold text-gray-900">{(authorName || "yourbrand").toLowerCase().replace(/\s+/g, "")}</p>
      </div>
      {/* Image area */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-300 text-xs">Image / Video</div>
        )}
      </div>
      {/* Caption */}
      <div className="p-3">
        <p className="text-sm text-gray-900">
          <span className="font-semibold mr-1">{(authorName || "yourbrand").toLowerCase().replace(/\s+/g, "")}</span>
          {displayCaption}
        </p>
        {showMore && (
          <button className="text-sm text-gray-400 mt-0.5">more</button>
        )}
        {cta && (
          <p className="text-xs text-blue-600 mt-1 font-medium">{cta}</p>
        )}
      </div>
      <div className="px-3 pb-2 text-xs text-gray-400">
        {caption.length}/{charLimit} characters
      </div>
    </div>
  );
}

/* ── Dispatcher ───────────────────────────────────────────────────────────── */
export function PlatformPreview(props: PlatformPreviewProps) {
  switch (props.platform) {
    case "twitter":
      return <XPreview {...props} />;
    case "linkedin":
      return <LinkedInPreview {...props} />;
    case "meta":
      return <MetaPreview {...props} />;
    case "newsletter":
    case "substack":
    case "blog_draft":
      return <SubstackPreview {...props} />;
    default:
      return <LinkedInPreview {...props} />;
  }
}

export const PLATFORM_PREVIEW_OPTIONS = [
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "meta", label: "Meta / Instagram" },
  { value: "substack", label: "Substack / Newsletter" },
];
