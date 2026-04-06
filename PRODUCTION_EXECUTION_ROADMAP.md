# ATTA Production Execution Roadmap

This plan is intentionally deployment-safe: all work is done locally and pushed to GitHub only until a final go-live decision.

## Phase A — Platform Hardening (Current Priority)

### A1. Input Validation Layer
- Add shared server-side validators for all API routes and server actions.
- Replace ad-hoc parsing with centralized validation helpers.
- Done when:
  - All `/api/*` routes validate payload/query.
  - Login + all admin mutating actions reject invalid payloads consistently.

### A2. Abuse Protection
- Add rate limiting for public APIs and sensitive admin mutations.
- Add request fingerprints/IP key strategy and response headers.
- Done when:
  - `/api/track-likes` and future public APIs are rate-limited.
  - Repeated abuse yields deterministic `429` responses.

### A3. Reliability Baseline
- Health/readiness endpoint with dependency checks.
- Structured API logs with request IDs.
- Done when:
  - `/api/health` is available and documented.
  - API logs include event name + request ID + context.

### A4. CI Quality Gate
- Enforce `verify:setup`, `check`, `build` for every PR.
- Done when:
  - GitHub Actions fail on any lint/type/build issue.
  - Generated folders are excluded from lint noise.

## Phase B — Domain Completeness

### B1. Music Domain Integrity
- Enforce streaming model (`stream` vs `external`) in admin forms, DB writes, and player.
- Add import validator for external release links with accepted domains/patterns.
- Done when:
  - No track can exist in invalid mixed state.
  - Admin gets clear diagnostics before save.

### B2. Admin CRUD Parity
- Remove partial flows across albums/tracks/merch/media/settings.
- Add consistent bulk actions + confirmations + post-action summaries.
- Done when:
  - Every entity supports create/read/update/delete/bulk operations.
  - Audit events are emitted for every mutation path.

### B3. RLS & Migration Safety
- Add migration rollback notes and verification scripts.
- Add RLS verification checks for public vs role-based access.
- Done when:
  - RLS matrix is validated in test scripts.
  - Migrations are repeatable and reversible.

## Phase C — Product Quality & Launch Readiness

### C1. Testing Maturity
- Unit tests for player queue, likes, filters, permission checks.
- Integration tests for admin publishing workflows.
- E2E tests for public listening + admin publish + merch flows.
- Done when:
  - Core journeys are covered by automated tests.

### C2. Accessibility & Performance
- WCAG AA pass on main public/admin routes.
- Core Web Vitals budget and image/media optimization checklist.
- Done when:
  - Keyboard/focus/contrast checks pass.
  - LCP/CLS/INP budgets are documented and met on baseline pages.

### C3. Content Ops & Compliance
- Draft/publish/scheduled publishing workflow.
- Legal pages: privacy, terms, cookies.
- SEO + schema + canonical hygiene finalized.
- Done when:
  - Content team can manage releases without code edits.
  - Compliance pages are present and linked in footer.

## Phase D — Delivery & Operations

### D1. Environment Strategy
- Define dev/staging/prod with separate env vars and data boundaries.
- Add staging parity checklist.

### D2. Deployment Runbook
- Final go-live checklist (Cloudflare routes, WAF, rate limits, rollback, smoke tests).
- Incident runbook (429/500 spikes, Supabase outages, auth failures).

### D3. Observability
- Add centralized error tracking integration.
- Add alerting thresholds (4xx/5xx spikes, request-limit thresholds).

---

## Current Status Snapshot
- Setup verification script: implemented.
- Health endpoint: implemented.
- Lint/type/build preflight command: implemented.
- API rate limiting + request logs: started (track likes API).
- Next target: apply validation/rate limit patterns across all admin server actions.
