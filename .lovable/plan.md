

# Fix: Candidate Profiles 404 -- Missing Route

## Root Cause

The route `/candidates/:id` does not exist anywhere in the routing configuration. Multiple components (7+) navigate to this path, but it was never defined.

The routes that DO exist:
- `/candidate/:candidateId` renders `UnifiedCandidateProfile` (in `shared.routes.tsx`)
- `/candidate-profile/:candidateId` renders `CandidateProfile` (in `profiles.routes.tsx`)
- `/admin/candidates` renders `AdminCandidates` list page (in `admin.routes.tsx`)

The components that navigate to the BROKEN `/candidates/:id` path:
1. `CandidatesAtRiskPanel.tsx` -- Job dashboard "at risk" panel
2. `CandidateLeaderboard.tsx` -- Job dashboard leaderboard
3. `TalentRecommendations.tsx` -- Partner talent recommendations
4. `CandidateShortlistWidget.tsx` -- Partner shortlist widget
5. `CommunicationNotificationBell.tsx` -- Notification bell click
6. `WhatsAppCandidateContextCard.tsx` -- WhatsApp context card
7. `PartnerRelationships.tsx` -- Partner relationships page

## Fix

Two-part fix:

### Part 1: Add a redirect route (safety net)

In `profiles.routes.tsx`, add a redirect route so any link to `/candidates/:id` resolves:

```
/candidates/:id  -->  redirect to /candidate/:id
```

This ensures existing links, bookmarks, and any future missed references still work.

### Part 2: Fix all navigation calls at the source

Update all 7 components to use the correct `/candidate/${id}` path (singular, matching the actual route) instead of `/candidates/${id}` (plural). This is the proper fix so the redirect is only a fallback.

Files to update:
- `src/components/job-dashboard/CandidatesAtRiskPanel.tsx`
- `src/components/job-dashboard/CandidateLeaderboard.tsx`
- `src/components/partner/TalentRecommendations.tsx`
- `src/components/partner/CandidateShortlistWidget.tsx`
- `src/components/communication/CommunicationNotificationBell.tsx`
- `src/components/whatsapp/WhatsAppCandidateContextCard.tsx`
- `src/pages/PartnerRelationships.tsx`

Each change is a single-line find-and-replace: `/candidates/` to `/candidate/`.

### Part 3: Also fix `/admin/candidates/:id`

In `TalentPoolListDetail.tsx`, the navigation uses `/admin/candidates/${candidate.id}` which also has no route. Fix this to `/candidate/${candidate.id}` as well.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/routes/profiles.routes.tsx` | Add redirect: `/candidates/:id` to `/candidate/:id` |
| `src/components/job-dashboard/CandidatesAtRiskPanel.tsx` | `/candidates/` to `/candidate/` |
| `src/components/job-dashboard/CandidateLeaderboard.tsx` | `/candidates/` to `/candidate/` |
| `src/components/partner/TalentRecommendations.tsx` | `/candidates/` to `/candidate/` |
| `src/components/partner/CandidateShortlistWidget.tsx` | `/candidates/` to `/candidate/` |
| `src/components/communication/CommunicationNotificationBell.tsx` | `/candidates/` to `/candidate/` |
| `src/components/whatsapp/WhatsAppCandidateContextCard.tsx` | `/candidates/` to `/candidate/` |
| `src/pages/PartnerRelationships.tsx` | `/candidates/` to `/candidate/` |
| `src/pages/TalentPoolListDetail.tsx` | `/admin/candidates/` to `/candidate/` |

No database changes needed. This is purely a routing and navigation fix.

