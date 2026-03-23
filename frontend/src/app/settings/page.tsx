"use client";

import { useEffect, useState } from "react";
import { api, PlatformConnection, Product } from "@/lib/api";

const PLATFORMS = [
  { value: "twitter", label: "X / Twitter" },
  { value: "meta", label: "Meta / Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

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
  const [testResult, setTestResult] = useState<Record<string, { valid: boolean; error?: string }>>({});

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

  if (loading) {
    return <div className="text-[#E5E1E4]/50">Loading settings...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E1E4]">Settings</h1>
          <p className="text-[#E5E1E4]/50 mt-1">Manage platform connections</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#FF9500] text-[#2d1600] px-4 py-2 rounded-lg hover:opacity-90 text-sm font-medium"
        >
          {showForm ? "Cancel" : "Connect Platform"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#201f21] rounded-lg border border-white/10 p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm"
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
              <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
              Access Token
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
              placeholder="Paste your API access token"
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                Account Name (optional)
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. @myhandle"
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#dbc2ad] mb-1">
                Account/Page ID (optional)
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Platform account ID"
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#FF9500] text-[#2d1600] px-4 py-2 rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Connection"}
            </button>
          </div>
        </form>
      )}

      {connections.length === 0 ? (
        <div className="bg-[#201f21] rounded-lg border border-white/10 p-12 text-center">
          <p className="text-[#E5E1E4]/50">No platform connections yet.</p>
          <p className="text-sm text-[#E5E1E4]/40 mt-1">
            Connect your X/Twitter or Meta accounts to start distributing content.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-[#201f21] rounded-lg border border-white/10 p-5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#E5E1E4] capitalize">
                    {conn.platform}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(conn.status)}`}
                  >
                    {conn.status}
                  </span>
                </div>
                {conn.platform_account_name && (
                  <p className="text-sm text-[#E5E1E4]/50 mt-1">
                    {conn.platform_account_name}
                  </p>
                )}
                <p className="text-xs text-[#E5E1E4]/40 mt-1">
                  Connected {new Date(conn.created_at).toLocaleDateString()}
                </p>
                {testResult[conn.id] && (
                  <p
                    className={`text-xs mt-1 ${
                      testResult[conn.id].valid
                        ? "text-[#4ade80]"
                        : "text-[#ffb4ab]"
                    }`}
                  >
                    {testResult[conn.id].valid
                      ? "Connection verified"
                      : `Test failed: ${testResult[conn.id].error}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(conn.id)}
                  disabled={testingId === conn.id}
                  className="text-sm px-3 py-1.5 border border-white/10 rounded-lg hover:bg-[#201f21]/5 disabled:opacity-50"
                >
                  {testingId === conn.id ? "Testing..." : "Test"}
                </button>
                <button
                  onClick={() => handleDelete(conn.id)}
                  className="text-sm px-3 py-1.5 text-[#ffb4ab] border border-[#ffb4ab]/20 rounded-lg hover:bg-[#ffb4ab]/10"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
