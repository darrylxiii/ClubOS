

# World-Class Partner CRO: Maximize Role Creation

## Strategy

Every surface the partner touches should reduce friction to posting a role, create urgency to act, and reinforce the value of having roles live. This goes beyond button placement — it's about behavioral triggers, zero-state exploitation, social proof, and removing every possible step between "I need someone" and "role is live."

---

## 8 Interventions

### 1. Hero CTA in PartnerActionStrip — "New Role" becomes the dominant element
**File:** `src/components/clubhome/partner/PartnerActionStrip.tsx`

- Move "New Role" to the LEFT (first element, before status pills) — F-pattern scanning means left = seen first
- Upgrade from `Button size="sm"` to `RainbowButton` with `Plus` icon — this is the single most important action a partner can take
- Remove the "Messages" button (already in sidebar nav, strategist strip, and radial menu — triple redundancy)
- Add micro-copy beneath when `activeJobs === 0`: "Get candidates in 48h"

### 2. Add "New Role" to Radial Menu (global FAB access)
**File:** `src/config/radial-menu-items.ts`

- Add `{ id: "new-role", label: "New Role", icon: Plus, actionType: "navigate", path: "/company-jobs/new" }` as the FIRST custom item in `PARTNER_ITEMS` (after shared Voice Memo + Club AI)
- Replace "Shortlist" (links to phantom `/partner/shortlist`) with this — shortlist doesn't exist as a real feature

### 3. Stats Bar zero-state intervention
**File:** `src/components/clubhome/UnifiedStatsBar.tsx`

- When `stats.activeJobs === 0`: replace the "Active Jobs" MetricCard with a special CTA-styled card — accent border, pulsing dot, text "Post your first role" instead of showing "0"
- Link it to `/company-jobs/new` instead of `/jobs?filter=company` (which shows nothing when empty)
- When `stats.totalApplications === 0` AND `stats.activeJobs === 0`: show "Post a role to start receiving applications" on the Applications card

### 4. OpenRolesSummary — upgrade header CTA + empty state
**File:** `src/components/clubhome/partner/OpenRolesSummary.tsx`

- Header "New Role" button: change from `variant="ghost" size="sm" className="text-xs"` to `variant="default" size="sm"` — make it visible
- Empty state: change from outline button to `RainbowButton` with copy "Post a Role — get candidates in 48h"
- Add social proof line: "Partners typically receive their first shortlist within 48 hours"

### 5. HiringPipelineOverview — empty state becomes a conversion surface
**File:** `src/components/clubhome/HiringPipelineOverview.tsx`

- Empty state currently shows passive text "Pipeline data will appear when you have active applications"
- Replace with: icon + "Your hiring pipeline starts here" + `RainbowButton` "Post Your First Role" + sub-text "We'll source, screen, and present candidates — you just review"
- When pipeline HAS data but few roles: add a subtle link at bottom "Add another role to grow your pipeline"

### 6. Activity Feed + Schedule — empty states with role CTAs
**Files:** `PartnerActivityFeedUnified.tsx`, `UpcomingScheduleWidget.tsx`

- Activity Feed empty: change from passive "No recent activity" to "Post a role to see applications, interviews, and updates here" with a secondary outline CTA
- Schedule empty: keep the green "Clear schedule" but add a line below: "Interviews are automatically scheduled once candidates are shortlisted" — this educates the partner on the value chain and reduces perceived effort

### 7. No-company fallback card in PartnerHome
**File:** `src/components/clubhome/PartnerHome.tsx`

- When `companyId` is null, Zones 2-5 render nothing — partner sees only stats bar and action strip (which also may be empty)
- Add a welcome/onboarding card: "Welcome to The Quantum Club" + "Complete your company setup to start hiring" + CTA to `/partner-setup` or contact strategist
- This catches edge cases where provisioning partially completed

### 8. Strategist strip — add contextual role CTA
**File:** `src/components/clubhome/partner/PartnerStrategistStrip.tsx`

- When strategist IS assigned: add a third action "Discuss a Role" that links to `/messages` with pre-filled context (or just `/company-jobs/new`)
- When strategist is NOT yet assigned: change copy to "Your strategist will help you define your first role — post one now to get started" with a CTA

---

## Summary of Touch Points After Changes

| Surface | Current CTAs | After |
|---------|-------------|-------|
| Stats Bar (Zone 0) | 0 | 1-2 (zero-state CTAs) |
| Action Strip (Zone 1) | 1 small right-aligned | 1 prominent RainbowButton, left-aligned |
| Strategist Strip (Zone 2) | 0 | 1 contextual |
| Pipeline empty (Zone 3L) | 0 | 1 RainbowButton + value prop |
| Open Roles empty (Zone 3R) | 1 outline | 1 RainbowButton + social proof |
| Activity empty (Zone 4) | 0 | 1 secondary CTA |
| Schedule empty (Zone 5) | 0 | 1 educational nudge |
| Radial Menu (global) | 0 | 1 (always accessible) |
| No-company state | 0 | 1 onboarding card |

**Total: from 2 weak CTAs to 9 contextual, behaviorally-triggered conversion surfaces.**

---

## Files to Change (8 files)

1. `src/components/clubhome/partner/PartnerActionStrip.tsx` — RainbowButton left-aligned, remove Messages
2. `src/config/radial-menu-items.ts` — add "New Role" to PARTNER_ITEMS
3. `src/components/clubhome/UnifiedStatsBar.tsx` — zero-state CTA cards
4. `src/components/clubhome/partner/OpenRolesSummary.tsx` — upgrade CTA + social proof
5. `src/components/clubhome/HiringPipelineOverview.tsx` — conversion empty state
6. `src/components/clubhome/partner/PartnerActivityFeedUnified.tsx` — CTA empty state
7. `src/components/clubhome/partner/UpcomingScheduleWidget.tsx` — educational nudge
8. `src/components/clubhome/partner/PartnerStrategistStrip.tsx` — contextual role CTA
9. `src/components/clubhome/PartnerHome.tsx` — no-company fallback card

