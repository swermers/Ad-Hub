const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  updateProduct: (id: string, data: Partial<ProductCreate>) =>
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

export interface WinnerAnalysis {
  winning_patterns: string[];
  losing_patterns: string[];
  recommended_angles: string[];
  recommended_templates: string[];
  summary: string;
}
