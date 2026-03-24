"use client";

import React, { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface CsvAdRow {
  headline: string;
  body: string;
  cta: string;
  template_type?: string;
  aspect_ratio?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

interface CsvBulkImportProps {
  onImport: (rows: CsvAdRow[]) => void;
  onClose: () => void;
}

function parseCsv(text: string): CsvAdRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["\s]/g, ""));
  const headlineIdx = headers.findIndex((h) => h === "headline" || h === "title" || h === "hook");
  const bodyIdx = headers.findIndex((h) => h === "body" || h === "text" || h === "description" || h === "copy");
  const ctaIdx = headers.findIndex((h) => h === "cta" || h === "calltoaction" || h === "button");
  const templateIdx = headers.findIndex((h) => h === "template" || h === "template_type" || h === "templatetype");
  const aspectIdx = headers.findIndex((h) => h === "aspect" || h === "aspect_ratio" || h === "aspectratio" || h === "ratio");
  const bgIdx = headers.findIndex((h) => h === "backgroundcolor" || h === "bgcolor" || h === "background");
  const textIdx = headers.findIndex((h) => h === "textcolor" || h === "color");
  const accentIdx = headers.findIndex((h) => h === "accentcolor" || h === "accent");

  if (headlineIdx === -1) return [];

  const rows: CsvAdRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (handles quoted fields with commas)
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    const headline = cols[headlineIdx]?.replace(/^"|"$/g, "") || "";
    if (!headline) continue;

    rows.push({
      headline,
      body: bodyIdx >= 0 ? (cols[bodyIdx]?.replace(/^"|"$/g, "") || "") : "",
      cta: ctaIdx >= 0 ? (cols[ctaIdx]?.replace(/^"|"$/g, "") || "Learn More") : "Learn More",
      template_type: templateIdx >= 0 ? (cols[templateIdx]?.replace(/^"|"$/g, "") || undefined) : undefined,
      aspect_ratio: aspectIdx >= 0 ? (cols[aspectIdx]?.replace(/^"|"$/g, "") || undefined) : undefined,
      backgroundColor: bgIdx >= 0 ? (cols[bgIdx]?.replace(/^"|"$/g, "") || undefined) : undefined,
      textColor: textIdx >= 0 ? (cols[textIdx]?.replace(/^"|"$/g, "") || undefined) : undefined,
      accentColor: accentIdx >= 0 ? (cols[accentIdx]?.replace(/^"|"$/g, "") || undefined) : undefined,
    });
  }
  return rows;
}

export function CsvBulkImport({ onImport, onClose }: CsvBulkImportProps) {
  const [rows, setRows] = useState<CsvAdRow[]>([]);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError("Could not parse CSV. Make sure it has a 'headline' column.");
        setRows([]);
      } else {
        setError("");
        setRows(parsed);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handlePaste = useCallback(() => {
    const parsed = parseCsv(rawText);
    if (parsed.length === 0) {
      setError("Could not parse. Make sure first row has column headers including 'headline'.");
      setRows([]);
    } else {
      setError("");
      setRows(parsed);
    }
  }, [rawText]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass-prism rounded-2xl border border-[#FF9500]/20 bg-[#1b1b1d]/80 backdrop-blur-xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#E5E1E4]">Import from CSV</h3>
          <p className="text-xs text-[#E5E1E4]/30 mt-1 font-mono">
            Columns: headline, body, cta, template_type, aspect_ratio, backgroundColor, textColor, accentColor
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[#E5E1E4]/30 hover:text-[#E5E1E4]/60 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[#554334]/40 rounded-xl p-8 text-center cursor-pointer hover:border-[#FF9500]/30 transition-colors"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p className="text-sm text-[#E5E1E4]/50">
          Drop a CSV file here or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Or paste */}
      <div>
        <p className="text-xs text-[#E5E1E4]/30 mb-2">Or paste CSV text:</p>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={4}
          placeholder={`headline,body,cta\n"Stop Wasting Time","Automate your workflow today","Try Free"\n"Scale Faster","AI-powered growth engine","Get Started"`}
          className="w-full px-4 py-3 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/15 font-mono focus:outline-none focus:border-[#FF9500]/50 transition-colors resize-none"
        />
        <button
          onClick={handlePaste}
          className="mt-2 px-4 py-2 text-xs font-medium text-[#FF9500] border border-[#FF9500]/20 rounded-lg hover:bg-[#FF9500]/10 transition-colors"
        >
          Parse Text
        </button>
      </div>

      {error && (
        <p className="text-xs text-[#ffb4ab]">{error}</p>
      )}

      {/* Preview parsed rows */}
      {rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#E5E1E4]/60">
            {rows.length} ad{rows.length !== 1 ? "s" : ""} parsed:
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 bg-[#353437]/20 rounded-lg text-xs"
              >
                <span className="text-[#FF9500] font-mono w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[#E5E1E4] font-medium flex-1 truncate">{row.headline}</span>
                <span className="text-[#E5E1E4]/40 truncate max-w-[200px]">{row.body}</span>
                <span className="text-[#FF9500]/60 whitespace-nowrap">{row.cta}</span>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onImport(rows)}
            className="w-full px-6 py-3 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-bold shadow-lg shadow-[#FF9500]/20"
          >
            Import {rows.length} Ad{rows.length !== 1 ? "s" : ""} &rarr;
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
