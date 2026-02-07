
# QUIN Intelligence Hub: Role-Aware AI Chat + Voice on Every Home Page

## What We're Building

A contextual AI assistant (text + voice) embedded directly on each role's home dashboard. Unlike the existing `/club-ai` page which is a separate destination, this lives right where users work. The key differentiator: QUIN knows your data, respects your permissions, and proactively helps based on what matters to you right now.

## Architecture Overview

The system has three layers:
1. **Frontend Widget** -- Embedded on each home page (CandidateHome, PartnerHome, AdminHome)
2. **Role-Aware Context Engine** -- New edge function that scopes data access by role
3. **Voice Integration** -- Reuses existing ElevenLabs infrastructure, wired into the same context

```text
+------------------+     +---------------------+     +--------------------+
|  Home Dashboard  |     |  quin-home-chat     |     |  Lovable AI        |
|  (per role)      | --> |  (edge function)    | --> |  Gateway           |
|                  |     |                     |     |                    |
|  QUINHomeWidget  |     |  Role-based context |     |  Streaming SSE     |
|  - Text input    |     |  Data scoping       |     |  Tool calling      |
|  - Voice toggle  |     |  Conversation save  |     |                    |
+------------------+     +---------------------+     +--------------------+
```

## Data Access Matrix (The Core of the System)

This is the most critical part. Each role sees ONLY what they should:

| Data Category | Candidate (user) | Partner | Admin |
|---|---|---|---|
| Own profile | Yes | Yes | All profiles |
| Own applications | Yes | No | All applications |
| Own tasks | Yes | Own company tasks | All tasks |
| Own bookings/interviews | Yes | Company bookings | All bookings |
| Own emails | Yes | No | All emails |
| Own meetings | Yes | Company meetings | All meetings |
| Own achievements | Yes | No | All achievements |
| Own social stats | Yes | No | All social stats |
| Jobs (active, public) | Yes | Company jobs only | All jobs |
| Salary benchmarks | Market data only | No | Full data |
| Company data | Followed companies | Own company deep | All companies |
| Candidates | No | Assigned candidates | All candidates |
| Applications to their jobs | No | Company applications | All applications |
| CRM / Prospects | No | No | Full CRM |
| Revenue / Financials | No | Company invoices | Full financials |
| WhatsApp / SMS | No | Company comms | All comms |
| Relationship health | No | Company relationships | All relationships |
| Predictive signals | Own signals | Company signals | All signals |
| Audit logs | No | No | Full access |
| System health | No | No | Full access |
| Deal pipeline | No | Company deals | All deals |
| KPIs | No | Company KPIs | Platform KPIs |
| Referrals | Own referrals | Company referrals | All referrals |
| Dossiers | Own dossier | Company dossiers | All dossiers |
| Team members | No | Own team | All teams |

## Implementation Plan

### Phase 1: Role-Aware Backend (Edge Function)

**New file: `supabase/functions/quin-home-chat/index.ts`**

A new edge function specifically for the home page chat, built on top of the existing `club-ai-chat` patterns but with strict role-based data scoping.

Key design decisions:
- Authenticate the user via JWT (reuse `auth-helpers.ts`)
- Fetch roles from `user_roles` table
- Branch data fetching based on highest-priority role
- Each role gets a tailored system prompt with ONLY their permitted data
- Reuse existing `ai-tools.ts` but gate tool availability by role
- Stream responses via SSE (same pattern as `club-ai-chat`)

**Candidate context fetcher:**
- Profile, applications, tasks, bookings, achievements, social stats, emails, meetings, saved jobs, referrals, AI memory, career trends, profile strength
- Active jobs (public, for discovery)
- Salary benchmarks (anonymized market data only)

**Partner context fetcher:**
- Own profile + company profile (deep: culture, tech stack, benefits, mission)
- Company jobs with application counts and pipeline stages
- Applications TO their company's jobs (candidate name, stage, timeline)
- Company-assigned candidates (dossiers, match scores)
- Company bookings/interviews
- Team members + invite status
- SLA timers, deal pipeline, offer pipeline
- Company-level KPIs and health scores
- Company communications (WhatsApp, email threads with candidates)
- Company relationship health scores
- Partner-specific AI insights

**Admin context fetcher:**
- Everything from candidate + partner contexts
- Platform-wide stats (total users, companies, active jobs, placements)
- CRM prospects + pipeline
- Revenue metrics, placement fees, commission data
- System health (edge function performance, error rates)
- Audit logs (recent security events)
- All predictive signals and success patterns
- WhatsApp/SMS across all accounts
- KPI command center data
- Partner engagement metrics

### Phase 2: Tool Gating by Role

**Modify: `supabase/functions/_shared/ai-tools.ts`**

Add a role-aware tool filter. Not all tools should be available to all roles:

| Tool | Candidate | Partner | Admin |
|---|---|---|---|
| search_jobs | Yes | No | Yes |
| apply_to_job | Yes | No | No |
| create_task | Yes | Yes | Yes |
| generate_cover_letter | Yes | No | No |
| search_talent_pool | No | Yes | Yes |
| get_candidates_needing_attention | No | Yes | Yes |
| search_communications | No | Yes | Yes |
| get_relationship_health | No | Yes | Yes |
| navigate_to_page | Yes | Yes | Yes |
| draft_message | Yes | Yes | Yes |
| schedule_meeting | Yes | Yes | Yes |
| analyze_job_fit | Yes | No | Yes |
| log_candidate_touchpoint | No | Yes | Yes |

