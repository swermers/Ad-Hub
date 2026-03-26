"use client";

/**
 * ContentEditor — format-aware editor that renders the right editor
 * based on content type and metadata.
 *
 * Detects:
 * - X threads (metadata.tweets array)
 * - Video scripts (metadata.blocks array)
 * - Newsletters (content_type blog_draft + metadata.source contains "pipeline")
 * - Social posts (everything else)
 */

import { useMemo } from "react";
import ThreadEditor from "./ThreadEditor";
import SocialPostEditor from "./SocialPostEditor";
import VideoScriptEditor from "./VideoScriptEditor";
import NewsletterEditor from "./NewsletterEditor";

export { ThreadEditor, SocialPostEditor, VideoScriptEditor, NewsletterEditor };

interface ContentEditorProps {
  contentType: string;
  platform: string;
  body: string;
  title: string;
  hook: string | null;
  cta: string | null;
  metadata: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  onSharpen?: (feedback: string) => void;
  disabled?: boolean;
}

type DetectedFormat = "thread" | "video_script" | "newsletter" | "social_post";

function detectFormat(contentType: string, metadata: Record<string, unknown>): DetectedFormat {
  // Thread: has tweets array in metadata
  if (metadata.tweets && Array.isArray(metadata.tweets) && (metadata.tweets as string[]).length > 0) {
    return "thread";
  }

  // Video script: has blocks array in metadata
  if (metadata.blocks && Array.isArray(metadata.blocks) && (metadata.blocks as string[]).length > 0) {
    return "video_script";
  }

  // Newsletter: blog_draft type from pipeline
  if (contentType === "blog_draft") {
    const source = metadata.source as string || "";
    if (source.includes("pipeline") || source.includes("voice_memo") || metadata.template_used) {
      return "newsletter";
    }
  }

  return "social_post";
}

export default function ContentEditor({
  contentType,
  platform,
  body,
  title,
  hook,
  cta,
  metadata,
  onChange,
  onSharpen,
  disabled = false,
}: ContentEditorProps) {
  const format = useMemo(() => detectFormat(contentType, metadata), [contentType, metadata]);

  if (format === "thread") {
    const tweets = (metadata.tweets as string[]) || body.split("\n\n").filter(Boolean);
    return (
      <ThreadEditor
        tweets={tweets}
        onChange={(newTweets) => {
          onChange({
            body: newTweets.join("\n\n"),
            metadata: { ...metadata, tweets: newTweets },
          });
        }}
        onSharpen={onSharpen ? (index, feedback) => onSharpen(`Tweet ${index + 1}: ${feedback}`) : undefined}
        disabled={disabled}
      />
    );
  }

  if (format === "video_script") {
    const blocks = (metadata.blocks as string[]) || body.split("\n\n").filter(Boolean);
    return (
      <VideoScriptEditor
        blocks={blocks}
        hook={hook}
        cta={cta}
        onChange={(updates) => {
          const newBody = updates.blocks ? updates.blocks.join("\n\n") : body;
          onChange({
            body: newBody,
            hook: updates.hook ?? hook,
            cta: updates.cta ?? cta,
            metadata: updates.blocks ? { ...metadata, blocks: updates.blocks } : metadata,
          });
        }}
        onSharpen={onSharpen ? (index, feedback) => onSharpen(`Block ${index + 1}: ${feedback}`) : undefined}
        disabled={disabled}
      />
    );
  }

  if (format === "newsletter") {
    return (
      <NewsletterEditor
        body={body}
        title={title}
        subjectLine={(metadata.subject as string) || hook || undefined}
        previewText={(metadata.preview_text as string) || (metadata.preview as string) || undefined}
        onChange={(updates) => {
          onChange({
            body: updates.body ?? body,
            title: updates.title ?? title,
            hook: updates.subjectLine ?? hook,
            metadata: {
              ...metadata,
              subject: updates.subjectLine,
              preview_text: updates.previewText,
            },
          });
        }}
        onSharpen={onSharpen}
        disabled={disabled}
      />
    );
  }

  // Default: social post
  return (
    <SocialPostEditor
      body={body}
      hook={hook}
      platform={platform}
      onChange={(updates) => onChange(updates)}
      onSharpen={onSharpen}
      metadata={{
        specificity_check: metadata.specificity_check as string,
        tension_check: metadata.tension_check as string,
        stealable_line: metadata.stealable_line as string,
      }}
      disabled={disabled}
    />
  );
}
