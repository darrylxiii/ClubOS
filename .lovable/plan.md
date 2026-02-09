

# Admin Navigation Consolidation Audit

## Current State

The admin section currently has **70+ separate routes** across 11 navigation groups. Many of these are closely related pages that should live as tabs inside a single hub -- reducing cognitive load, eliminating unnecessary page transitions, and making the platform feel like a proper OS.

## Consolidation Plan: 7 New Hubs (merging ~40 standalone pages into tabs)

Each hub follows the proven pattern: a single page with tab navigation (like WhatsAppHub and the Jobs page already do), with each tab lazy-loading its content. Old routes get `<Navigate>` redirects for continuity.

---

### Hub 1: TRANSLATIONS HUB (`/admin/translations`)
Merges 5 pages into 1:

| Current Route | Becomes Tab |
|---|---|
| `/admin/translations` | Manager |
| `/admin/translation-editor` | Editor |
| `/admin/translation-coverage` | Coverage |
| `/admin/brand-terms` | Brand Terms |
| `/admin/translation-audit` | Audit Log |
| `/admin/languages` | Languages |

**Title**: "TRANSLATIONS HUB" / "Language, coverage, brand terms, and audit controls"

---

### Hub 2: SECURITY HUB (`/admin/security`)
Merges 5 pages into 1:

| Current Route | Becomes Tab |
|---|---|
| `/admin/anti-hacking` | Anti-Hacking |
| `/admin/security-events` | Security Events |
| `/admin/audit-log` | Audit Log |
| `/admin/error-logs` | Error Logs |
| `/admin/god-mode` | God Mode |
| `/admin/disaster-recovery` | Disaster Recovery |

**Title**: "SECURITY HUB" / "Threat monitoring, audit trails, and incident response"

---

### Hub 3: FINANCE HUB (`/admin/finance`)
Merges 10 pages into 1:

| Current Route | Becomes Tab |
|---|---|
| `/admin/financial` | Dashboard |
| `/admin/deals-pipeline` | Deal Pipeline |
| `/admin/revenue-ladder` | Revenue Ladder |
| `/admin/company-fees` | Company Fees |
| `/admin/revenue-shares` | Revenue Shares |
| `/admin/expenses` | Expenses |
| `/admin/reconciliation` | Reconciliation |
| `/admin/moneybird` | Moneybird |
| `/admin/deal-pipeline-settings` | Pipeline Settings |

Sub-hub for Inventory stays at `/admin/inventory` (already has its own 5 pages).

**Title**: "FINANCE HUB" / "Revenue, fees, expenses, invoicing, and pipeline management"

---

### Hub 4: ANALYTICS HUB (`/admin/analytics`)
Merges 7 pages into 1:

| Current Route | Becomes Tab |
|---|---|
| `/admin/global-analytics` | Global |
| `/admin/kpi-command-center` | KPI Command Center |
| `/admin/performance-matrix` | Performance Matrix |
| `/admin/website-kpis` | Website KPIs |
| `/admin/sales-kpis` | Sales KPIs |
| `/admin/user-activity` | User Activity |
| `/admin/user-engagement` | User Engagement |

**Title**: "ANALYTICS HUB" / "KPIs, performance, engagement, and platform metrics"

---

### Hub 5: TALENT HUB (`/admin/talent`)
Merges 6 pages into 1:

| Current Route | Becomes Tab |
|---|---|
| `/admin/candidates` | All Candidates |
| `/admin/member-requests` | Member Requests |
| `/admin/merge` | Merge Dashboard |
| `/admin/rejections` | Rejections |
| `/admin/club-sync-requests` | Club Sync |
| `/archived-candidates` | Archived |

Note: Talent Pool (`/talent-pool`) and Target Companies (`/admin/target-companies`) remain standalone -- they have their own complex UIs.

**Title**: "TALENT HUB" / "Candidate pipeline, requests, merges, and sync management"

---

### Hub 6: OPERATIONS HUB (`/admin/operations`)
Merges 6 pages into 1:

| Current Route | Becomes Tab |
|---|---|
| `/admin/system-health` | System Health |
| `/admin/data-health` | Data Health |
| `/admin/employee-management` | Team |
| `/admin/bulk-operations` | Bulk Ops |
| `/admin/ai-configuration` | AI Config |
| `/admin/templates` | Templates |

**Title**: "OPERATIONS HUB" / "System health, team management, and platform operations"

---

### Hub 7: INTELLIGENCE HUB (`/admin/intelligence`)
Merges 5 pages into 1:

| Current Route | Becomes Tab |
|---|---|
| `/admin/agent-brain` | Agent Brain |
| `/admin/rag-analytics` | RAG Analytics |
| `/admin/conversation-analytics` | Conversations |
| `/admin/feedback` | Feedback |

**Title**: "INTELLIGENCE HUB" / "AI performance, conversation analysis, and feedback"

---

## Pages That Stay Standalone (correct as-is)

These pages are either too complex, have unique routing needs, or serve a distinct purpose:

- `/admin` -- Admin Home (dashboard)
- `/admin/whatsapp` -- Already a hub
- `/admin/enterprise` -- Already a tabbed hub (Compliance, SLA, DR, White Label)
- `/admin/employee-management` -- Already tabbed internally
- `/admin/target-companies` -- Complex standalone
- `/admin/inventory/*` -- Sub-domain with its own 5 pages
- `/admin/games/*` -- 5 game admin pages (could become a hub later)
- `/admin/email-templates` and `/admin/email-notifications` -- Could merge into a "Comms Hub" later
- `/talent-pool`, `/admin/talent-pool/lists` -- Standalone domain

---

## Implementation Approach

### Phase 1 (this implementation)
Build the 3 highest-impact hubs first:
1. **Translations Hub** (6 pages into 1) -- cleanest merge, pages are tightly related
2. **Security Hub** (6 pages into 1) -- critical admin workflow
3. **Finance Hub** (9 pages into 1) -- most page reduction

### Phase 2 (follow-up)
4. Analytics Hub
5. Talent Hub
6. Operations Hub
7. Intelligence Hub

### For Each Hub
1. Create a new hub page (e.g., `src/pages/admin/TranslationsHub.tsx`) with:
   - Page title + subtitle in the header
   - Tab navigation (using the transparent TabsList)
   - Lazy-loaded tab content from existing components
2. Update `admin.routes.tsx`: Point the primary route to the hub, add `<Navigate>` redirects for old routes
3. Update `navigation.config.ts`: Collapse sidebar entries to a single hub link per group

### Navigation Config Update
Each merged group gets reduced from many sidebar items to 1 entry pointing at the hub. Example:

```text
Before (Translations group - 6 items):
  Translation Manager -> /admin/translations
  Translation Editor  -> /admin/translation-editor
  Translation Coverage -> /admin/translation-coverage
  Brand Terms -> /admin/brand-terms
  Translation Audit -> /admin/translation-audit
  Language Manager -> /admin/languages

After (1 item):
  Translations Hub -> /admin/translations
```

This dramatically cleans up the sidebar while keeping all functionality accessible via tabs.

## Impact Summary

| Metric | Before | After (Phase 1+2) |
|---|---|---|
| Admin sidebar items | ~60+ | ~30 |
| Separate admin pages | 70+ | ~35 |
| Navigation clicks to find related features | 2-3 | 1 (just switch tab) |

