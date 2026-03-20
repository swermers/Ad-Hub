"use client";

import React from "react";
import { TemplateRenderer } from "./TemplateRenderer";
import type { AspectRatio } from "./types";
import { ASPECT_DIMENSIONS } from "./types";

interface AdPreviewCardProps {
  variation: {
    id: string;
    headline: string;
    body: string;
    cta: string;
    template_type: string | null;
    template_config: Record<string, string>;
    pain_point_text: string | null;
    status: string;
  };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: () => void;
  aspectRatio?: AspectRatio;
  screenshotUrl?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-green-100 text-green-700",
  exported: "bg-blue-100 text-blue-700",
  uploaded: "bg-purple-100 text-purple-700",
  live: "bg-emerald-100 text-emerald-700",
  paused: "bg-red-100 text-red-700",
};

export function AdPreviewCard({
  variation,
  selected,
  onToggleSelect,
  onClick,
  aspectRatio = "1:1",
  screenshotUrl,
}: AdPreviewCardProps) {
  const dims = ASPECT_DIMENSIONS[aspectRatio];
  const previewWidth = 270;
  const scaleFactor = previewWidth / dims.width;
  const previewHeight = dims.height * scaleFactor;

  return (
    <div
      className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
        selected ? "border-blue-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(variation.id)}
          className="w-5 h-5 rounded border-gray-300 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Status badge */}
      <div className="absolute top-2 right-2 z-10">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[variation.status] || "bg-gray-100 text-gray-700"}`}>
          {variation.status}
        </span>
      </div>

      {/* Preview - scaled down */}
      <div
        onClick={onClick}
        style={{
          width: previewWidth,
          height: previewHeight,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `scale(${scaleFactor})`,
            transformOrigin: "top left",
          }}
        >
          <TemplateRenderer
            templateType={variation.template_type || "pain_solution"}
            headline={variation.headline}
            body={variation.body}
            cta={variation.cta}
            aspectRatio={aspectRatio}
            screenshotUrl={screenshotUrl}
            {...variation.template_config}
          />
        </div>
      </div>

      {/* Info bar */}
      <div className="p-3 bg-white border-t border-gray-100">
        <p className="text-xs font-medium text-gray-900 truncate">{variation.headline}</p>
        {variation.pain_point_text && (
          <p className="text-xs text-gray-500 truncate mt-1">{variation.pain_point_text}</p>
        )}
      </div>
    </div>
  );
}
