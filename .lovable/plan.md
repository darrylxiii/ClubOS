

# Add 3 New Widgets to Candidate Home

## Changes

### 1. Fix full-width layout
**File:** `src/components/clubhome/CandidateHome.tsx`
Remove `max-w-4xl mx-auto` from the container div so the page uses the full available width.

### 2. Create Upcoming Meetings Widget
**File:** `src/components/clubhome/UpcomingMeetingsWidget.tsx` (NEW)

- Query `bookings` table for the current user's next 3 upcoming meetings (interviews, strategist calls) where `scheduled_start >= now` and status is `confirmed` or `pending`
- Join `jobs` table for job title and `companies` for company name
- Show each meeting as a compact card: title, company, date/time, countdown ("in 2 hours"), and a "Join" button if `video_meeting_link` or `quantum_meeting_link` exists
- Empty state: "No upcoming meetings" with subtle text
- Use `useQuery` with 60s staleTime

### 3. Create Application Activity Feed
**File:** `src/components/clubhome/ApplicationActivityFeed.tsx` (NEW)

- Query `applications` for the current user (using the `or(user_id, candidate_id)` pattern) ordered by `updated_at` desc, limit 8
- Show a compact timeline of recent changes: stage badge, job title, company name, and relative time ("2h ago")
- Use color-coded stage badges (applied=blue, interview=purple, offer=green, rejected=red)
- Empty state: "No recent activity on your applications"
- Use `useQuery` with staleTime 60s

### 4. Add Referral Widget
**File:** `src/components/clubhome/ReferralNetworkWidget.tsx` (EXISTS)

Already built with placeholder data. Add it directly to CandidateHome — no changes needed to the widget itself since it gracefully handles zero-state.

### 5. Update CandidateHome layout
**File:** `src/components/clubhome/CandidateHome.tsx`

- Remove `max-w-4xl mx-auto`
- Add `UpcomingMeetingsWidget` after `CompactInterviewCountdown` (Zone 2.5 — meetings context)
- Add `ApplicationActivityFeed` after `ClubAIHomeChatWidget` (Zone 3.5 — activity context)
- Add `ReferralNetworkWidget` after `DiscoveryGrid` (Zone 5.5 — engagement/growth)
- All three wrapped in `ScrollReveal`

## Files
| File | Action |
|------|--------|
| `src/components/clubhome/UpcomingMeetingsWidget.tsx` | CREATE |
| `src/components/clubhome/ApplicationActivityFeed.tsx` | CREATE |
| `src/components/clubhome/CandidateHome.tsx` | Edit — remove max-w, add 3 widgets |

