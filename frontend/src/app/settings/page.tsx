"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, PlatformConnection, Product } from "@/lib/api";

const PLATFORMS = [
  {
    value: "twitter",
    label: "X / Twitter",
    color: "#1DA1F2",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    value: "meta",
    label: "Meta / Facebook",
    color: "#0081FB",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z" />
      </svg>
    ),
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function SettingsPage() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [productId, setProductId] = useState("");
  const [platform, setPlatform] = useState("twitter");
  const [accessToken, setAccessToken] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, { valid: boolean; error?: string }>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [conns, prods] = await Promise.all([
        api.listConnections(),
        api.listProducts(),
      ]);
      setConnections(conns);
      setProducts(prods);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createConnection({
        product_id: productId,
        platform,
        access_token: accessToken,
        platform_account_name: accountName || undefined,
        platform_account_id: accountId || undefined,
      });
      setShowForm(false);
      setAccessToken("");
      setAccountName("");
      setAccountId("");
      await loadData();
    } catch (err) {
      console.error("Failed to save connection:", err);
      alert("Failed to save connection");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Disconnect this platform?")) return;
    try {
      await api.deleteConnection(id);
      await loadData();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const result = await api.testConnection(id);
      setTestResult((prev) => ({
        ...prev,
        [id]: { valid: result.valid, error: result.error || undefined },
      }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [id]: { valid: false, error: String(err) },
      }));
    } finally {
      setTestingId(null);
    }
  }

  const statusColor = (status: string) => {
    if (status === "active") return "bg-[#4ade80]/10 text-[#4ade80]";
    if (status === "expired") return "bg-[#ffbd7f]/10 text-[#ffbd7f]";
    return "bg-[#ffb4ab]/10 text-[#ffb4ab]";
  };

  const statusDotColor = (status: string) => {
    if (status === "active") return "bg-[#4ade80]";
    if (status === "expired") return "bg-[#ffbd7f]";
    return "bg-[#ffb4ab]";
  };

  const getPlatformConfig = (platformValue: string) =>
    PLATFORMS.find((p) => p.value === platformValue) || PLATFORMS[0];

  if (loading) {
    return (
      <motion.div
        className="animate-pulse space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <div className="h-3 w-28 bg-[#FF9500]/20 rounded" />
            <div className="h-12 w-72 bg-[#E5E1E4]/10 rounded" />
            <div className="h-4 w-48 bg-[#E5E1E4]/5 rounded" />
          </div>
          <div className="h-10 w-40 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-24"
            />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 space-y-3"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E5E1E4]/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-[#E5E1E4]/10 rounded" />
                <div className="h-3 w-24 bg-[#E5E1E4]/5 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-20 bg-[#E5E1E4]/5 rounded-xl" />
                <div className="h-9 w-28 bg-[#E5E1E4]/5 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
                Platform Settings
              </p>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4]">
              Connections<span className="text-[#E5E1E4]/30">{" "}Hub.</span>
            </h1>
            <p className="text-[#E5E1E4]/40 text-sm mt-2 font-mono">
              SYS:PLATFORM_BRIDGE // {connections.length} active link
              {connections.length !== 1 ? "s" : ""} //{" "}
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              showForm
                ? "bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20 hover:bg-[#ffb4ab]/20"
                : "bg-[#FF9500] text-[#2d1600] shadow-lg shadow-[#FF9500]/20 hover:shadow-[#FF9500]/40"
            }`}
          >
            {showForm ? "Cancel" : "Connect Platform"}
          </motion.button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        {...fadeUp(0.08)}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
      >
        <StatCard
          label="Total Connections"
          value={connections.length}
          color="#FF9500"
          delay={0}
        />
        <StatCard
          label="Active"
          value={connections.filter((c) => c.status === "active").length}
          color="#4ade80"
          delay={0.08}
        />
        <StatCard
          label="Needs Attention"
          value={
            connections.filter(
              (c) => c.status === "expired" || c.status === "revoked"
            ).length
          }
          color="#ffb4ab"
          delay={0.16}
        />
      </motion.div>

      {/* Connect Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: -16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -16, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 md:p-8 mb-8 overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#FF9500]/10">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF9500"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
                  New Connection
                </p>
                <p className="text-xs text-[#E5E1E4]/40 mt-0.5">
                  Link a new platform account
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-2">
                  Product
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                  className="w-full bg-[#1b1b1d]/60 backdrop-blur-xl border border-[#554334]/30 rounded-2xl px-4 py-3 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-2">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-[#1b1b1d]/60 backdrop-blur-xl border border-[#554334]/30 rounded-2xl px-4 py-3 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-2">
                Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required
                placeholder="Paste your API access token"
                className="w-full bg-[#1b1b1d]/60 backdrop-blur-xl border border-[#554334]/30 rounded-2xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="block text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-2">
                  Account Name{" "}
                  <span className="text-[#E5E1E4]/20 normal-case tracking-normal font-medium">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. @myhandle"
                  className="w-full bg-[#1b1b1d]/60 backdrop-blur-xl border border-[#554334]/30 rounded-2xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-2">
                  Account / Page ID{" "}
                  <span className="text-[#E5E1E4]/20 normal-case tracking-normal font-medium">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="Platform account ID"
                  className="w-full bg-[#1b1b1d]/60 backdrop-blur-xl border border-[#554334]/30 rounded-2xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-3 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold shadow-lg shadow-[#FF9500]/20 hover:shadow-[#FF9500]/40 transition-shadow disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {saving && (
                  <motion.span
                    className="w-4 h-4 border-2 border-[#2d1600]/30 border-t-[#2d1600] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                )}
                {saving ? "Saving..." : "Save Connection"}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Connections List */}
      {connections.length === 0 ? (
        <motion.div
          {...fadeUp(0.16)}
          className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#FF9500]/10 border border-[#FF9500]/20 mb-6"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF9500"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </motion.div>
          <p className="text-sm font-semibold text-[#E5E1E4]/50">
            No platform connections yet
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mt-1.5 mb-6 max-w-sm mx-auto">
            Connect your X/Twitter, Meta, or LinkedIn accounts to start
            distributing content across platforms.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="inline-flex px-6 py-3 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold shadow-lg shadow-[#FF9500]/20 hover:shadow-[#FF9500]/40 transition-shadow"
          >
            Connect Your First Platform
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn, idx) => {
            const platformCfg = getPlatformConfig(conn.platform);
            const isTesting = testingId === conn.id;
            const result = testResult[conn.id];

            return (
              <motion.div
                key={conn.id}
                {...fadeUp(0.16 + idx * 0.06)}
                whileHover={{ borderColor: "rgba(255,149,0,0.25)" }}
                className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 md:p-6 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Platform icon */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${platformCfg.color}15`,
                      color: platformCfg.color,
                    }}
                  >
                    {platformCfg.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#E5E1E4]">
                        {platformCfg.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusColor(
                          conn.status
                        )} ${
                          conn.status === "active"
                            ? "border-[#4ade80]/20"
                            : conn.status === "expired"
                            ? "border-[#ffbd7f]/20"
                            : "border-[#ffb4ab]/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusDotColor(
                            conn.status
                          )}`}
                        />
                        {conn.status.charAt(0).toUpperCase() +
                          conn.status.slice(1)}
                      </span>
                    </div>
                    {conn.platform_account_name && (
                      <p className="text-sm text-[#E5E1E4]/50 mt-0.5">
                        {conn.platform_account_name}
                      </p>
                    )}
                    <p className="text-xs text-[#E5E1E4]/30 mt-0.5 font-mono">
                      Connected{" "}
                      {new Date(conn.created_at).toLocaleDateString()}
                    </p>

                    {/* Test result feedback */}
                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2"
                        >
                          {result.valid ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/20">
                              <motion.svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#4ade80"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.4 }}
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </motion.svg>
                              <span className="text-xs font-medium text-[#4ade80]">
                                Connection verified
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/20">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffb4ab"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              <span className="text-xs font-medium text-[#ffb4ab]">
                                Test failed: {result.error}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleTest(conn.id)}
                      disabled={isTesting}
                      className="text-sm px-4 py-2 rounded-xl font-medium border border-[#554334]/30 bg-[#1b1b1d]/60 text-[#E5E1E4]/70 hover:bg-[#1b1b1d]/80 hover:text-[#E5E1E4] disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {isTesting ? (
                        <>
                          <motion.span
                            className="w-3.5 h-3.5 border-2 border-[#E5E1E4]/20 border-t-[#FF9500] rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          Testing...
                        </>
                      ) : (
                        "Test"
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleDelete(conn.id)}
                      className="text-sm px-4 py-2 rounded-xl font-medium text-[#ffb4ab] border border-[#ffb4ab]/20 hover:bg-[#ffb4ab]/10 transition-colors"
                    >
                      Disconnect
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── AI Model Settings ── */}
      <ModelSettings />
    </motion.div>
  );
}

/** AI Model selector */
function ModelSettings() {
  const [models, setModels] = useState<{
    default_model: string;
    premium_model: string;
    available_models: { id: string; name: string; tier: string; desc: string }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/models", {
      headers: { Authorization: `Bearer ${localStorage.getItem("adhub_token") || ""}` },
    })
      .then((r) => r.json())
      .then(setModels)
      .catch(() => {});
  }, []);

  async function updateModel(field: "default_model" | "premium_model", value: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/models", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adhub_token") || ""}`,
        },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      setModels((prev) => prev ? { ...prev, ...data } : prev);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  if (!models) return null;

  const tierColors: Record<string, string> = {
    premium: "text-[#a78bfa]",
    standard: "text-[#FF9500]",
    fast: "text-[#4ade80]",
  };

  return (
    <motion.div
      {...fadeUp(0.4)}
      className="mt-10 glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50 mb-1">
        AI Model Configuration
      </h3>
      <p className="text-[10px] text-[#E5E1E4]/30 mb-5">
        Default model runs bulk pipeline tasks. Premium model runs idea sharpening, social copy, and targeted Telegram generation.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default Model */}
        <div>
          <label className="block text-xs font-medium text-[#E5E1E4]/60 mb-2">
            Default Model <span className="text-[#E5E1E4]/30">(pipeline, newsletters, bulk)</span>
          </label>
          <div className="space-y-1.5">
            {models.available_models.map((m) => (
              <button
                key={m.id}
                onClick={() => updateModel("default_model", m.id)}
                disabled={saving}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  models.default_model === m.id
                    ? "bg-[#FF9500]/10 border border-[#FF9500]/30"
                    : "border border-transparent hover:bg-[#1b1b1d]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${models.default_model === m.id ? "text-[#FF9500]" : "text-[#E5E1E4]/60"}`}>
                    {m.name}
                  </p>
                  <p className="text-[10px] text-[#E5E1E4]/30">{m.desc}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${tierColors[m.tier] || "text-[#E5E1E4]/40"}`}>
                  {m.tier}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Premium Model */}
        <div>
          <label className="block text-xs font-medium text-[#E5E1E4]/60 mb-2">
            Premium Model <span className="text-[#E5E1E4]/30">(social posts, threads, sharpening)</span>
          </label>
          <div className="space-y-1.5">
            {models.available_models.map((m) => (
              <button
                key={m.id}
                onClick={() => updateModel("premium_model", m.id)}
                disabled={saving}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  models.premium_model === m.id
                    ? "bg-[#a78bfa]/10 border border-[#a78bfa]/30"
                    : "border border-transparent hover:bg-[#1b1b1d]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${models.premium_model === m.id ? "text-[#a78bfa]" : "text-[#E5E1E4]/60"}`}>
                    {m.name}
                  </p>
                  <p className="text-[10px] text-[#E5E1E4]/30">{m.desc}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${tierColors[m.tier] || "text-[#E5E1E4]/40"}`}>
                  {m.tier}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Animated stat card */
function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      {...fadeUp(delay)}
      className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-[#E5E1E4] tracking-tight">
        {value}
      </p>
      <div className="mt-3 h-1 rounded-full bg-[#353437] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: value > 0 ? "100%" : "0%" }}
          transition={{
            duration: 0.8,
            delay: delay + 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>
    </motion.div>
  );
}
