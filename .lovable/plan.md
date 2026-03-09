

# Full Candidate System Audit

## Scoring: 71/100

---

## Area-by-Area Breakdown

### 1. Club Home Dashboard (CandidateHome) — 82/100
**What works:**
- Clean 6-zone layout: NBA → Pipeline → Interview Countdown → AI Chat → Strategist → Discovery → Profile Strength
- All zones conditionally hide when irrelevant (no interview, no strategist, 100% profile)
- Real data from Supabase throughout — match_scores, bookings, messages, applications
- Strategist SLA computation is genuinely clever (message response delta calculation)
- Interview countdown with live tick, "Join" button when live

**Issues:**
- **CompactProfileStrength** uses raw `useEffect` + `setState` instead of `useQuery` — no caching, refetches on every mount (-2)
- **CompactStrategist** same pattern — raw async in useEffect, no error state (-2)
- **CompactInterviewCountdown** same — no error boundary, `.single()` throws if 0 rows returned (should use `.maybeSingle()`) (-3)
- **DiscoveryGrid ForYouColumn** uses `match_scores` but no fallback if matching hasn't run — just shows "Complete your profile" which is misleading if profile IS complete but no matches exist (-2)
- **MessagesColumn** doesn't use realtime subscription — stale on mount only (-1)
- No `formatLocation` usage anywhere in dashboard — raw location strings can leak JSON (-2)
- ClubAIHomeChatWidget is 245 lines, well-structured with voice support — solid

### 2. Applications Page — 78/100
**What works:**
- Real-time subscription for application updates (both `user_id` and `candidate_id` filters)
- Three tabs: Active / Rejected / Archived
- Rich ApplicationCard with strategist, competition insight, progression heatmap, timeline
- Mobile-specific pipeline component (`MobileApplicationPipeline`)
- Export to CSV per application
- Background refetch indicator (nice touch)

**Issues:**
- **No withdraw action** — candidate cannot withdraw an application from the UI (-5)
- `archivedApplications` filter is `status !== 'active' && status !== 'rejected'` — this catches `hired`, `withdrawn`, `closed` all in one bucket with no differentiation (-2)
- Hardcoded `averageDays = stages.length * 5` — always 25 days for 5-stage pipeline, not real data (-2)
- `window.location.href` used for mobile navigation instead of `navigate()` — causes full page reload (-2)
- No empty state illustration for rejected tab (just a component) — minor (-1)

### 3. Application Detail Page — 72/100
**What works:**
- Full pipeline visualization with expandable stages
- Strategist contact card, competition insight, timeline

**Issues:**
- **No withdraw button** on detail page either (-3)
- Uses `useParams` with `applicationId` but the route param is `:id` — potential mismatch (-3)
- No realtime subscription — relies on stale data from initial fetch (-2)
- Location strings not formatted with `formatLocation` (-1)

### 4. Jobs Page — 80/100
**What works:**
- Full-featured job search with filters, sorting, saved jobs, Club Sync
- Role-aware (candidate vs partner vs admin tabs)
- URL-based tab state for deep linking
- "For You" section with match scores
- Interview prep tab integrated
- Map view available

**Issues:**
- 848 lines in one file — should be decomposed further (-3)
- `jobs` state managed with `useState` + manual fetch instead of `useQuery` — no caching (-3)
- ClubSync toggle state is local, not persisted (-2)
- No pagination — loads all jobs at once (-2)

### 5. Settings Page — 75/100
**What works:**
- Comprehensive tabs: Profile, Compensation, Privacy, Security, Notifications, Calendar, Connections, Freelance, API, Communication
- Privacy settings with blocked companies and stealth mode
- GDPR controls (export + delete) via edge functions
- Resume upload modal
- Currency conversion support

**Issues:**
- 752 lines — monolithic, all state at top level (-3)
- No consent receipts viewer despite knowledge doc requiring it (-5)
- No "visibility toggles" per field (e.g., hide salary from clients) — only bulk stealth mode (-3)

### 6. Referrals Page — 77/100
**What works:**
- Full referral system: earnings, leaderboard, tiers, challenges, activity feed
- Company and member referral cards
- Share sheet and link generator
- Analytics tab with charts
- Revenue share info

