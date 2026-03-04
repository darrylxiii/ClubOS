

# CRM System Audit — Score: 41/100 — Path to 100/100

---

## Brutal Scoring Breakdown

| Area | Max | Actual | Why |
|------|-----|--------|-----|
| Data architecture | 20 | 12 | Two dead systems (crm_contacts never existed), partner funnel disconnected, no outreach learnings table |
| Instantly integration | 15 | 13 | Bi-directional sync is solid, sequence steps sync works, but no email body copy stored, no copy-to-performance correlation |
| Pipeline & inbox | 15 | 14 | Kanban, DnD, AI reply classification, keyboard shortcuts all work |
| Intelligence / ML loop | 15 | 0 | Zero. No `crm_outreach_learnings` table. `generate-outreach-strategy` queries campaign stats but never per-step copy performance. No feedback loop exists. |
| Dashboard & UX | 10 | 3 | SeedCRMDataButton in production, 15 routes with no hierarchy, dashboard is a link farm not a command center |
| Partner funnel → CRM bridge | 10 | 2 | `sync-partner-funnel-to-crm` function exists but is NEVER called — not by trigger, not by cron, not by UI. Dead code. |
| Automation engine | 5 | 1 | Builder UI scaffolded, engine function exists, but no evidence of rules being persisted or firing |
| Legacy cleanup | 5 | 0 | `crm_contacts` referenced in 5 files but table doesn't exist. `useCRMLeadScoring` hook queries phantom table. |
| Copy analytics | 5 | 0 | `instantly_sequence_steps` has `subject_line` but no `body_text`. No analytics view for copy performance. |
| **Total** | **100** | **41** | |

---

## Critical Findings

### 1. `sync-partner-funnel-to-crm` is dead code (-8 pts)
The function exists, is well-written, and correctly maps `partner_requests` → `crm_prospects`. But it is **never invoked** — no trigger, no cron job, no UI button, no import in any frontend file. Every partner funnel submission is invisible to the CRM.

### 2. `crm_contacts` table does not exist but is referenced in 5 files (-5 pts)
- `src/hooks/useCRMLeadScoring.ts` — queries `crm_contacts` (will 404)
- `src/components/crm/CompanyCRMMetrics.tsx` — queries `crm_contacts` (will 404)
- `src/components/crm/ContactProfileView.tsx` — queries `crm_contacts` (will 404)
- `src/components/crm/ActivityTimeline.tsx` — joins `crm_contacts` (will fail)
- `src/types/database.ts` — type references to `crm_contacts`

All these features silently break. Users see empty states.

### 3. No outreach copy storage or learning (-12 pts)
`instantly_sequence_steps` stores `subject_line` but **no email body text**. The Instantly API does return step content, but `sync-instantly-sequence-steps` never saves it. Without the actual copy, you cannot correlate performance to content patterns.

### 4. `generate-outreach-strategy` has zero feedback from past performance (-7 pts)
It queries `crm_campaigns` for "top performing" but only gets aggregate stats (total_sent, total_replies). It never looks at:
- Which subject lines got highest open rates
- Which body copy patterns got most replies
- Which step in the sequence produces the most conversions
- Reply sentiment breakdown per campaign

### 5. SeedCRMDataButton visible in production dashboard (-3 pts)

### 6. Navigation is fragmented (-3 pts)
CRM has 8 sidebar items + 3 more under "Outreach" (Campaigns, Email Sequencing, Lead Scoring). 11 CRM-related nav items with no grouping logic. "Campaigns" is under "Outreach" but should be under "CRM". "Email Sequencing" is a top-level route (`/email-sequences`) not under `/crm/`.

### 7. Automation engine has no persisted rules (-3 pts)

---

## The 100/100 Implementation Plan

### Phase 1: Fix broken foundations (remove dead code, activate dead functions)

**1a. Delete orphaned `crm_contacts` references** — Remove or rewrite these 5 files:
- `src/hooks/useCRMLeadScoring.ts` → rewrite to query `crm_prospects` (use `composite_score` or `lead_score`)
- `src/components/crm/CompanyCRMMetrics.tsx` → rewrite to query `crm_prospects` by `company_domain`
- `src/components/crm/ContactProfileView.tsx` → remove (or rewrite for prospects)
- `src/components/crm/ActivityTimeline.tsx` → remove `crm_contacts` join, use `crm_prospects` via `prospect_id`
- `src/types/database.ts` → remove `crm_contacts` type references

**1b. Activate partner funnel → CRM bridge** — Create a DB trigger on `partner_requests` INSERT that calls `sync-partner-funnel-to-crm` via `pg_net.http_post`. This makes every funnel submission automatically appear in the CRM pipeline as a `new` stage prospect with `source = 'website'`.

**1c. Remove `SeedCRMDataButton`** from `CRMDashboard.tsx` (lines 30, 41-45, 146).

### Phase 2: Outreach Copy Intelligence Engine (the ML loop)

