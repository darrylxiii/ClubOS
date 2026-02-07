# Implemented: Comprehensive Role-Based Data Access for Club AI

## Status: ✅ Complete

## Changes Made

### 1. Home Chat Hook (`src/hooks/useClubAIHomeChat.ts`)
- Added `userId: user.id` to request body so the edge function can fetch context

### 2. Role-Based Context (`supabase/functions/club-ai-chat/index.ts`)

**Admin/Strategist** gets full platform data appended:
- Placement fees (by status, totals)
- Moneybird invoices & financial metrics
- CRM pipeline (prospects by stage, deal values)
- Partner invoices
- Payment transactions
- Referral payouts
- Full talent pool (100 candidates)
- Platform KPIs
- All jobs & applications

**Partner** gets company-scoped data:
- Company jobs with applicant counts
- Applications to their company (with candidate names, stages)
- Company placement fees & invoices
- Team members
- Company KPIs

**Candidate** keeps existing comprehensive context + salary benchmarks

### 3. Tool Gating by Role

| Tool | Candidate | Partner | Admin |
|---|---|---|---|
| search_jobs | ✅ | ✅ | ✅ |
| apply_to_job | ✅ | ❌ | ✅ |
| generate_cover_letter | ✅ | ❌ | ✅ |
| search_talent_pool | ❌ | ❌ | ✅ |
| get_candidate_move_probability | ❌ | ❌ | ✅ |
| get_candidates_needing_attention | ❌ | ✅ | ✅ |
| log_candidate_touchpoint | ❌ | ✅ | ✅ |
| update_candidate_tier | ❌ | ❌ | ✅ |
| search_communications | ❌ | ✅ | ✅ |
| get_relationship_health | ❌ | ✅ | ✅ |
| All task/calendar/meeting tools | ✅ | ✅ | ✅ |
| navigate_to_page | ✅ | ✅ | ✅ |

### 4. System Prompt Role Awareness
- Admin: strategic, analytical tone; references ADMIN data sections
- Partner: professional, company-scoped; references PARTNER sections
- Candidate: supportive, career-focused; references personal data
