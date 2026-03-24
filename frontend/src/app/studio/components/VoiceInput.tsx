"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

const WAVEFORM_HEIGHTS = [12, 20, 28, 36, 44, 52, 44, 36, 28, 20, 16, 10];

interface VoiceInputProps {
  /** Combined text (transcript + manual notes) */
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}

type InputMode = "idle" | "recording" | "transcribing" | "ready";

export default function VoiceInput({ value, onChange, disabled }: VoiceInputProps) {
  const [mode, setMode] = useState<InputMode>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setMode("transcribing");

      try {
        const result = await api.transcribeAudio(file);
        const transcript = result.transcript || "";
        setTranscriptText(transcript);
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

  /* ── In-browser mic recording ── */

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop all tracks so the browser mic indicator goes away
        stream.getTracks().forEach((t) => t.stop());

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const file = new File([blob], "recording.webm", { type: mimeType });
          handleFile(file);
        }
      };

      recorder.start(1000); // collect chunks every second
      mediaRecorderRef.current = recorder;
      setRecordingTime(0);
      setMode("recording");

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      setError("Microphone access denied. Check browser permissions.");
    }
  }, [handleFile]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /* ── File drop / select ── */

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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Voice Input Zone */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onDragOver={(e) => {
          e.preventDefault();
          if (mode === "idle") setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={mode === "idle" ? onDrop : undefined}
        className={`glass-prism rounded-2xl border bg-[#1b1b1d]/60 backdrop-blur-xl p-6 group relative overflow-hidden transition-all ${
          dragOver
            ? "border-[#FF9500] shadow-[0_0_32px_rgba(255,149,0,0.15)]"
            : mode === "recording"
            ? "border-[#FF9500]/60 shadow-[0_0_24px_rgba(255,149,0,0.1)]"
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
          {mode === "recording" ? (
            /* Recording state — live mic capture */
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative flex flex-col items-center text-center py-6"
            >
              {/* Pulsing red indicator */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute w-20 h-20 rounded-full bg-[#FF9500]/10 animate-ping" />
                </div>
                <div className="relative w-16 h-16 rounded-full bg-[#FF9500]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FF9500] text-3xl">
                    graphic_eq
                  </span>
                </div>
              </div>

              {/* Live waveform */}
              <div className="flex items-end gap-1.5 h-10 mb-3">
                {WAVEFORM_HEIGHTS.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-2 rounded-full bg-[#FF9500]"
                    style={{ opacity: 0.5 + (h / 52) * 0.5 }}
                    animate={{ height: [h * 0.3, h * 0.9, h * 0.3] }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.07,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              <p className="text-sm font-medium text-[#FF9500] mb-1">Recording...</p>
              <p className="text-2xl font-mono font-bold text-[#E5E1E4] mb-4">
                {formatTime(recordingTime)}
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className="px-6 py-2.5 rounded-xl bg-[#FF9500] text-sm font-bold text-[#2d1600] hover:bg-[#ffbd7f] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">stop</span>
                  Stop &amp; Transcribe
                </span>
              </motion.button>
            </motion.div>
          ) : mode === "transcribing" ? (
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
            /* Idle — record + upload zone */
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
                Record or upload a voice memo
              </h3>
              <p className="text-xs text-[#E5E1E4]/40 mb-5">
                Speak your idea — it will be transcribed to text automatically
              </p>

              <div className="flex items-center gap-3">
                {/* Record button */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startRecording}
                  className="liquid-gradient px-5 py-2.5 rounded-xl text-sm font-bold text-[#2d1600] hover:shadow-[0_4px_24px_rgba(255,149,0,0.35)] transition-shadow"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">mic</span>
                    Record
                  </span>
                </motion.button>

                <span className="text-xs text-[#E5E1E4]/25">or</span>

                {/* Upload button */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fileRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl border border-[#554334] text-sm font-medium text-[#E5E1E4]/70 hover:border-[#FF9500]/50 hover:text-[#E5E1E4] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">upload_file</span>
                    Upload file
                  </span>
                </motion.button>
              </div>

              <p className="text-[10px] text-[#E5E1E4]/20 mt-4">
                Supports mp3, m4a, wav, webm, ogg, flac — or drag &amp; drop anywhere
              </p>

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
