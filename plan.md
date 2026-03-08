# Bulk Ad Generator & Optimizer - Implementation Plan

## Overview
Build a complete ad growth flywheel: generate bulk ad variations cheaply using React templates + AI copy, test on Facebook, auto-optimize by killing losers and scaling winners, then iterate.

## Architecture

### New Database Models
1. **AdTemplate** - Reusable ad layout definitions (before/after, pain→solution, stat/proof)
2. **PainPoint** - Structured pain points per product (AI-researched or manual)
3. **AdVariation** - Generated ad variations with copy + template + status tracking
4. **OptimizationConfig** - Per-product optimization rules (CPM thresholds, CTR minimums)
5. **OptimizationLog** - Audit trail of optimizer decisions

### New Backend Routers
1. `templates.py` - CRUD for ad templates
2. `pain_points.py` - Pain point research + CRUD
3. `bulk_generator.py` - Bulk variation generation
4. `bulk_upload.py` - Bulk upload to Facebook as drafts
5. `optimizer.py` - Auto-optimization config + execution

### New Frontend Pages
1. `/bulk-generate` - Multi-step wizard (select product → template → pain points → generate → preview → export/upload)
2. `/optimizer` - Optimization config, run controls, decision log

---

## Feature A: Ad Template System

### Backend
- **New file**: `backend/app/models/ad_template.py`
  - `AdTemplate`: id, product_id (FK, nullable for global templates), name, template_type ("before_after", "pain_solution", "stat_proof"), layout_config (JSON - colors, fonts, logo URL, background), created_at, updated_at

- **New file**: `backend/app/routers/templates.py`
  - `POST /api/templates` - Create template
  - `GET /api/templates?product_id=` - List templates
  - `GET /api/templates/{id}` - Get template
  - `PUT /api/templates/{id}` - Update template
  - `DELETE /api/templates/{id}` - Delete template

### Frontend
- **New files**: `frontend/src/components/ad-templates/`
  - `BeforeAfterTemplate.tsx` - Split layout: pain state left, outcome right, CTA bottom
  - `PainSolutionTemplate.tsx` - Bold pain headline, solution subtext, CTA button
  - `StatProofTemplate.tsx` - Big number/stat, supporting context, CTA
  - `TemplateRenderer.tsx` - Maps template_type string to correct component

  All templates:
  - Use **inline styles** (not Tailwind) for pixel-precise html-to-image capture
  - Render at 1080x1080px
  - Accept props: headline, body, cta, backgroundColor, textColor, accentColor, logoUrl, backgroundImageUrl

### Modified files
- `backend/app/models/__init__.py` - Register AdTemplate
- `backend/app/main.py` - Mount templates router
- `frontend/src/lib/api.ts` - Add template types + API methods

---

## Feature B: Pain Point Research

### Backend
- **New file**: `backend/app/models/pain_point.py`
  - `PainPoint`: id, product_id (FK), pain_point (text), desired_outcome (text), category ("frustration", "fear", "desire", "objection"), severity (1-10), target_segment (nullable), source ("ai_generated", "manual"), created_at

- **New function** in `backend/app/engines/generation.py`:
  - `research_pain_points(product, count=20)` - Uses product RAG context + Claude to generate structured pain points as JSON array

- **New file**: `backend/app/routers/pain_points.py`
  - `POST /api/products/{product_id}/research-pain-points` - Background task, returns task_id
  - `GET /api/products/{product_id}/research-pain-points-status/{task_id}` - Poll status
  - `GET /api/products/{product_id}/pain-points` - List pain points
  - `POST /api/products/{product_id}/pain-points` - Add manually
  - `DELETE /api/pain-points/{id}` - Delete

### Modified files
- `backend/app/models/__init__.py` - Register PainPoint
- `backend/app/main.py` - Mount pain_points router
- `frontend/src/lib/api.ts` - Add pain point types + API methods

---

## Feature C: Bulk Variation Generator

### Backend
- **New file**: `backend/app/models/ad_variation.py`
  - `AdVariation`: id, product_id (FK), batch_id (UUID), template_id (FK to AdTemplate), pain_point_id (FK, nullable), headline, body, cta, template_config_override (JSON), status ("draft", "approved", "exported", "uploaded", "live", "paused"), image_url (nullable), meta_ad_id (nullable), performance_score (nullable float), created_at

