
# Candidate Experience Audit v2 -- The Quantum Club

## Overall Score: 68/100 (up from 52)

Phase 1 fixes landed successfully. The home page is clean and focused. Application persistence, onboarding redirect, and dynamic profile completeness are working. Below is a re-scored breakdown with the updated roadmap to 100.

---

## Scoring Breakdown

### 1. Onboarding Flow (8/10) -- up from 7

**Fixed since last audit:**
- Redirect now goes to `/club-home` (confirmed in OAuthOnboarding.tsx line 467)

**Still missing:**
- No calendar connection step (spec requires it)
- No LinkedIn/SSO auto-fill of professional fields
- `dream_job_title` collected but unused downstream
- No employer shield prompt during onboarding ("Block your current employer from seeing you")

### 2. Dashboard / Club Home (8/10) -- up from 4

**Fixed since last audit:**
- Complete redesign: 6 focused sections instead of 20+ collapsed widgets
- PipelineSnapshot with stage buckets (Applied/Interview/Final)
- DiscoveryGrid (For You / Saved / Messages) with real data
- CompactStrategist hidden when none assigned
- CompactInterviewCountdown only visible within 7 days
- CompactProfileStrength hidden at 100%

**Still missing:**
- NextBestActionCard checks only 4 profile fields for completeness (line 50), while CompactProfileStrength checks 10 -- inconsistent logic
- NextBestActionCard queries `candidate_id` for application count (line 93) but applications may only have `user_id` set -- could show "Browse Jobs" even when user has applications
- No notification badge on the home page for unread items beyond the Messages column count

### 3. Job Discovery and Application (7/10) -- up from 6

**Fixed since last audit:**
- `handleApply` in Jobs.tsx now creates real database records (lines 287-310)
- Duplicate check before insert

**Still missing:**
- Match scores still calculated lazily (first 5 jobs without scores, 1s delay) -- most jobs show no score on initial load
- InterviewPrepTabContent only renders for admin/partner role (tab is absent from candidate navigation)
- Competition insight still uses fabricated split: `candidatesAhead: Math.floor(count * 0.3)` in ApplicationDetail/Applications
- `averageResponseTime` removed from Applications.tsx but may still exist in ApplicationDetail.tsx

### 4. Application Pipeline Tracking (7/10) -- up from 5

**Fixed since last audit:**
- Real-time Supabase subscription for stage updates (lines 66-100 of Applications.tsx)
- Interview Prep button added to application cards (line 287-293)
- `useApplications` now queries with `.or(user_id, candidate_id)` 

**Still missing:**
- "Share link" copies `/applications/:id/share` URL with no corresponding route handler
- Competition insight data still fabricated
- Stage preparation resources (`currentStage.preparation?.resources`) rarely populated from pipeline_stages metadata
- No push notification when stage changes (realtime only updates the page if already open)

### 5. Profile and Settings (7/10) -- up from 6

**Fixed since last audit:**
- OfferComparison uses `useProfile()` for preferred currency (line 34-35)

**Still missing:**
- EnhancedProfile.tsx still hardcodes profile completeness to 75% (line 377) -- never dynamically calculated
- Privacy settings: blocked companies stored as string array, no validation against company IDs
- No "who sees what" preview -- candidates toggle privacy fields without seeing how their profile appears to recruiters
- Settings page mixes auto-save (debounced) with explicit save buttons -- inconsistent UX
- No visual indicator distinguishing recruiter-visible vs hidden fields in profile view

### 6. Interview Preparation (4/10) -- up from 3

**Fixed since last audit:**
- STAR answers now persist to `interview_prep_answers` table (lines 102-118 of InterviewPrep.tsx)
- Query fixed with `.or(user_id, candidate_id)`

**Still missing:**
- Practice questions remain entirely hardcoded generic strings (lines 121-149) -- not tailored to the JD, company, or role
- No AI-powered question generation (spec requires JD-aware Q&A)
- No panel briefing (interviewer names, LinkedIn, preferences)
- No "7 smart questions to ask" generation
- Previously saved STAR answers are not loaded back when returning to the page -- only insert, no fetch
- Interview prep not linked from the pipeline stage cards in ApplicationDetail.tsx (only from the application list header actions)
- SelfBookingWidget and PrepBriefCard imported but their data sources are unclear

### 7. Offer Management (6/10) -- up from 5

**Fixed since last audit:**
- User currency from `useProfile()` instead of hardcoded EUR

**Still missing:**
- After-tax estimate exists but only for Netherlands (CompensationBreakdown.tsx line 218) -- not a proper multi-country simulator
- No equity vesting calculator or total-comp comparison over time
- No decision timer visible to candidate (spec requires countdown to offer expiry)
- No offer history timeline showing changes/counter-offers
- Negotiation chat appears disconnected from actual offer record updates

### 8. Referral System (7/10) -- unchanged

**Issues remain:**
- "Refer a Member" and "Claim Company" buttons both open ClaimReferralDialog
- Projected vs realized rewards distinction not clear in UI

### 9. Privacy and Security (8/10) -- up from 7

**Improved:**
- GDPR deletion flow EXISTS (GDPRControls.tsx) -- invokes `gdpr-delete` edge function with schedule/cancel
- GDPR export flow EXISTS -- invokes `gdpr-export` edge function
- Consent receipts table exists in DB (`consent_receipts`) with proper service layer (consentService.ts)

**Still missing:**
- Consent receipts UI not exposed to candidates (no page/section showing "what was shared, when, with whom")
- Employer shield not surfaced during onboarding
- No "who can see what" visual preview for privacy toggles
- Blocked companies stored as names (strings), not validated against company_id records

### 10. Candidate-Facing Communication (4/10) -- up from 2