New admin-only tools to add:
- `get_platform_health`: System metrics, error rates, uptime
- `get_revenue_summary`: Revenue, placements, pipeline value
- `search_all_users`: Search across all users/candidates

New partner-only tools to add:
- `get_company_pipeline`: Full hiring pipeline for their company
- `compare_candidates`: Side-by-side candidate comparison for a role

### Phase 3: Frontend Widget

**New file: `src/components/clubhome/QUINHomeChatWidget.tsx`**

A compact, expandable chat widget designed for the home page. Not a full-page chat -- it's a focused assistant panel.

Design:
- Collapsed state: Single-line input with QUIN sparkle icon + "Ask QUIN anything..." placeholder
- Expanded state: Chat panel (max 400px height) with message history, streaming responses, markdown rendering
- Voice toggle button (mic icon) that activates existing ElevenLabs voice
- Quick suggestion chips based on role (e.g., candidate sees "Prepare for interview", partner sees "Pipeline summary")
- Conversation persisted to `ai_conversations` table
- Model defaults to `google/gemini-3-flash-preview` (fast, capable)

Role-specific quick actions:
- **Candidate**: "What should I do today?", "Prepare me for my next interview", "Find matching jobs", "How is my profile?"
- **Partner**: "Pipeline summary", "Who needs attention?", "Interview schedule today", "Candidate recommendations"
- **Admin**: "Platform health check", "Revenue this month", "Active searches overview", "At-risk relationships"

**New file: `src/hooks/useQUINHomeChat.ts`**

Custom hook managing:
- Message state + streaming
- Conversation persistence (load/save via `ai_conversations`)
- Voice mode toggle (delegates to existing `useClubAIVoice`)
- Role-aware quick actions
- Error handling (429/402 rate limits)

### Phase 4: Integration into Home Pages

**Modify: `src/components/clubhome/CandidateHome.tsx`**
- Add `QUINHomeChatWidget` as the first widget after stats bar (before NextBestActionCard)

**Modify: `src/components/clubhome/PartnerHome.tsx`**
- Add `QUINHomeChatWidget` after stats bar, before concierge card

**Modify: `src/components/clubhome/AdminHome.tsx`**
- Add `QUINHomeChatWidget` after stats bar, before quick management

### Phase 5: Smart System Prompts per Role

Each role gets a different system prompt personality:

**Candidate prompt focus:**
- Career advisor, interview coach, job search strategist
- Proactive about upcoming interviews, stalled applications, profile gaps
- References their specific applications, tasks, saved jobs by name
- Tone: Supportive, encouraging, actionable

**Partner prompt focus:**
- Recruitment operations assistant, hiring advisor
- Proactive about candidates needing attention, SLA breaches, pipeline bottlenecks
- References specific open roles, candidate shortlists, interview schedules
- Tone: Professional, data-driven, executive

**Admin prompt focus:**
- Platform intelligence officer, operations commander
- Proactive about system health, revenue trends, partner engagement dips
- References platform-wide metrics, at-risk relationships, growth trends
- Tone: Strategic, analytical, concise

## Technical Details

### Files to Create
| File | Purpose |
|---|---|
| `supabase/functions/quin-home-chat/index.ts` | Role-aware AI chat edge function |
| `src/components/clubhome/QUINHomeChatWidget.tsx` | Expandable chat widget for home pages |
| `src/hooks/useQUINHomeChat.ts` | Chat state management hook |

### Files to Modify
| File | Change |
|---|---|
| `src/components/clubhome/CandidateHome.tsx` | Add QUINHomeChatWidget |
| `src/components/clubhome/PartnerHome.tsx` | Add QUINHomeChatWidget |
| `src/components/clubhome/AdminHome.tsx` | Add QUINHomeChatWidget |
| `supabase/functions/_shared/ai-tools.ts` | Add role filtering + new admin/partner tools |
| `supabase/config.toml` | Register new edge function |

### No Database Changes Required
The existing tables (`ai_conversations`, `ai_memory`, `ai_action_log`, `ai_session_scores`) already support everything needed. The `user_roles` table provides role information.

### Performance Considerations
- Context fetching uses batched `Promise.all` queries (same pattern as `user-context-fetcher.ts`)
- Partner/admin contexts fetch company-scoped data using `company_members` join
- Streaming SSE for instant token display
- Conversations lazy-load on widget expand
- Voice reuses existing global `ClubAIVoice` infrastructure (no duplication)

### Security Model
- JWT authentication required (via `auth-helpers.ts`)
- Role verified server-side from `user_roles` table, never trusted from client
- Partner data scoped to their `company_id` via `company_members` join
- Admin verified via `has_role` check before exposing platform-wide data
- Candidate can never see other candidates' data
- Partner can never see data outside their company
- All tool executions logged to `ai_action_log`