- **New function** in `backend/app/engines/generation.py`:
  - `generate_ad_variations(product, template, pain_points, variations_per=5)` - For each pain point, asks Claude for N variations (headline ≤40 chars, body ≤125 chars, CTA ≤30 chars). Uses product context + brand brief. Returns list of variation dicts.

- **New file**: `backend/app/routers/bulk_generator.py`
  - `POST /api/products/{product_id}/bulk-generate` - Background task, body: {template_id, pain_point_ids, variations_per_pain_point}
  - `GET /api/products/{product_id}/bulk-generate-status/{task_id}` - Poll
  - `GET /api/products/{product_id}/ad-variations?batch_id=` - List variations
  - `PUT /api/ad-variations/{id}` - Edit copy
  - `PUT /api/ad-variations/bulk-status` - Bulk approve/reject
  - `DELETE /api/ad-variations/{id}` - Delete

### Modified files
- `backend/app/models/__init__.py` - Register AdVariation
- `backend/app/main.py` - Mount bulk_generator router
- `frontend/src/lib/api.ts` - Add variation types + API methods

---

## Feature D: Preview Gallery + PNG Export

### Frontend (new page)
- **New file**: `frontend/src/app/bulk-generate/page.tsx`
  - Multi-step wizard:
    1. Select product
    2. Pick template (with live preview)
    3. Select pain points (filterable checklist with "Research More" button)
    4. Set variations per pain point (slider 1-10)
    5. Generate (with progress polling)
    6. Preview gallery - grid of scaled-down (270x270) previews
       - Click to expand full-size modal
       - Bulk select/approve/reject toolbar
       - Filter by pain point category
       - Inline text editing
       - "Export as ZIP" button
       - "Upload to Facebook" button

- **New file**: `frontend/src/components/ad-templates/AdPreviewCard.tsx`
  - Scaled template preview with checkbox overlay, status badge

### PNG Export
- **New npm dependencies**: `html-to-image`, `jszip`, `file-saver`
- **New file**: `frontend/src/lib/export.ts`
  - `renderAdToPng(element)` - Captures 1080x1080 DOM node as PNG blob
  - `exportAdsAsZip(variations, renderFn, onProgress)` - Batch render → ZIP → download

### Backend (image persistence for Facebook upload)
- `POST /api/ad-variations/{id}/upload-image` in bulk_generator router - Accepts PNG, stores to disk, updates image_url

---

## Feature E: Bulk Facebook Upload

### Backend
- **Additions to** `backend/app/services/meta_client.py`:
  - `upload_image(image_bytes, name)` - POST to `/act_{id}/adimages`, returns image hash
  - `create_ad(ad_set_id, creative_id, name, status="PAUSED")` - POST to `/act_{id}/ads`
  - `get_adset_ads(ad_set_id)` - GET `/{ad_set_id}/ads`
  - `update_ad_status(ad_id, status)` - POST to `/{ad_id}` with status
  - `get_ad_insights(ad_id)` - Enhanced to support individual ad-level metrics

- **New file**: `backend/app/engines/bulk_upload.py`
  - `bulk_upload_to_facebook(db, product_id, variation_ids, ad_set_id, connection_id, destination_url)`:
    1. Load Meta connection
    2. For each variation: read image → upload → create creative → create PAUSED ad
    3. Update AdVariation.meta_ad_id and status to "uploaded"

- **New file**: `backend/app/routers/bulk_upload.py`
  - `POST /api/products/{product_id}/bulk-upload` - Background task: {variation_ids, ad_set_id, connection_id, destination_url}
  - `GET /api/products/{product_id}/bulk-upload-status/{task_id}` - Poll

### Frontend
- Upload dialog in preview gallery: select Meta connection, enter ad set ID, set destination URL, trigger upload with progress

---

## Feature F: Auto-Optimizer

### Backend
- **New file**: `backend/app/models/optimization.py`
  - `OptimizationConfig`: id, product_id (unique FK), min_impressions (default 500), max_cpm (default 30.0), min_ctr (default 0.5%), winner_ctr_threshold (default 2.0%), winner_budget_multiplier (default 2.0), check_interval_hours (default 6), enabled (boolean)
  - `OptimizationLog`: id, product_id (FK), ad_variation_id (FK), action ("paused", "promoted", "kept"), reason (text), metrics_snapshot (JSON), created_at

