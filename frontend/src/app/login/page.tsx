"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(password, email || undefined);
      setToken(token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setError("");
    setGuestLoading(true);
    try {
      const { token } = await api.guestLogin();
      setToken(token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest login unavailable");
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#131315] relative overflow-hidden">
      {/* Background liquid effects */}
      <div className="liquid-glow top-[-20%] left-[10%] opacity-30" />
      <div className="liquid-glow-secondary bottom-[-10%] right-[5%] opacity-20" />

      <div className="w-full max-w-sm relative z-10 entrance-fade stagger-2">
        <div className="glass-card rounded-[2rem] p-10 border border-white/10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold tracking-tighter text-[#E5E1E4] mb-2">
              Iterant
            </h1>
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#c6c4df]">
              Sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-5 py-4 bg-[#201f21] border border-white/10 rounded-xl text-[#E5E1E4] placeholder-[#E5E1E4]/30 focus:outline-none focus:ring-2 focus:ring-[#FF9500]/50 focus:border-[#FF9500]/50 transition-all"
                autoFocus
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-5 py-4 bg-[#201f21] border border-white/10 rounded-xl text-[#E5E1E4] placeholder-[#E5E1E4]/30 focus:outline-none focus:ring-2 focus:ring-[#FF9500]/50 focus:border-[#FF9500]/50 transition-all"
              />
            </div>

            {error && (
              <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg px-4 py-3">
                <p className="text-sm text-[#ffb4ab] text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !email}
              className="w-full py-4 bg-[#FF9500] text-[#2d1600] font-bold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_8px_32px_rgba(255,149,0,0.2)] hover:shadow-[0_12px_48px_rgba(255,149,0,0.4)] hover:-translate-y-0.5 haptic-btn text-sm uppercase tracking-widest"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2d1600] animate-pulse" />
                  Signing in
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-transparent px-3 text-[10px] uppercase tracking-[0.15em] text-[#c6c4df]/50">
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="w-full py-4 bg-[#201f21] border border-white/10 text-[#c6c4df] font-bold rounded-xl hover:bg-[#2a292b] hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-widest"
          >
            {guestLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c6c4df] animate-pulse" />
                Loading demo
              </span>
            ) : (
              "Try Demo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
