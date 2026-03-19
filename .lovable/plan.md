

# Full Audit: Partner Experience UI/UX Gap Analysis

## Reference Standard: Jobs UI/UX
The Jobs page (`PartnerJobsHome`) sets the bar with:
- **Compact header** (`JobsCompactHeader`) — clean title, expandable search, overflow menu
- **Inline stats strip** (`JobsInlineStats`) — key metrics in a horizontal bar with separators, glassmorphism (`bg-card/30, border-border/20`)
- **AI banner** (`JobsAIBanner`) — contextual suggestions
- **Unified filter bar** (`JobsUnifiedFilterBar`) — status pills, quick filters, saved presets
- **Compact cards** (`CompactJobCard`) — dense, data-rich, with dropdown actions, badges, avatars, keyboard nav
- **Multiple view modes** — grid, list, table, kanban
- **Realtime updates**, keyboard shortcuts, bulk actions, persisted filters

---

## Pages Needing Upgrade (Severity: Critical → Low)

### CRITICAL — Completely Old UI

| # | Page | Current State | Gap |
|---|------|--------------|-----|
| 1 | **Partner Hub** (`PartnerHub.tsx`) | Giant "PARTNER HUB" heading with Building2 icon, basic `TabsList`, no stats, no glassmorphism | Needs compact header, inline stats, glass tabs |
| 2 | **Billing Dashboard** (`BillingDashboard.tsx`) | Plain `h1` with DollarSign icon, basic Cards with hard-coded colors (`text-green-600`, `text-orange-600`), generic skeleton placeholders | Needs glass cards, themed colors, proper empty state |
| 3 | **SLA Dashboard** (`SLADashboard.tsx`) | Plain `h1`, hardcoded `bg-orange-50 dark:bg-orange-950` alerts, basic Progress bars | Needs glass styling, themed alert colors, animated numbers |
| 4 | **Integrations** (`IntegrationsManagement.tsx`) | Plain `h1` with Plug icon, standard Cards, no glassmorphism | Needs glass cards, status indicators matching brand |
| 5 | **Audit Log** (`AuditLog.tsx`) | Plain `h1` with Shield icon, raw JSON `<pre>` blocks, basic list | Needs compact log entries, formatted metadata, glass styling |
| 6 | **Rejections** (`PartnerRejections.tsx`) | 476 lines of dense table UI, basic Card headers, custom color classes (`bg-orange-500/20`) | Needs compact header, glass cards, brand-consistent palette |
| 7 | **Target Companies** (`PartnerTargetCompanies.tsx`) | Plain stat cards, standard table, no glass treatment | Needs inline stats strip, glass cards |
| 8 | **Social Management** (`SocialManagement.tsx`) | `text-4xl font-black uppercase` heading, basic tabs | Needs compact header matching Jobs pattern |
| 9 | **Company Jobs Dashboard** (`CompanyJobsDashboard.tsx`) | Double-nested padding divs (bug), `border-b-2 border-foreground` header, basic `TabsList grid grid-cols-3` | Needs complete rewrite to match Jobs compact UI |
| 10 | **Company Applications** (`CompanyApplications.tsx`) | Basic header, standard cards | Needs glass treatment, compact header |
| 11 | **Partner Contracts** (`PartnerContractsPage.tsx`) | Standard Card layout, basic search | Needs compact header, glass cards |
| 12 | **Live Interview** (`LiveInterview.tsx`) | Basic Cards, standard buttons | Needs glass styling, brand treatment |
| 13 | **Partner Analytics** (`PartnerAnalyticsDashboard.tsx`) | Nested tabs within tabs, basic refresh button | Needs compact header, glass treatment |

---

## Implementation Plan

### Phase 1: Shared Components (foundation)
Create reusable partner page primitives that mirror the Jobs components:

| Component | Purpose |
|-----------|---------|
| `PartnerPageHeader` | Compact header with title, expandable search, action buttons, overflow menu — mirrors `JobsCompactHeader` |
| `PartnerInlineStats` | Horizontal stats strip with glassmorphism — mirrors `JobsInlineStats` |
| `PartnerGlassCard` | Pre-styled Card with `bg-card/30 backdrop-blur border-border/20` |
| `PartnerEmptyState` | Branded empty state with glass aesthetic |

### Phase 2: Partner Hub Overhaul
- Replace the giant heading with `PartnerPageHeader`
- Add an `PartnerInlineStats` showing key metrics (active jobs, pending reviews, SLA compliance, open contracts)
- Restyle tabs with glass treatment: `bg-card/30 backdrop-blur-sm border-border/20`
- Remove redundant sub-page headers (Billing, SLA, etc. already have their own `h1` — these should be removed since they're inside a tab)

### Phase 3: Sub-page Upgrades (all 8 tabs)
For each tab content page (Billing, SLA, Integrations, Audit Log, Rejections, Target Companies, Social, Analytics):
- Remove standalone `h1` headers (they're inside Hub tabs, so the tab name suffices)
- Remove outer `px-4 sm:px-6 lg:px-8 py-8` padding (already provided by Hub)
- Apply glass card treatment to all Card components
- Replace hardcoded colors (`text-green-600`, `bg-orange-50`) with theme-consistent tokens
- Replace generic skeleton placeholders with branded loading states
- Format raw JSON in Audit Log as readable key-value pairs

### Phase 4: Standalone Partner Pages
For pages outside the Hub (Company Jobs Dashboard, Contracts, Live Interview, Applications):
- `CompanyJobsDashboard.tsx`: Fix double-nested padding divs, replace with compact header
- `PartnerContractsPage.tsx`: Add compact header, glass cards
- `LiveInterview.tsx`: Glass card treatment
- `CompanyApplications.tsx`: Compact header, glass cards

### Phase 5: Polish
- Add `AnimatedNumber` to all stat values
- Add `ScrollReveal` staggered entrance to dashboard sections
- Ensure all empty states use branded `EmptyState` with glass aesthetic

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/partner/PartnerPageHeader.tsx` | **NEW** — shared compact header |
| `src/components/partner/PartnerInlineStats.tsx` | **NEW** — shared stats strip |
| `src/components/partner/PartnerGlassCard.tsx` | **NEW** — pre-styled glass card |
| `src/pages/partner/PartnerHub.tsx` | Replace header, add stats, glass tabs |
| `src/pages/partner/BillingDashboard.tsx` | Remove header/padding, glass cards, theme colors |
| `src/pages/partner/SLADashboard.tsx` | Remove header/padding, glass cards, theme alerts |
| `src/pages/partner/IntegrationsManagement.tsx` | Remove header/padding, glass cards |
| `src/pages/partner/AuditLog.tsx` | Remove header/padding, glass cards, format JSON |
| `src/pages/PartnerRejections.tsx` | Remove header, glass cards, brand palette |
| `src/pages/PartnerTargetCompanies.tsx` | Remove header, glass cards, inline stats |
| `src/pages/SocialManagement.tsx` | Compact header, glass treatment |
| `src/pages/CompanyJobsDashboard.tsx` | Fix double padding, compact header, glass cards |
| `src/pages/CompanyApplications.tsx` | Compact header, glass cards |
| `src/pages/partner/PartnerContractsPage.tsx` | Compact header, glass cards |
| `src/pages/partner/LiveInterview.tsx` | Glass card treatment |
| `src/pages/PartnerAnalyticsDashboard.tsx` | Remove inner header, glass tabs |

**Estimated scope**: 3 new shared components + 13 page updates