**What works (already existed but undervalued in previous audit):**
- Messages page is full-featured: conversation list, message bubbles, thread view, typing indicators, read receipts, online status, audio/video calls, group info panel, system messages, message editing, message load-more pagination
- Email inbox page exists (Inbox.tsx wraps EmailInbox component)
- Strategist contact on home page with direct message CTA

**Still missing:**
- No unified inbox threading separating system/strategist/partner channels
- No SLA indicator ("Your strategist typically replies within 4 hours")
- No push notification when application stage changes (only realtime on the Applications page)
- No notification center/bell icon with unread count in the main navigation
- `lastContact` in StrategistContactCard data source unclear -- likely still static/missing
- No WhatsApp communication channel for candidates (exists only admin-side)

---

## Updated Roadmap to 100/100

### Phase 2A: Data Integrity and Consistency (68 -> 74)

| # | Task | Impact | Effort |
|---|---|---|---|
| 1 | Align NextBestActionCard profile check to use same 10-field logic as CompactProfileStrength | Medium | Tiny |
| 2 | Fix NextBestActionCard to query `.or(user_id, candidate_id)` for application count | High | Tiny |
| 3 | Fix EnhancedProfile.tsx hardcoded 75% -- compute dynamically from real fields | Medium | Small |
| 4 | Load previously saved STAR answers when returning to InterviewPrep page | Medium | Small |
| 5 | Remove fabricated competition data (candidatesAhead 30/70 split) -- show real counts or hide section | Medium | Small |
| 6 | Remove or implement `/applications/:id/share` route | Low | Small |

### Phase 2B: AI-Powered Interview Prep (74 -> 80)

| # | Task | Impact | Effort |
|---|---|---|---|
| 7 | Generate JD-aware interview questions via edge function (use Gemini 2.5 Flash, pass JD + company + role) | High | Medium |
| 8 | Generate "7 smart questions to ask the interviewer" per application | High | Small |
| 9 | Add interviewer panel briefing section (pull from job pipeline_stages owner data) | Medium | Medium |
| 10 | Link interview prep directly from pipeline stage cards in ApplicationDetail.tsx | Medium | Tiny |

### Phase 2C: Notifications and Communication (80 -> 86)

| # | Task | Impact | Effort |
|---|---|---|---|
| 11 | Add notification bell icon with unread count in main app header | High | Medium |
| 12 | Send in-app notification when application stage changes (via DB trigger or realtime) | High | Medium |
| 13 | Show strategist SLA indicator ("Typically replies within X hours") computed from actual message response times | Medium | Medium |
| 14 | Add candidate-accessible consent receipts viewer (table of "what was shared, when, with whom") | Medium | Medium |

### Phase 3: Premium Polish (86 -> 93)

| # | Task | Impact | Effort |
|---|---|---|---|
| 15 | Multi-country after-tax offer simulator (NL, UK, DE, US at minimum) with equity vesting timeline | High | Large |
| 16 | Offer decision timer (countdown to expiry date, visible on offer cards) | Medium | Small |
| 17 | "Who sees what" privacy preview -- render anonymized profile as recruiter would see it | High | Medium |
| 18 | Employer shield onboarding step -- prompt candidate to block current employer domain | Medium | Small |
| 19 | Validate blocked companies against actual company records (autocomplete from companies table) | Low | Small |
| 20 | Compute match scores eagerly for all visible jobs instead of lazy 5-at-a-time | Medium | Medium |
| 21 | Add calendar connection step to onboarding flow | Medium | Medium |
| 22 | Fix referral dialogs: separate "Refer a Member" from "Claim Company" | Low | Small |

### Phase 4: World-Class Differentiators (93 -> 100)

| # | Task | Impact | Effort |
|---|---|---|---|
| 23 | Voice-based mock interview with ElevenLabs (candidate speaks, AI evaluates, transcript + score persisted) | High | Large |
| 24 | AI-generated panel briefing with interviewer LinkedIn intelligence (scrape-free -- use company data + job owner fields) | High | Large |
| 25 | Proactive QUIN nudges ("Your notice period ends in 2 weeks -- update your availability") | Medium | Medium |
| 26 | Strategist SLA timer with escalation ("48h without response -- escalating to manager") | Medium | Medium |
| 27 | Calendar bi-directional sync with buffer enforcement and quiet hours | Medium | Large |
| 28 | Progressive profiling prompts (contextual nudges to complete profile fields based on current activity, never blocking) | Low | Medium |

---

## Competitor Gap Analysis

| Capability | TQC Status | Hired.com | Riviera Partners | Underdog.io |
|---|---|---|---|---|
| AI match scoring | Working (lazy) | Basic | Manual | Basic |
| Interview AI coaching | Generic questions only | None | None | None |
| Voice mock interviews | Not built | None | None | None |
| After-tax offer comparison | NL only | None | None | None |
| Privacy controls (stealth) | Strong (3 levels) | Basic | None | None |
| Referral gamification | Strong | Basic | None | Moderate |
| Real-time pipeline updates | Working | Slow | Manual email | Manual |
| Strategist SLA tracking | Not built | None | Manual | None |
| Consent receipts (GDPR) | DB exists, no UI | Basic | None | None |
| AI panel briefing | Not built | None | Premium tier | None |

The system already has strong foundations that no competitor matches (stealth mode, consent receipts in DB, referral gamification, real-time pipeline). The gaps are in **AI intelligence** (interview prep, panel briefing, nudges) and **communication transparency** (SLA tracking, notification center, consent viewer). Completing Phases 2A-2C brings you to 86, which is already best-in-class. Phases 3-4 create the moat that justifies a $1B valuation -- no other platform offers voice mock interviews, multi-country after-tax simulators, and proactive career nudges in a single candidate experience.
