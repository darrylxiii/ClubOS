

# Sourcing Agent: Admin/Strategist-Only Implementation

## Scope Clarification

Partners are completely excluded from the sourcing system. They will never see sourcing strategies, Boolean queries, URL imports, mission progress, or any sourcing-related UI. The entire Agentic OS hub is already restricted to admin routes -- Partners cannot access `/admin/agentic-os` at all.

This means the previously discussed `PartnerSourcingView.tsx` and partner RLS policies are dropped entirely. The sourcing system is 100% internal tooling for The Quantum Club team.

## What Gets Built

### 1. Database Migration

Add columns to the existing `sourcing_missions` table:
- `search_strategy JSONB` -- AI-generated Boolean queries and tips
- `partner_request_notes` is NOT added (partners excluded)
- `time_spent_minutes INT` -- strategist effort tracking

Add a strategist RLS policy (currently only admin/super_admin can access):
- Strategists can SELECT and INSERT sourcing missions for jobs they are assigned to

No partner policies whatsoever.

### 2. Edge Function: `guide-sourcing-strategy`

Uses Lovable AI (gemini-3-flash-preview) to generate actionable search strategies from a job description. Zero external API keys needed.

**Input**: `{ jobId: string }`
**Output**: Structured JSON with:
- 5 LinkedIn Boolean search strings (title + skills + location variations)
- GitHub search queries for technical roles
- Platform-specific tips (where to look, what filters to use)
- Estimated effort in hours

Server-side role check: only admin/strategist can invoke.

### 3. Edge Function: `source-candidates`

Processes LinkedIn URLs submitted by admin/strategist. Pipeline per URL:
1. Normalize URL format
2. Deduplicate against `candidate_profiles.linkedin_url`
3. Invoke existing `linkedin-scraper` for new profiles
4. Invoke `enrich-candidate-profile` for AI enrichment
5. AI-rank candidates against the job
6. Save to `agent_matches` and update `sourcing_missions`
7. Log to `agent_decision_log`

Server-side role check: rejects any non-admin/strategist caller with 403.

### 4. UI: `SourcingCommandPanel.tsx` (Admin/Strategist Only)

New tab in the Agentic OS hub with:
- **Job selector** dropdown to pick the role being sourced
- **AI Strategy Generator** button: calls `guide-sourcing-strategy`, displays Boolean queries in copyable cards
- **Bulk URL Import** textarea: paste LinkedIn URLs, preview dedup results, trigger processing pipeline
- **Active Missions** list: status, profile counts, timeline
- **Results Grid**: ranked candidates with match scores and "Add to Shortlist" actions
- No cost/credit tracking UI (no external API costs without Proxycurl)

### 5. Data Hook: `useSourcingMissions.ts`

React Query hook for CRUD on `sourcing_missions`. No role branching needed since only admin/strategist can reach this UI.

### 6. Hub Integration

Update `AgenticOSHub.tsx` to add a 6th tab: "Sourcing" with the `SourcingCommandPanel`.

### 7. Heartbeat Integration

Update `agentic-heartbeat` to process pending sourcing missions (max 2 concurrent). When the headhunter finds fewer than 5 internal matches for a new job, it auto-creates a sourcing mission for strategist attention.

## Files

### New
| File | Purpose |
|------|---------|
| `supabase/functions/guide-sourcing-strategy/index.ts` | AI Boolean query generation |
| `supabase/functions/source-candidates/index.ts` | URL processing pipeline |
| `src/components/admin/agentic/SourcingCommandPanel.tsx` | Full sourcing UI |
| `src/hooks/useSourcingMissions.ts` | Data hook |

### Modified
| File | Change |
|------|--------|
| `src/pages/admin/AgenticOSHub.tsx` | Add 6th "Sourcing" tab |
| `supabase/functions/run-headhunter-agent/index.ts` | Auto-create sourcing mission when internal results are thin |
| `supabase/functions/agentic-heartbeat/index.ts` | Process pending sourcing missions |

## Security Summary

- `sourcing_missions` table: RLS restricts to admin/super_admin/strategist only
- Both edge functions validate caller role server-side before processing
- Partners have zero visibility: no UI route, no RLS policy, no API access
- The Agentic OS hub lives under `/admin/` which is already gated to admin roles

