export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adhub_token");
}

export function setToken(token: string) {
  localStorage.setItem("adhub_token", token);
}

export function clearToken() {
  localStorage.removeItem("adhub_token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined" && !path.includes("/auth/")) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Products
export const api = {
  // Products
  listProducts: async (): Promise<Product[]> => {
    const res = await request<Paginated<Product>>("/api/products");
    return res.items;
  },
  getProduct: (id: string) => request<Product>(`/api/products/${id}`),
  createProduct: (data: ProductCreate) =>
    request<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, data: Partial<ProductCreate> & { brand_colors?: string }) =>
    request<Product>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: string) =>
    request<void>(`/api/products/${id}`, { method: "DELETE" }),

  // Ingestion
  startCrawl: (productId: string, maxPages: number = 20) =>
    request<CrawlStatus>(`/api/products/${productId}/crawl`, {
      method: "POST",
      body: JSON.stringify({ max_pages: maxPages }),
    }),
  getCrawlStatus: (productId: string, taskId: string) =>
    request<CrawlStatus>(`/api/products/${productId}/crawl-status/${taskId}`),
  listCrawledPages: (productId: string) =>
    request<CrawledPage[]>(`/api/products/${productId}/pages`),
  generateBrief: (productId: string) =>
    request<{ product_id: string; brand_brief: string | null }>(
      `/api/products/${productId}/generate-brief`,
      { method: "POST" }
    ),

  // Generation
  generateContent: (productId: string, data: GenerateRequest) =>
    request<GenerateStatus>(`/api/products/${productId}/generate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getGenerateStatus: (productId: string, taskId: string) =>
    request<GenerateStatus>(
      `/api/products/${productId}/generate-status/${taskId}`
    ),

  // Content
  listContent: (params?: ContentFilter) => {
    const searchParams = new URLSearchParams();
    if (params?.product_id) searchParams.set("product_id", params.product_id);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.content_type)
      searchParams.set("content_type", params.content_type);
    const qs = searchParams.toString();
    return request<Paginated<ContentPiece>>(`/api/content${qs ? `?${qs}` : ""}`).then(
      (res) => res.items
    );
  },
  getContent: (id: string) => request<ContentPiece>(`/api/content/${id}`),
  updateContent: (id: string, data: Partial<ContentPiece>) =>
    request<ContentPiece>(`/api/content/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateContentStatus: (id: string, status: string) =>
    request<ContentPiece>(`/api/content/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  deleteContent: (id: string) =>
    request<void>(`/api/content/${id}`, { method: "DELETE" }),

  // Connections
  listConnections: (productId?: string) => {
    const qs = productId ? `?product_id=${productId}` : "";
    return request<PlatformConnection[]>(`/api/connections${qs}`);
  },
  createConnection: (data: ConnectionCreate) =>
    request<PlatformConnection>("/api/connections", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteConnection: (id: string) =>
    request<void>(`/api/connections/${id}`, { method: "DELETE" }),
  testConnection: (id: string) =>
    request<ConnectionTestResult>(`/api/connections/${id}/test`, {
      method: "POST",
    }),

  // Schedule
  listScheduledPosts: (params?: ScheduleFilter) => {
    const searchParams = new URLSearchParams();
    if (params?.product_id) searchParams.set("product_id", params.product_id);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.platform) searchParams.set("platform", params.platform);
    const qs = searchParams.toString();
    return request<Paginated<ScheduledPost>>(`/api/schedule${qs ? `?${qs}` : ""}`);
  },
  createScheduledPost: (data: ScheduleCreate) =>
    request<ScheduledPost>("/api/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  cancelScheduledPost: (id: string) =>
    request<void>(`/api/schedule/${id}`, { method: "DELETE" }),
  postNow: (id: string) =>
    request<ScheduledPost>(`/api/schedule/${id}/post-now`, { method: "POST" }),

  // Seed Bank
  listSeeds: (productId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (productId) params.set("product_id", productId);
    if (status) params.set("status", status);
    const qs = params.toString();
    return request<SeedItem[]>(`/api/seeds${qs ? `?${qs}` : ""}`);
  },
  createSeed: (data: SeedCreateRequest) =>
    request<SeedItem>("/api/seeds", { method: "POST", body: JSON.stringify(data) }),
  updateSeed: (id: string, data: Partial<SeedUpdateRequest>) =>
    request<SeedItem>(`/api/seeds/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSeed: (id: string) =>
    request<{ deleted: boolean }>(`/api/seeds/${id}`, { method: "DELETE" }),

  // Analytics
  getOverview: (productId?: string, days: number = 30) => {
    const searchParams = new URLSearchParams();
    if (productId) searchParams.set("product_id", productId);
    searchParams.set("days", String(days));
    const qs = searchParams.toString();
    return request<AnalyticsOverview>(`/api/analytics/overview?${qs}`);
  },
  getTopPerformers: (productId?: string, metric: string = "impressions", limit: number = 10) => {
    const searchParams = new URLSearchParams();
    if (productId) searchParams.set("product_id", productId);
    searchParams.set("metric", metric);
    searchParams.set("limit", String(limit));
    const qs = searchParams.toString();
    return request<TopPerformer[]>(`/api/analytics/top-performers?${qs}`);
  },
  getContentMetrics: (contentId: string) =>
    request<ContentMetrics>(`/api/analytics/content/${contentId}`),
  getInsights: (productId: string) =>
    request<Insights>(`/api/analytics/insights?product_id=${productId}`),
  triggerCollect: () =>
    request<{ collected: number }>("/api/analytics/collect", { method: "POST" }),
  getCommandCenter: (includeAi: boolean = false) =>
    request<CommandCenter>(`/api/analytics/command-center?include_ai=${includeAi}`),

  // Screenshots
  uploadScreenshot: async (productId: string, file: File): Promise<{ path: string; screenshots: string[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/products/${productId}/screenshots`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  deleteScreenshot: (productId: string, path: string) =>
    request<{ screenshots: string[] }>(`/api/products/${productId}/screenshots?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }),

  // Reference Images
  uploadReferenceImage: async (productId: string, file: File): Promise<{ path: string; reference_images: string[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/products/${productId}/reference-images`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  deleteReferenceImage: (productId: string, path: string) =>
    request<{ reference_images: string[] }>(`/api/products/${productId}/reference-images?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }),

  // Image Generation
  generateImage: (productId: string, data: GenerateImageRequest) =>
    request<GenerateImageStatus>(`/api/products/${productId}/generate-image`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getImageGenStatus: (productId: string, taskId: string) =>
    request<GenerateImageStatus>(`/api/products/${productId}/generate-image-status/${taskId}`),

  // Ad Templates
  listTemplates: (productId?: string) => {
    const qs = productId ? `?product_id=${productId}` : "";
    return request<AdTemplate[]>(`/api/templates${qs}`);
  },
  createTemplate: (data: AdTemplateCreate) =>
    request<AdTemplate>("/api/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteTemplate: (id: string) =>
    request<void>(`/api/templates/${id}`, { method: "DELETE" }),

  // Pain Points
  listPainPoints: (productId: string, category?: string) => {
    const qs = category ? `?category=${category}` : "";
    return request<PainPointItem[]>(`/api/products/${productId}/pain-points${qs}`);
  },
  createPainPoint: (productId: string, data: PainPointCreate) =>
    request<PainPointItem>(`/api/products/${productId}/pain-points`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deletePainPoint: (productId: string, pointId: string) =>
    request<void>(`/api/products/${productId}/pain-points/${pointId}`, { method: "DELETE" }),
  researchPainPoints: (productId: string, count: number = 20) =>
    request<ResearchStatus>(`/api/products/${productId}/research-pain-points?count=${count}`, {
      method: "POST",
    }),
  getResearchStatus: (productId: string, taskId: string) =>
    request<ResearchStatus>(`/api/products/${productId}/research-pain-points-status/${taskId}`),

  // Bulk Generation
  bulkGenerate: (productId: string, data: BulkGenerateRequest) =>
    request<BulkGenerateStatus>(`/api/products/${productId}/bulk-generate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getBulkGenerateStatus: (productId: string, taskId: string) =>
    request<BulkGenerateStatus>(`/api/products/${productId}/bulk-generate-status/${taskId}`),
  listVariations: (productId: string, batchId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (batchId) params.set("batch_id", batchId);
    if (status) params.set("status", status);
    const qs = params.toString();
    return request<AdVariation[]>(`/api/products/${productId}/ad-variations${qs ? `?${qs}` : ""}`);
  },
  updateVariation: (id: string, data: Partial<{ headline: string; body: string; cta: string }>) =>
    request<AdVariation>(`/api/products/ad-variations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  bulkUpdateVariationStatus: (variationIds: string[], status: string) =>
    request<{ updated: number }>("/api/products/ad-variations/bulk-status", {
      method: "PUT",
      body: JSON.stringify({ variation_ids: variationIds, status }),
    }),
  deleteVariation: (id: string) =>
    request<void>(`/api/products/ad-variations/${id}`, { method: "DELETE" }),

  // Bulk Upload
  bulkUpload: (productId: string, data: BulkUploadRequest) =>
    request<BulkUploadStatus>(`/api/products/${productId}/bulk-upload`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getBulkUploadStatus: (productId: string, taskId: string) =>
    request<BulkUploadStatus>(`/api/products/${productId}/bulk-upload-status/${taskId}`),

  // Optimizer
  getOptimizationConfig: (productId: string) =>
    request<OptimizationConfigData>(`/api/products/${productId}/optimization-config`),
  updateOptimizationConfig: (productId: string, data: Partial<OptimizationConfigData>) =>
    request<OptimizationConfigData>(`/api/products/${productId}/optimization-config`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  runOptimization: (productId: string) =>
    request<RunOptimizationStatus>(`/api/products/${productId}/run-optimization`, {
      method: "POST",
    }),
  getOptimizationStatus: (productId: string, taskId: string) =>
    request<RunOptimizationStatus>(`/api/products/${productId}/run-optimization-status/${taskId}`),
  getOptimizationLog: (productId: string, limit: number = 50) =>
    request<OptimizationLogItem[]>(`/api/products/${productId}/optimization-log?limit=${limit}`),
  getWinnerAnalysis: (productId: string) =>
    request<WinnerAnalysis>(`/api/products/${productId}/winner-analysis`),
  triggerAutoIterate: (productId: string) =>
    request<{ task_id: string; status: string }>(`/api/products/${productId}/auto-iterate`, {
      method: "POST",
    }),
  getAutoIterateStatus: (productId: string, taskId: string) =>
    request<{ task_id: string; status: string; actions_taken: number; error: string | null; result?: Record<string, unknown> }>(
      `/api/products/${productId}/auto-iterate-status/${taskId}`
    ),
  resetIterations: (productId: string) =>
    request<{ iterations_run: number; max_iterations: number }>(`/api/products/${productId}/reset-iterations`, {
      method: "POST",
    }),

  // Auth
  login: (password: string) =>
    request<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  checkAuth: () => request<{ ok: boolean }>("/api/auth/me"),

  // ─── Agent API ─────────────────────────────────────────────────────────────

  // Audio Transcription (Whisper)
  transcribeAudio: async (file: File): Promise<TranscribeResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/agent/transcribe`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || "Transcription failed");
    }
    return res.json();
  },

  // System Status
  getAgentStatus: () => request<AgentSystemStatus>("/api/agent/status"),

  // Content from Transcript (Voice Memo Pipeline)
  contentFromTranscript: (data: TranscriptRequest) =>
    request<TranscriptTaskStatus>("/api/agent/content-from-transcript", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getTranscriptStatus: (taskId: string) =>
    request<TranscriptTaskStatus>(`/api/agent/content-from-transcript-status/${taskId}`),

  // Creative Bundle (One-Shot Ad Package)
  generateCreativeBundle: (data: CreativeBundleRequest) =>
    request<CreativeBundleStatus>("/api/agent/creative-bundle", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCreativeBundleStatus: (taskId: string) =>
    request<CreativeBundleStatus>(`/api/agent/creative-bundle-status/${taskId}`),

  // Campaigns
  listCampaigns: (productId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (productId) params.set("product_id", productId);
    if (status) params.set("status", status);
    const qs = params.toString();
    return request<CampaignItem[]>(`/api/agent/campaigns${qs ? `?${qs}` : ""}`);
  },
  createCampaign: (data: CampaignCreateRequest) =>
    request<CampaignCreateResponse>("/api/agent/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCampaign: (id: string, data: Partial<CampaignItem>) =>
    request<{ id: string; status: string; updated: boolean }>(`/api/agent/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Performance Ingestion
  reportPerformance: (data: PerformanceReportRequest) =>
    request<{ recorded: boolean; guardrails_triggered: GuardrailTrigger[] }>("/api/agent/report-performance", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Safety Guardrails
  listGuardrails: (productId?: string) => {
    const qs = productId ? `?product_id=${productId}` : "";
    return request<GuardrailItem[]>(`/api/agent/guardrails${qs}`);
  },
  createGuardrail: (data: GuardrailCreateRequest) =>
    request<{ id: string; rule_type: string; enabled: boolean }>("/api/agent/guardrails", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateGuardrail: (id: string, data: Partial<GuardrailCreateRequest>) =>
    request<{ id: string; updated: boolean }>(`/api/agent/guardrails/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteGuardrail: (id: string) =>
    request<{ deleted: boolean }>(`/api/agent/guardrails/${id}`, { method: "DELETE" }),

  // Kill Switch
  activateKillSwitch: () =>
    request<{ paused: number; message: string }>("/api/agent/kill-switch", { method: "POST" }),

  // Approvals
  getPendingApprovals: () => request<AgentLogItem[]>("/api/agent/pending-approvals"),
  approveAction: (logId: string, approved: boolean) =>
    request<{ id: string; approved: boolean; message: string }>(`/api/agent/approve/${logId}`, {
      method: "POST",
      body: JSON.stringify({ approved }),
    }),

  // Activity Log
  getActivityLog: (limit: number = 50, actionType?: string) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (actionType) params.set("action_type", actionType);
    return request<AgentLogItem[]>(`/api/agent/activity-log?${params.toString()}`);
  },

  searchBroll: (query: string, mediaType: "photos" | "videos" = "photos", perPage = 10, orientation = "landscape") => {
    const params = new URLSearchParams({
      query,
      media_type: mediaType,
      per_page: String(perPage),
      orientation,
    });
    return request<BrollSearchResult>(`/api/agent/broll/search?${params.toString()}`);
  },

  // Brand Profile
  getBrandProfile: (productId: string) =>
    request<BrandProfileData>(`/api/products/${productId}/brand-profile`),
  updateBrandProfile: (productId: string, data: BrandProfileUpdate) =>
    request<BrandProfileData>(`/api/products/${productId}/brand-profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  uploadLogo: async (productId: string, file: File): Promise<{ path: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/products/${productId}/brand-profile/logo`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  extractBrandGuide: async (productId: string, file: File): Promise<BrandGuideExtractResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/products/${productId}/brand-profile/extract-guide`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },
  listRejectionFeedback: (productId: string, limit: number = 50) =>
    request<RejectionFeedbackItem[]>(`/api/products/${productId}/rejection-feedback?limit=${limit}`),
  createRejectionFeedback: (productId: string, data: RejectionFeedbackCreate) =>
    request<RejectionFeedbackItem>(`/api/products/${productId}/rejection-feedback`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Intelligence — Tier 5
  getIntelligenceDashboard: (productId: string) =>
    request<IntelligenceDashboard>(`/api/products/${productId}/intelligence/dashboard`),
  getIntelligenceConfig: (productId: string) =>
    request<IntelligenceConfigData>(`/api/products/${productId}/intelligence/config`),
  updateIntelligenceConfig: (productId: string, data: Partial<IntelligenceConfigUpdate>) =>
    request<{ status: string }>(`/api/products/${productId}/intelligence/config`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Competitors
  listCompetitors: (productId: string) =>
    request<CompetitorData[]>(`/api/products/${productId}/intelligence/competitors`),
  createCompetitor: (productId: string, data: CompetitorCreate) =>
    request<CompetitorData>(`/api/products/${productId}/intelligence/competitors`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCompetitor: (productId: string, competitorId: string, data: Partial<CompetitorCreate>) =>
    request<{ status: string }>(`/api/products/${productId}/intelligence/competitors/${competitorId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteCompetitor: (productId: string, competitorId: string) =>
    request<{ status: string }>(`/api/products/${productId}/intelligence/competitors/${competitorId}`, {
      method: "DELETE",
    }),
  scanCompetitors: (productId: string) =>
    request<{ task_id: string }>(`/api/products/${productId}/intelligence/competitors/scan`, { method: "POST" }),
  compareCompetitors: (productId: string) =>
    request<{ task_id: string }>(`/api/products/${productId}/intelligence/competitors/compare`, { method: "POST" }),

  // Trends
  listTrends: (productId: string, params?: { category?: string; momentum?: string; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.category) search.set("category", params.category);
    if (params?.momentum) search.set("momentum", params.momentum);
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return request<TrendSignalData[]>(`/api/products/${productId}/intelligence/trends${qs ? `?${qs}` : ""}`);
  },
  scanTrends: (productId: string) =>
    request<{ task_id: string }>(`/api/products/${productId}/intelligence/trends/scan`, { method: "POST" }),
  getTrendSummary: (productId: string) =>
    request<TrendSummary>(`/api/products/${productId}/intelligence/trends/summary`),
  updateTrendStatus: (productId: string, trendId: string, status: string) =>
    request<{ status: string }>(`/api/products/${productId}/intelligence/trends/${trendId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // Hooks
  listHookPatterns: (productId: string, patternType?: string) => {
    const qs = patternType ? `?pattern_type=${patternType}` : "";
    return request<HookPatternData[]>(`/api/products/${productId}/intelligence/hooks${qs}`);
  },
  analyzeHooks: (productId: string, platform?: string) => {
    const qs = platform ? `?platform=${platform}` : "";
    return request<{ task_id: string }>(`/api/products/${productId}/intelligence/hooks/analyze${qs}`, { method: "POST" });
  },
  suggestHooks: (productId: string, topic: string) =>
    request<{ hooks: HookSuggestion[] }>(`/api/products/${productId}/intelligence/hooks/suggest`, {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),

  // Evidence
  listEvidence: (productId: string, evidenceType?: string) => {
    const qs = evidenceType ? `?evidence_type=${evidenceType}` : "";
    return request<EvidenceItemData[]>(`/api/products/${productId}/intelligence/evidence${qs}`);
  },
  gatherEvidence: (productId: string) =>
    request<{ task_id: string }>(`/api/products/${productId}/intelligence/evidence/gather`, { method: "POST" }),
  getEvidenceSummary: (productId: string) =>
    request<EvidenceSummary>(`/api/products/${productId}/intelligence/evidence/summary`),
  searchEvidence: (productId: string, claim: string) =>
    request<{ results: EvidenceItemData[] }>(`/api/products/${productId}/intelligence/evidence/search`, {
      method: "POST",
      body: JSON.stringify({ claim }),
    }),
  verifyEvidence: (productId: string, evidenceId: string, verified: boolean) =>
    request<{ status: string }>(`/api/products/${productId}/intelligence/evidence/${evidenceId}/verify`, {
      method: "PUT",
      body: JSON.stringify({ verified }),
    }),

  // Briefs
  listBriefs: (productId: string) =>
    request<IntelligenceBriefSummary[]>(`/api/products/${productId}/intelligence/briefs`),
  getBrief: (productId: string, briefId: string) =>
    request<IntelligenceBriefData>(`/api/products/${productId}/intelligence/briefs/${briefId}`),
  generateIntelligenceBrief: (productId: string) =>
    request<{ task_id: string }>(`/api/products/${productId}/intelligence/briefs/generate`, { method: "POST" }),

  // Full cycle
  runIntelligenceCycle: (productId: string) =>
    request<{ task_id: string }>(`/api/products/${productId}/intelligence/run-cycle`, { method: "POST" }),
  getIntelligenceTaskStatus: (productId: string, taskId: string) =>
    request<{ status: string; result?: unknown; error?: string }>(`/api/products/${productId}/intelligence/task/${taskId}`),

  // ─── Voice Profiles ─────────────────────────────────────────────────────────

  listVoiceProfiles: () =>
    request<VoiceProfileItem[]>("/api/voice-profiles/"),
  getVoiceProfile: (id: string) =>
    request<VoiceProfileItem>(`/api/voice-profiles/${id}`),
  createVoiceProfile: (data: VoiceProfileCreate) =>
    request<VoiceProfileItem>("/api/voice-profiles/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateVoiceProfile: (id: string, data: Partial<VoiceProfileCreate>) =>
    request<VoiceProfileItem>(`/api/voice-profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteVoiceProfile: (id: string) =>
    request<{ deleted: boolean }>(`/api/voice-profiles/${id}`, { method: "DELETE" }),
  importMarkdownVoiceProfile: async (file: File): Promise<VoiceProfileItem> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/voice-profiles/import-markdown-and-create`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) throw new Error("Import failed");
    return res.json();
  },

  parseVoiceMarkdown: async (file: File): Promise<VoiceProfileParsed> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/voice-profiles/import-markdown`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || "Failed to parse markdown");
    }
    return res.json();
  },

  importVoiceMarkdown: async (file: File): Promise<VoiceProfileItem> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/voice-profiles/import-markdown-and-create`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || "Failed to import markdown");
    }
    return res.json();
  },

  // ─── Content Pipeline (Stepped) ─────────────────────────────────────────────

  pipelineSharpen: (data: PipelineSharpenRequest) =>
    request<PipelineSharpenResult>("/api/pipeline/sharpen", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  pipelineDraft: (data: PipelineDraftRequest) =>
    request<PipelineDraftResult>("/api/pipeline/draft", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  pipelineExpand: (data: PipelineExpandRequest) =>
    request<PipelineExpandResult>("/api/pipeline/expand", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  pipelineFinalize: (data: PipelineFinalizeRequest) =>
    request<PipelineFinalizeResult>("/api/pipeline/finalize", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  pipelineQuickExpand: (data: PipelineQuickExpandRequest) =>
    request<PipelineExpandResult>("/api/pipeline/quick-expand", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  pipelineRefine: (data: PipelineRefineRequest) =>
    request<PipelineRefineResult>("/api/pipeline/refine", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ─── Workflows ─────────────────────────────────────────────────────────

  listWorkflowTypes: () =>
    request<WorkflowTypeInfo[]>("/api/workflows/types"),

  getWorkflowTypeInfo: (workflowType: string) =>
    request<WorkflowTypeInfo>(`/api/workflows/types/${workflowType}`),

  listProductWorkflows: (productId: string) =>
    request<WorkflowConfig[]>(`/api/workflows/${productId}`),

  getProductWorkflow: (productId: string, workflowType: string) =>
    request<WorkflowConfig | null>(`/api/workflows/${productId}/${workflowType}`),

  updateProductWorkflow: (productId: string, workflowType: string, data: { step_prompts?: Record<string, string>; quality_gate_rules?: Record<string, string>; is_active?: boolean }) =>
    request<WorkflowConfig>(`/api/workflows/${productId}/${workflowType}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  resetProductWorkflow: (productId: string, workflowType: string) =>
    request<{ reset: boolean }>(`/api/workflows/${productId}/${workflowType}`, {
      method: "DELETE",
    }),

  getWorkflowHistory: (productId: string, workflowType: string) =>
    request<WorkflowConfig[]>(`/api/workflows/${productId}/${workflowType}/history`),

  // ─── Video Render ──────────────────────────────────────────────────────

  renderVideo: (data: VideoRenderRequest) =>
    request<VideoRenderStatus>("/api/video/render", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  renderFromContent: (contentId: string, data?: VideoRenderFromContentRequest) =>
    request<VideoRenderStatus>(`/api/video/render-content/${contentId}`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  getRenderStatus: (taskId: string) =>
    request<VideoRenderStatus>(`/api/video/render/${taskId}`),
};

// Types
export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface Product {
  id: string;
  name: string;
  website_url: string | null;
  description: string;
  target_audience: string;
  pain_points: string;
  differentiators: string;
  product_type: string;
  brand_voice: string | null;
  brand_brief: string | null;
  brand_colors: string | null;
  brand_fonts: string | null;
  screenshots: string | null;
  reference_images: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  website_url?: string;
  description?: string;
  target_audience?: string;
  pain_points?: string;
  differentiators?: string;
  product_type?: string;
}

export interface CrawlStatus {
  task_id: string;
  status: string;
  pages_crawled: number;
  error: string | null;
}

export interface CrawledPage {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
  page_type: string;
  crawled_at: string;
}

export interface GenerateRequest {
  content_types: string[];
  platforms: string[];
  count: number;
  funnel_stage: string;
  instructions?: string;
  template_type?: string;
  aspect_ratio?: string;
  industry_vertical?: string;
  creative_preset?: string;
  image_url?: string;
  industry_colors?: Record<string, string>;
  use_premium_model?: boolean;
}

export interface GenerateStatus {
  task_id: string;
  status: string;
  pieces_generated: number;
  error: string | null;
}

export interface ContentPiece {
  id: string;
  product_id: string;
  content_type: string;
  platform: string;
  title: string | null;
  body: string;
  hook: string | null;
  cta: string | null;
  funnel_stage: string;
  status: string;
  template_type: string | null;
  aspect_ratio: string | null;
  generation_metadata: string | null;
  image_url: string | null;
  media_type: string | null;
  video_style: string | null;
  video_config: string | null;
  created_at: string;
}

export interface ContentFilter {
  product_id?: string;
  status?: string;
  platform?: string;
  content_type?: string;
}

// Phase 2 types

export interface PlatformConnection {
  id: string;
  product_id: string;
  platform: string;
  platform_account_id: string | null;
  platform_account_name: string | null;
  status: string;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionCreate {
  product_id: string;
  platform: string;
  access_token: string;
  refresh_token?: string;
  platform_account_id?: string;
  platform_account_name?: string;
}

export interface ConnectionTestResult {
  valid: boolean;
  account_info: Record<string, unknown> | null;
  error: string | null;
}

export interface ScheduledPost {
  id: string;
  content_id: string;
  connection_id: string;
  scheduled_at: string;
  posted_at: string | null;
  platform_post_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
  content_title: string | null;
  content_body_preview: string | null;
  platform: string | null;
  platform_account_name: string | null;
}

export interface ScheduleCreate {
  content_id: string;
  connection_id: string;
  scheduled_at: string;
}

export interface ScheduleFilter {
  product_id?: string;
  status?: string;
  platform?: string;
}

export interface AnalyticsOverview {
  total_impressions: number;
  total_clicks: number;
  total_likes: number;
  total_shares: number;
  total_comments: number;
  total_spend: number;
  total_conversions: number;
  avg_ctr: number;
  posts_tracked: number;
  period_days: number;
}

export interface TopPerformer {
  content_id: string;
  title: string | null;
  body_preview: string | null;
  content_type: string | null;
  platform: string;
  total_impressions: number;
  total_clicks: number;
  total_likes: number;
  total_shares: number;
  avg_ctr: number;
}

export interface ContentMetrics {
  content_id: string;
  title: string | null;
  total_impressions: number;
  total_clicks: number;
  total_likes: number;
  total_shares: number;
  total_comments: number;
  total_conversions: number;
  avg_ctr: number;
  total_spend: number;
  platforms: string[];
}

export interface Insights {
  insights: string[];
  recommendations: string[];
  content_angles: string[];
}

// Command Center types

export interface CommandCenterProductSummary {
  id: string;
  name: string;
  product_type: string;
  total_variations: number;
  status_breakdown: Record<string, number>;
  active_ads: number;
  paused_ads: number;
  winners: number;
  total_spend: number;
  pain_points_count: number;
  top_winner: CommandCenterAdEntry | null;
  recent_actions: { action: string; reason: string; created_at: string }[];
}

export interface CommandCenterAdEntry {
  variation_id: string;
  headline: string;
  status: string;
  ctr: number;
  cpm: number;
  impressions: number;
  spend: number;
}

export interface CommandCenterAIRecommendations {
  executive_summary: string;
  immediate_actions: string[];
  budget_recommendations: string[];
  next_tests: string[];
}

export interface CommandCenter {
  summary: {
    total_products: number;
    total_active_ads: number;
    total_paused_ads: number;
    total_winners: number;
    total_spend: number;
    content_performance: AnalyticsOverview;
  };
  products: CommandCenterProductSummary[];
  top_winners: CommandCenterAdEntry[];
  worst_losers: CommandCenterAdEntry[];
  ai_recommendations?: CommandCenterAIRecommendations;
}

// Bulk Ad Generator types

export interface AdTemplate {
  id: string;
  product_id: string | null;
  name: string;
  template_type: string;
  layout_config: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface AdTemplateCreate {
  product_id?: string;
  name: string;
  template_type: string;
  layout_config?: Record<string, string>;
}

export interface PainPointItem {
  id: string;
  product_id: string;
  pain_point: string;
  desired_outcome: string;
  category: string;
  severity: number;
  target_segment: string | null;
  source: string;
  created_at: string;
}

export interface PainPointCreate {
  pain_point: string;
  desired_outcome?: string;
  category?: string;
  severity?: number;
  target_segment?: string;
}

export interface ResearchStatus {
  task_id: string;
  status: string;
  points_generated: number;
  error: string | null;
}

export interface BulkGenerateRequest {
  template_id: string;
  pain_point_ids: string[];
  variations_per_pain_point: number;
  funnel_stage?: string;
}

export interface BulkGenerateStatus {
  task_id: string;
  status: string;
  variations_generated: number;
  batch_id: string | null;
  error: string | null;
}

export interface AdVariation {
  id: string;
  product_id: string;
  batch_id: string;
  template_id: string | null;
  pain_point_id: string | null;
  headline: string;
  body: string;
  cta: string;
  template_type: string | null;
  template_config: Record<string, string>;
  pain_point_text: string | null;
  desired_outcome: string | null;
  status: string;
  image_url: string | null;
  meta_ad_id: string | null;
  performance_score: number | null;
  created_at: string;
}

export interface BulkUploadRequest {
  variation_ids: string[];
  ad_set_id: string;
  connection_id: string;
  destination_url: string;
  page_id: string;
}

export interface BulkUploadStatus {
  task_id: string;
  status: string;
  uploaded: number;
  failed: number;
  error: string | null;
}

export interface OptimizationConfigData {
  id: string;
  product_id: string;
  min_impressions: number;
  max_cpm: number;
  min_ctr: number;
  winner_ctr_threshold: number;
  winner_budget_multiplier: number;
  check_interval_hours: number;
  enabled: boolean;
  auto_iterate: boolean;
  max_iterations: number;
  iterations_run: number;
}

export interface RunOptimizationStatus {
  task_id: string;
  status: string;
  actions_taken: number;
  error: string | null;
}

export interface OptimizationLogItem {
  id: string;
  product_id: string;
  ad_variation_id: string | null;
  action: string;
  reason: string;
  metrics_snapshot: Record<string, number>;
  headline: string | null;
  created_at: string;
}

export interface GenerateImageRequest {
  content_id?: string;
  headline?: string;
  body?: string;
  cta?: string;
  aspect_ratio?: string;
  style_notes?: string;
  quality?: string;
}

export interface GenerateImageStatus {
  task_id: string;
  status: string;
  image_url: string | null;
  image_prompt: string | null;
  error: string | null;
}

export interface WinnerAnalysis {
  winning_patterns: string[];
  losing_patterns: string[];
  recommended_angles: string[];
  recommended_templates: string[];
  summary: string;
}

// ─── Agent API Types ─────────────────────────────────────────────────────────

export interface TranscribeResult {
  transcript: string;
  filename: string;
  duration_hint: string;
}

export interface AgentSystemStatus {
  status: string;
  products: { id: string; name: string; product_type: string }[];
  campaigns: {
    id: string;
    name: string;
    platform: string;
    status: string;
    daily_budget: number;
    total_spend: number;
  }[];
  pending_approvals: number;
  active_guardrails: number;
  recent_actions: AgentLogItem[];
}

export interface TranscriptRequest {
  transcript: string;
  product_id: string;
  weekly_mix?: {
    day: string;
    content_type: string;
    platform: string;
    purpose: string;
  }[];
  instructions?: string;
}

export interface TranscriptTaskStatus {
  task_id: string;
  status: string;
  pieces_generated: number;
  content_brief: { weekly_theme: string } | null;
  error: string | null;
}

export interface CreativeBundleRequest {
  product_id: string;
  pain_point_text: string;
  desired_outcome?: string;
  template_type?: string;
  platforms?: string[];
  funnel_stage?: string;
  generate_image?: boolean;
  aspect_ratio?: string;
}

export interface CreativeBundleStatus {
  task_id: string;
  status: string;
  pieces_generated: number;
  content_ids?: string[];
  image_url?: string | null;
  error: string | null;
}

export interface CampaignItem {
  id: string;
  product_id: string;
  platform: string;
  name: string;
  objective: string;
  status: string;
  daily_budget: number;
  lifetime_budget: number | null;
  total_spend: number;
  targeting_config: Record<string, unknown>;
  destination_url: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface CampaignCreateRequest {
  product_id: string;
  platform: string;
  name: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  targeting_config?: Record<string, unknown>;
  destination_url?: string;
  variation_ids?: string[];
}

export interface CampaignCreateResponse {
  id: string;
  name: string;
  status: string;
  daily_budget: number;
  approval_required: boolean;
  message: string;
}

export interface PerformanceReportRequest {
  campaign_id?: string;
  ad_variation_id?: string;
  platform: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
  ctr?: number;
  cpm?: number;
  roas?: number;
  collected_at?: string;
}

export interface GuardrailItem {
  id: string;
  product_id: string | null;
  rule_type: string;
  threshold_value: number;
  action: string;
  cooldown_hours: number;
  enabled: boolean;
  last_triggered_at: string | null;
}

export interface GuardrailCreateRequest {
  product_id?: string;
  rule_type: string;
  threshold_value: number;
  action?: string;
  cooldown_hours?: number;
  enabled?: boolean;
}

export interface GuardrailTrigger {
  rule: string;
  value?: number;
  spend?: number;
  roas?: number;
  threshold: number;
  action: string;
}

export interface AgentLogItem {
  id: string;
  agent_id?: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  approval_required?: boolean;
  approved?: boolean | null;
  approved_at?: string | null;
  created_at: string;
}

export interface BrollPhoto {
  id: number;
  url: string;
  src: { original: string; large: string; medium: string };
  alt: string;
  photographer: string;
}

export interface BrollVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  video_files: { link: string; width: number; height: number; quality: string }[];
  photographer: string;
}

export interface SeedItem {
  id: string;
  product_id: string;
  seed: string;
  heat: string[];
  audience_hook: string;
  template_fit: string;
  subject_line: string | null;
  metaphor: string | null;
  weekly_theme: string | null;
  verdict: string;
  raw_transcript: string | null;
  raw_ideas: string[];
  source: string;
  status: string;
  used_at: string | null;
  content_piece_id: string | null;
  notes: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface SeedCreateRequest {
  product_id: string;
  seed: string;
  heat?: string[];
  audience_hook?: string;
  template_fit?: string;
  subject_line?: string;
  metaphor?: string;
  weekly_theme?: string;
  verdict?: string;
  raw_transcript?: string;
  raw_ideas?: string[];
  source?: string;
  notes?: string;
  priority?: number;
}

export interface SeedUpdateRequest {
  seed?: string;
  audience_hook?: string;
  template_fit?: string;
  subject_line?: string;
  metaphor?: string;
  weekly_theme?: string;
  notes?: string;
  priority?: number;
  status?: string;
}

export interface BrollSearchResult {
  query: string;
  media_type: string;
  total_results: number;
  results: (BrollPhoto | BrollVideo)[];
}

// Brand Guide Extraction

export interface BrandGuideExtractResult {
  status: string;
  extracted_fields: number;
  summary: string;
  profile: BrandProfileData;
}

// Brand Profile types

export interface BrandProfileData {
  id: string;
  product_id: string;
  writing_samples: string | null;
  tone_descriptors: string | null;
  always_use_words: string | null;
  never_use_words: string | null;
  sentence_style: string | null;
  logo_url: string | null;
  logo_usage_rules: string | null;
  primary_colors: string | null;
  secondary_colors: string | null;
  accent_colors: string | null;
  approved_fonts: string | null;
  photography_style: string | null;
  approved_topics: string | null;
  off_limit_topics: string | null;
  claims_allowed: string | null;
  claims_need_review: string | null;
  hashtag_strategy: string | null;
  emoji_usage: string | null;
  approved_emojis: string | null;
  cta_style: string | null;
  regulatory_notes: string | null;
  linkedin_rules: string | null;
  instagram_rules: string | null;
  x_rules: string | null;
  meta_ads_rules: string | null;
  paused_topics: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface BrandProfileUpdate {
  writing_samples?: string[];
  tone_descriptors?: string[];
  always_use_words?: string[];
  never_use_words?: string[];
  sentence_style?: string;
  logo_url?: string;
  logo_usage_rules?: string;
  primary_colors?: string[];
  secondary_colors?: string[];
  accent_colors?: string[];
  approved_fonts?: string[];
  photography_style?: string;
  approved_topics?: string[];
  off_limit_topics?: string[];
  claims_allowed?: string[];
  claims_need_review?: string[];
  hashtag_strategy?: string;
  emoji_usage?: string;
  approved_emojis?: string[];
  cta_style?: string;
  regulatory_notes?: string;
  linkedin_rules?: string;
  instagram_rules?: string;
  x_rules?: string;
  meta_ads_rules?: string;
  paused_topics?: string[];
}

export interface RejectionFeedbackItem {
  id: string;
  product_id: string;
  content_id: string | null;
  reason: string;
  details: string | null;
  created_at: string;
}

export interface RejectionFeedbackCreate {
  content_id?: string;
  reason: string;
  details?: string;
}

// Intelligence — Tier 5

export interface IntelligenceDashboard {
  config: {
    competitor_monitoring_enabled: boolean;
    trend_detection_enabled: boolean;
    hook_analysis_enabled: boolean;
    evidence_gathering_enabled: boolean;
  };
  competitors: { active: number };
  trends: { this_week: number; rising: number };
  hooks: { total_patterns: number };
  evidence: { total: number; verified: number };
  latest_brief: {
    id: string | null;
    title: string | null;
    created_at: string | null;
    read: boolean;
  };
}

export interface IntelligenceConfigData {
  product_id: string;
  competitor_monitoring_enabled: boolean;
  trend_detection_enabled: boolean;
  hook_analysis_enabled: boolean;
  evidence_gathering_enabled: boolean;
  weekly_brief_enabled: boolean;
  competitor_scan_interval_hours: number;
  trend_scan_interval_hours: number;
  hook_analysis_interval_hours: number;
  evidence_refresh_interval_hours: number;
  niche_keywords: string[];
  subreddits: string[];
  x_accounts_to_watch: string[];
  industry_vertical: string | null;
  last_competitor_scan_at: string | null;
  last_trend_scan_at: string | null;
  last_hook_analysis_at: string | null;
  last_evidence_refresh_at: string | null;
  last_brief_generated_at: string | null;
}

export interface IntelligenceConfigUpdate {
  competitor_monitoring_enabled?: boolean;
  trend_detection_enabled?: boolean;
  hook_analysis_enabled?: boolean;
  evidence_gathering_enabled?: boolean;
  weekly_brief_enabled?: boolean;
  competitor_scan_interval_hours?: number;
  trend_scan_interval_hours?: number;
  hook_analysis_interval_hours?: number;
  evidence_refresh_interval_hours?: number;
  niche_keywords?: string[];
  subreddits?: string[];
  x_accounts_to_watch?: string[];
  industry_vertical?: string;
}

export interface CompetitorData {
  id: string;
  name: string;
  website_url: string | null;
  social_urls: Record<string, string> | null;
  meta_ad_library_url: string | null;
  description: string | null;
  last_crawled_at: string | null;
  ad_count: number;
  longest_running_ad: Record<string, string> | null;
  is_active: boolean;
  latest_snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface CompetitorCreate {
  name: string;
  website_url?: string;
  social_urls?: Record<string, string>;
  meta_ad_library_url?: string;
  description?: string;
}

export interface TrendSignalData {
  id: string;
  title: string;
  summary: string;
  source_type: string;
  source_snippet: string | null;
  category: string;
  relevance_score: number;
  momentum: string;
  volume: number;
  status: string;
  suggested_angle: string | null;
  detected_at: string;
}

export interface TrendSummary {
  total: number;
  rising: number;
  top_categories: Record<string, number>;
  top_trends: {
    id: string;
    title: string;
    category: string;
    momentum: string;
    relevance_score: number;
    suggested_angle: string | null;
  }[];
}

export interface HookPatternData {
  id: string;
  pattern_name: string;
  pattern_type: string;
  description: string;
  example: string;
  template: string | null;
  source_platform: string;
  engagement_score: number;
  times_used: number;
  avg_performance: number | null;
}

export interface HookSuggestion {
  hook: string;
  pattern_used: string;
  platform: string;
  why_it_works: string;
}

export interface EvidenceItemData {
  id: string;
  claim: string;
  evidence_text: string;
  evidence_type: string;
  source_name: string | null;
  source_url: string | null;
  credibility_score: number;
  freshness: string;
  times_used: number;
  verified: boolean;
  created_at: string;
}

export interface EvidenceSummary {
  total: number;
  by_type: Record<string, number>;
  verified: number;
  top_evidence: EvidenceItemData[];
}

export interface IntelligenceBriefSummary {
  id: string;
  title: string;
  period: string;
  summary: string;
  status: string;
  read_at: string | null;
  created_at: string;
}

export interface IntelligenceBriefData extends IntelligenceBriefSummary {
  whats_working: { insight: string; data_point: string; recommendation: string }[];
  competitor_moves: { competitor: string; action: string; implication: string }[];
  trend_alerts: { trend: string; relevance: string; suggested_action: string }[];
  evidence_found: { claim: string; evidence: string; source: string }[];
  creative_recommendations: { format: string; reason: string; expected_impact: string }[];
  next_actions: { action: string; priority: string; rationale: string }[];
}

// ─── Voice Profiles ───────────────────────────────────────────────────────────

export interface VoiceProfileItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tone_keywords: string[];
  style_rules: string | null;
  sentence_style: string | null;
  favorite_phrases: string[];
  words_to_avoid: string[];
  words_to_use: string[];
  writing_samples: string[];
  default_template: string | null;
  content_themes: string[];
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface VoiceProfileCreate {
  name: string;
  description?: string;
  tone_keywords?: string[];
  style_rules?: string;
  sentence_style?: string;
  favorite_phrases?: string[];
  words_to_avoid?: string[];
  words_to_use?: string[];
  writing_samples?: string[];
  default_template?: string;
  content_themes?: string[];
  is_default?: boolean;
}

export interface VoiceProfileParsed {
  name: string;
  description: string;
  tone_keywords: string[];
  style_rules: string;
  sentence_style: string;
  favorite_phrases: string[];
  words_to_avoid: string[];
  words_to_use: string[];
  writing_samples: string[];
  content_themes: string[];
}

// ─── Content Pipeline (Stepped) ───────────────────────────────────────────────

export interface PipelineSharpenRequest {
  product_id: string;
  raw_text: string;
  voice_profile_id?: string;
  workflow_type?: string;
}

export interface PipelineSharpenResult {
  seed: string;
  heat: string[];
  audience_hook: string;
  template_fit: string;
  subject_line: string;
  metaphor: string | null;
  weekly_theme: string;
  raw_ideas: string[];
  verdict: string;
}

export interface PipelineDraftRequest {
  product_id: string;
  seed: PipelineSharpenResult;
  voice_profile_id?: string;
  template_override?: string;
  workflow_type?: string;
}

export interface PipelineDraftResult {
  title: string;
  subject_line: string;
  preview_text: string;
  body: string;
  template_used: string;
}

export interface PipelineExpandRequest {
  product_id: string;
  seed: PipelineSharpenResult;
  draft: PipelineDraftResult;
  voice_profile_id?: string;
  platforms?: string[];
  include_video_script?: boolean;
  include_thread?: boolean;
  include_video_ad?: boolean;
  include_carousel?: boolean;
  include_email?: boolean;
  workflow_type?: string;
}

export interface PipelineExpandedPiece {
  content_type: string;
  platform: string;
  title: string;
  body: string;
  hook: string | null;
  cta: string | null;
  funnel_stage: string;
  metadata: Record<string, string>;
  video_style?: string | null;
  video_config?: { aspect_ratio?: string; accent_color?: string } | null;
}

export interface PipelineExpandResult {
  pieces: PipelineExpandedPiece[];
}

export interface PipelineFinalizeRequest {
  product_id: string;
  seed: PipelineSharpenResult;
  pieces: PipelineExpandedPiece[];
  save_seed?: boolean;
}

export interface PipelineFinalizeResult {
  content_ids: string[];
  seed_id: string | null;
  pieces_saved: number;
}

export interface PipelineQuickExpandRequest {
  product_id: string;
  seed: PipelineSharpenResult;
  voice_profile_id?: string;
  platforms?: string[];
  content_types?: string[];
  include_video_script?: boolean;
  include_thread?: boolean;
  include_video_ad?: boolean;
  include_carousel?: boolean;
  include_email?: boolean;
  workflow_type?: string;
}

// ─── Workflow Types ───────────────────────────────────────────────────────────

export interface WorkflowTypeInfo {
  workflow_type: string;
  steps: Record<string, string>;
  step_count: number;
  quality_gates: string[];
}

export interface WorkflowConfig {
  id: string;
  product_id: string | null;
  workflow_type: string;
  version: number;
  is_active: boolean;
  step_prompts: Record<string, string> | null;
  quality_gate_rules: Record<string, string> | null;
  total_pieces_generated: number;
  avg_engagement_rate: number | null;
  avg_impressions: number | null;
  avg_clicks: number | null;
  win_rate: number | null;
  parent_version: number | null;
  evolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineRefineRequest {
  content_id: string;
  instructions?: string;
  voice_profile_id?: string;
}

export interface PipelineRefineResult {
  title: string;
  body: string;
  hook: string | null;
  cta: string | null;
}

// ─── Video Render Types ──────────────────────────────────────────────────

export interface VideoRenderRequest {
  headline: string;
  body: string;
  cta: string;
  video_style?: string;
  aspect_ratio?: string;
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  screenshot_url?: string;
  slide_headlines?: string;
  codec?: "h264" | "vp8";
}

export interface VideoRenderFromContentRequest {
  video_style?: string;
  aspect_ratio?: string;
  codec?: "h264" | "vp8";
}

export interface VideoRenderStatus {
  task_id: string;
  status: "pending" | "rendering" | "completed" | "failed";
  progress?: number;
  video_url?: string;
  error?: string;
  duration_ms?: number;
}