**Issues:**
- No "projected vs realized rewards" distinction as specified in knowledge doc (-3)
- Role-aware but `isPartner` doesn't seem to restrict any UI — both admin and partner see everything (-2)

### 7. Onboarding (CandidateOnboarding + OAuthOnboarding) — 76/100
**What works:**
- OAuth onboarding redirects to `/club-home` on completion
- Account status check (approved vs pending)

**Issues:**
- No progressive profiling — unclear which fields are required vs optional (-3)
- No CV parse step in onboarding flow (knowledge doc says "CV parse" should be part of onboard) (-4)
- No calendar connect step in onboarding (-3)

### 8. Interview Prep — 74/100
**Issues:**
- Route redirects to `/jobs?tab=interview-prep` — tab inside Jobs page, not standalone (-2)
- Chat session route exists but no clear entry point from application cards (-3)

### 9. Data Integrity & Privacy — 65/100
**Critical gaps:**
- **No consent receipts viewer** in candidate UI (-8)
- **`formatLocation` only used in 2 avatar components** — not in Jobs, Applications, Profile, or Dashboard (-5)
- **No field-level visibility toggles** (share salary, share email, share phone individually) (-5)
- **No employer shield UI** — blocked companies exist in settings but no indication of what it actually blocks (-3)
- `candidate_profiles` queried with `.eq('id', user.id)` in CompactStrategist — but `id` might be different from `user_id` depending on schema (-2)

### 10. Club Pilot — 70/100
- Page exists and renders `PilotDashboard`
- Not audited in detail but is a separate system

---

## Summary Table

| Area | Score | Top Issue |
|------|-------|-----------|
| Club Home Dashboard | 82 | useEffect instead of useQuery, no formatLocation |
| Applications Page | 78 | No withdraw action, hardcoded averages |
| Application Detail | 72 | No withdraw, possible param mismatch |
| Jobs Page | 80 | Monolithic, no pagination, no useQuery |
| Settings | 75 | No consent receipts viewer, no field-level visibility |
| Referrals | 77 | No projected vs realized rewards |
| Onboarding | 76 | No CV parse or calendar connect steps |
| Interview Prep | 74 | Hidden in Jobs tab, unclear entry point |
| Data Integrity/Privacy | 65 | Missing consent viewer, formatLocation gaps |
| **Overall** | **71/100** | |

---

## Fix Plan to 100/100

### Priority 1: Security & Privacy (71 → 82)
1. Add consent receipts viewer to Settings (new tab or section under Privacy)
2. Add field-level visibility toggles (salary, email, phone) to Privacy settings
3. Apply `formatLocation()` everywhere location strings are displayed (Dashboard, Jobs, Applications, ApplicationDetail)
4. Fix `.single()` → `.maybeSingle()` in CompactInterviewCountdown to prevent throws on 0 rows
5. Verify `candidate_profiles` ID vs user_id column usage in CompactStrategist

### Priority 2: Core Candidate Actions (82 → 90)
6. Add "Withdraw Application" action to ApplicationDetail and ApplicationCard
7. Fix `useParams` — verify route param name matches (`:id` vs `applicationId`)
8. Replace `window.location.href` with `navigate()` in MobileApplicationPipeline
9. Add realtime subscription to ApplicationDetail page
10. Split archived tab into Hired / Withdrawn / Closed sub-sections

### Priority 3: Data Quality & Performance (90 → 95)
11. Convert CompactProfileStrength, CompactStrategist, CompactInterviewCountdown to use `useQuery`
12. Convert Jobs page from `useState`+fetch to `useQuery` with pagination
13. Add realtime subscription to MessagesColumn in DiscoveryGrid
14. Replace hardcoded `averageDays = stages * 5` with actual stage duration data

### Priority 4: Feature Completeness (95 → 100)
15. Add "projected vs realized" labels to Referrals earnings
16. Add CV parse + calendar connect steps to onboarding flow
17. Add clear interview prep entry point from ApplicationCard (link to session with job context)
18. Add employer shield explanation UI in Privacy settings
19. Fix ForYouColumn empty state to distinguish "no matches yet" from "profile incomplete"

I recommend tackling Priority 1 and 2 together first — they address real user-facing bugs and privacy gaps.

