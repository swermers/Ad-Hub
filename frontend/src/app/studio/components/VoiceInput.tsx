"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

const WAVEFORM_HEIGHTS = [12, 20, 28, 36, 44, 52, 44, 36, 28, 20, 16, 10];

interface VoiceInputProps {
  /** Combined text (transcript + manual notes) */
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}

type InputMode = "idle" | "transcribing" | "ready";

export default function VoiceInput({ value, onChange, disabled }: VoiceInputProps) {
  const [mode, setMode] = useState<InputMode>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setMode("transcribing");

      try {
        const result = await api.transcribeAudio(file);
        const transcript = result.transcript || "";
        setTranscriptText(transcript);
        // Append transcript to existing manual text, or set it if empty
        const combined = value ? `${value}\n\n--- Voice Memo ---\n${transcript}` : transcript;
        onChange(combined);
        setMode("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed");
        setMode("idle");
      }
    },
    [value, onChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-4">
      {/* Voice Memo Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`glass-prism rounded-2xl border bg-[#1b1b1d]/60 backdrop-blur-xl p-6 group relative overflow-hidden transition-all ${
          dragOver
            ? "border-[#FF9500] shadow-[0_0_32px_rgba(255,149,0,0.15)]"
            : "border-[#554334]/30"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] rounded-2xl"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, #FF9500 0%, transparent 70%)",
          }}
        />

        <AnimatePresence mode="wait">
          {mode === "transcribing" ? (
            /* Transcribing state */
            <motion.div
              key="transcribing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative flex flex-col items-center text-center py-6"
            >
              <div className="flex items-end gap-1.5 h-14 mb-4">
                {WAVEFORM_HEIGHTS.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-2 rounded-full bg-[#FF9500]"
                    style={{ opacity: 0.4 + (h / 52) * 0.6 }}
                    animate={{ height: [h * 0.4, h, h * 0.4] }}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-[#FF9500]">Transcribing voice memo...</p>
              <p className="text-xs text-[#E5E1E4]/40 mt-1">This may take a moment</p>
            </motion.div>
          ) : mode === "ready" ? (
            /* Transcript ready — compact summary */
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative flex items-center gap-4 py-2"
            >
              <div className="w-12 h-12 rounded-xl bg-[#4ade80]/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#4ade80] text-2xl">
                  check_circle
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#E5E1E4]">Voice memo transcribed</p>
                <p className="text-xs text-[#E5E1E4]/40 truncate">
                  {transcriptText.slice(0, 80)}
                  {transcriptText.length > 80 ? "..." : ""}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setMode("idle");
                  setTranscriptText("");
                }}
                className="px-3 py-1.5 rounded-lg border border-[#554334] text-xs text-[#E5E1E4]/60 hover:border-[#FF9500]/50 hover:text-[#E5E1E4] transition-colors"
              >
                <span className="material-symbols-outlined text-sm mr-1 align-middle">
                  refresh
                </span>
                New
              </motion.button>
            </motion.div>
          ) : (
            /* Idle — drop zone */
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative flex flex-col items-center text-center py-6"
            >
              {/* Mic icon with pulse */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute w-16 h-16 rounded-full border border-[#FF9500]/20 animate-ping" />
                  <span
                    className="absolute w-24 h-24 rounded-full border border-[#FF9500]/10 animate-ping"
                    style={{ animationDelay: "0.5s" }}
                  />
                </div>
                <div className="relative w-14 h-14 rounded-full bg-[#FF9500]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FF9500] text-3xl">mic</span>
                </div>
              </div>

              <h3 className="text-base font-semibold text-[#E5E1E4] mb-1">
                Drop voice memo here
              </h3>
              <p className="text-xs text-[#E5E1E4]/40 mb-4">
                Drag an audio file or click to upload — it will be transcribed automatically
              </p>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-xl border border-[#554334] text-sm font-medium text-[#E5E1E4]/70 hover:border-[#FF9500]/50 hover:text-[#E5E1E4] transition-colors"
              >
                <span className="material-symbols-outlined text-base mr-1.5 align-middle">
                  upload_file
                </span>
                Select audio file
              </motion.button>

              <input
                ref={fileRef}
                type="file"
                accept=".mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac"
                onChange={onFileSelect}
                className="hidden"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 px-3 py-2 rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/20"
            >
              <p className="text-xs text-[#ffb4ab]">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Manual Notes Textarea */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
            Notes &amp; Transcript
          </label>
          {value.length > 0 && (
            <span className="text-[10px] font-mono text-[#E5E1E4]/30">
              {value.length.toLocaleString()} chars
            </span>
          )}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your idea, paste notes, or record a voice memo above — everything combines into one input for the content pipeline..."
          rows={6}
          className="w-full bg-[#131315]/60 border border-[#353437] rounded-xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 resize-y min-h-[120px] transition-all disabled:opacity-50"
        />
        <p className="text-[10px] text-[#E5E1E4]/25 mt-2">
          Voice memos are transcribed and appended here. Edit freely before running the pipeline.
        </p>
      </motion.div>
    </div>
  );
}