- **New file**: `backend/app/engines/optimizer.py`
  - `run_optimization_cycle(db, product_id, config)`:
    1. Get all AdVariations with meta_ad_id for product
    2. Fetch ad-level insights from Facebook
    3. **Kill rules**: Pause if (impressions > min AND CTR < min_ctr) OR (CPM > max_cpm)
    4. **Winner rules**: Flag if CTR > winner_threshold AND impressions > min
    5. For winners: create new ad set with multiplied budget, duplicate creative
    6. Log every decision
    7. Return summary with actions taken

- **New file**: `backend/app/routers/optimizer.py`
  - `GET /api/products/{product_id}/optimization-config` - Get config
  - `PUT /api/products/{product_id}/optimization-config` - Update config
  - `POST /api/products/{product_id}/run-optimization` - Manual trigger
  - `GET /api/products/{product_id}/optimization-log?limit=` - Decision history

### Frontend
- **New file**: `frontend/src/app/optimizer/page.tsx`
  - Config panel with sliders for thresholds
  - Enable/disable toggle
  - "Run Now" button
  - Decision log table (action, reason, metrics, timestamp)
  - Summary cards (total paused, total promoted, total spend saved)

### Scheduler Integration
- **Modified**: `backend/app/engines/scheduler.py` - Add `_run_auto_optimizer` job that queries products with optimization enabled and runs cycles on their configured interval

---

## Feature G: Winner Analysis & Iteration

### Backend
- **New function** in `backend/app/engines/generation.py`:
  - `analyze_winners(product, winning_variations, losing_variations)` - Feeds winner/loser data to Claude, returns structured analysis: what pain points resonate, what formats work, suggested next angles, recommended template tweaks

- **New endpoint** in `backend/app/routers/optimizer.py`:
  - `GET /api/products/{product_id}/winner-analysis` - Analyzes current optimization logs + variation performance, returns AI insights on what's working and what to try next

### Frontend
- Section in optimizer page showing winner analysis with "Generate Next Batch" button that pre-fills the bulk generator with recommended pain points and templates

---

## Implementation Order

```
Phase 1 (parallel):
  A. Ad Template System (backend + frontend components)
  B. Pain Point Research (backend + frontend)

Phase 2:
  C. Bulk Variation Generator (depends on A + B)

Phase 3:
  D. Preview Gallery + PNG Export (depends on C)

Phase 4:
  E. Bulk Facebook Upload (depends on D)

Phase 5:
  F. Auto-Optimizer (depends on E)

Phase 6:
  G. Winner Analysis & Iteration (depends on F)
```

## Modified Files Summary
- `backend/app/models/__init__.py` - Register all new models
- `backend/app/main.py` - Mount all new routers
- `backend/app/services/meta_client.py` - Add upload_image, create_ad, update_ad_status, get_adset_ads
- `backend/app/engines/generation.py` - Add research_pain_points, generate_ad_variations, analyze_winners
- `backend/app/engines/scheduler.py` - Add auto-optimizer job
- `frontend/src/lib/api.ts` - Add all new types and API methods
- `frontend/src/components/layout/Sidebar.tsx` - Add Bulk Generate + Optimizer nav items
- `frontend/package.json` - Add html-to-image, jszip, file-saver

## New Files Summary (19 files)
### Backend (12 files)
- `backend/app/models/ad_template.py`
- `backend/app/models/pain_point.py`
- `backend/app/models/ad_variation.py`
- `backend/app/models/optimization.py`
- `backend/app/routers/templates.py`
- `backend/app/routers/pain_points.py`
- `backend/app/routers/bulk_generator.py`
- `backend/app/routers/bulk_upload.py`
- `backend/app/routers/optimizer.py`
- `backend/app/engines/bulk_upload.py`
- `backend/app/engines/optimizer.py`

### Frontend (7 files)
- `frontend/src/components/ad-templates/BeforeAfterTemplate.tsx`
- `frontend/src/components/ad-templates/PainSolutionTemplate.tsx`
- `frontend/src/components/ad-templates/StatProofTemplate.tsx`
- `frontend/src/components/ad-templates/TemplateRenderer.tsx`
- `frontend/src/components/ad-templates/AdPreviewCard.tsx`
- `frontend/src/app/bulk-generate/page.tsx`
- `frontend/src/app/optimizer/page.tsx`
- `frontend/src/lib/export.ts`