**2a. Add `body_text` column to `instantly_sequence_steps`** — Migration:
```sql
ALTER TABLE instantly_sequence_steps 
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS body_html TEXT;
```

**2b. Update `sync-instantly-sequence-steps`** to store the step body content from the Instantly API response (the API returns step content; the function just doesn't save it).

**2c. Create `crm_outreach_learnings` table** — Migration:
```sql
CREATE TABLE crm_outreach_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_type TEXT NOT NULL, -- 'subject_pattern', 'body_pattern', 'timing', 'sequence_structure'
  pattern TEXT NOT NULL, -- human-readable pattern description
  evidence JSONB NOT NULL DEFAULT '{}', -- { examples, metrics, campaign_ids }
  sample_size INTEGER DEFAULT 0,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  performance_lift NUMERIC(5,2), -- % vs baseline
  is_active BOOLEAN DEFAULT true,
  applied_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_outreach_learnings ENABLE ROW LEVEL SECURITY;
-- Admin/strategist access only
```

**2d. Create `analyze-outreach-copy` edge function** — Scheduled daily via pg_cron. For each campaign with >50 sends:
- Rank subject lines by open rate, body text by reply rate
- Extract patterns (length, question marks, personalization token count, CTA type)
- Map reply sentiment (from `crm_email_replies.classification`) back to the originating sequence step
- Upsert winning/losing patterns into `crm_outreach_learnings`

**2e. Wire learnings into `generate-outreach-strategy`** — Before the AI call (line 66), query `crm_outreach_learnings WHERE is_active = true ORDER BY confidence_score DESC LIMIT 15` and inject as structured context: "Proven patterns from your outreach data: ..."

### Phase 3: CRM Command Center Dashboard

**3a. Redesign `/crm` (CRMDashboard.tsx)** as a single-screen command center:
- **Top row**: 6 compact KPI cards (pipeline value, hot leads, unread replies, meetings this week, reply rate 7d trend, active campaigns)
- **Priority Actions section** (inline Focus View — overdue activities, hot replies needing response, new partner funnel leads). No separate route needed.
- **Pipeline mini-bars** (horizontal stage bars with counts, not full kanban)
- **Outreach learnings highlights** (top 3 winning patterns this week)
- Remove tabs. Everything on one screen.

**3b. Consolidate navigation** — Update `navigation.config.ts` to merge CRM + Outreach into one group with 6 items:
- CRM Command Center (`/crm`)
- Pipeline (`/crm/pipeline`)
- Reply Inbox (`/crm/inbox`)
- Campaigns (`/crm/campaigns`)
- Analytics & Learnings (`/crm/analytics`) — add Copy Performance as a tab
- Settings (`/crm/settings`) — absorb Integrations, Lead Scoring, Suppression, Imports, Audit Trail as tabs

Add `Navigate` redirects for retired routes.

### Phase 4: Copy Performance Analytics

**4a. New `CopyPerformancePanel` component** — embedded as a tab in `/crm/analytics`:
- Subject line leaderboard (subject, campaign, sends, open rate, confidence interval)
- Body copy leaderboard (first 100 chars, reply rate, positive reply %)
- Step-by-step heatmap (which step in the sequence converts best)
- AI-generated "What to try next" from `crm_outreach_learnings`
- Trend chart: rolling 7d reply rate

### Phase 5: Automation + Cleanup

**5a. Wire automation persistence** — Ensure `CRMAutomationBuilder` saves rules to a `crm_automation_rules` table and `crm-automation-engine` reads and executes them on prospect stage changes.

**5b. Standardize scoring** — Remove dual `lead_score` / `composite_score` confusion. Pick `composite_score` as authoritative, update all references.

**5c. Move `/email-sequences` under `/crm/sequences`** — Update route and add `Navigate` redirect.

---

## Execution Order

```text
Phase 1a: Delete crm_contacts dead code (5 files)          ─┐
Phase 1b: Activate partner funnel trigger                   ─┤ parallel
Phase 1c: Remove SeedCRMDataButton                          ─┘
                    │
Phase 2a: Add body_text column to sequence_steps            ─┐
Phase 2b: Update sync function to store body                ─┤ parallel
Phase 2c: Create crm_outreach_learnings table               ─┘
                    │
Phase 2d: Create analyze-outreach-copy function             ─── (depends on 2a-c)
Phase 2e: Wire learnings into strategy generation           ─── (depends on 2c)
                    │
Phase 3a: Redesign CRM dashboard                            ─┐
Phase 3b: Consolidate navigation                            ─┘ parallel
                    │
Phase 4a: Copy Performance Analytics panel                  ─── (depends on 2c)
                    │
Phase 5a-c: Automation, scoring, route cleanup              ─── (last)
```

Phases 1 and 2a-c are independent and run first. Phase 2d-e follows. Phase 3 is independent of Phase 2. Phase 4 depends on the learnings table. Phase 5 is cleanup.

