# Technical Debt Tracker

This document tracks TODOs and technical debt items that need to be addressed. Items are prioritized by impact and estimated effort.

---

## High Priority

| ID | File | Line | Description | Impact | Est. Effort | Status |
|----|------|------|-------------|--------|-------------|--------|
| ~~TD-001~~ | ~~`src/services/adminCandidateService.ts`~~ | ~~170~~ | ~~Implement proper strategist fetching in getStrategists()~~ | ~~Critical for admin workflow~~ | ~~2h~~ | ✅ RESOLVED |
| ~~TD-002~~ | ~~`src/pages/ContractDetailPage.tsx`~~ | ~~115~~ | ~~Trigger payment release via edge function on milestone approval~~ | ~~Blocks contract payments~~ | ~~4h~~ | ✅ RESOLVED |

---

## Medium Priority

| ID | File | Line | Description | Impact | Est. Effort | Status |
|----|------|------|-------------|--------|-------------|--------|
| ~~TD-003~~ | ~~`src/components/meetings/MeetingAnalyticsDashboard.tsx`~~ | ~~119-143~~ | ~~Calculate actual meeting durations from database~~ | ~~Analytics accuracy~~ | ~~1h~~ | ✅ RESOLVED |
| ~~TD-004~~ | ~~`src/hooks/useNextSteps.ts`~~ | ~~75-79~~ | ~~Fetch interview schedule count from interviews table~~ | ~~User dashboard completeness~~ | ~~30m~~ | ✅ RESOLVED |
| ~~TD-005~~ | ~~`src/hooks/useNextSteps.ts`~~ | ~~80-83~~ | ~~Fetch referrals count from referrals table~~ | ~~User dashboard completeness~~ | ~~30m~~ | ✅ RESOLVED |
| ~~TD-006~~ | ~~`src/hooks/useNextSteps.ts`~~ | ~~84-88~~ | ~~Check notification settings for configured status~~ | ~~User onboarding flow~~ | ~~1h~~ | ✅ RESOLVED |
| ~~TD-007~~ | ~~`src/pages/ContractSignaturePage.tsx`~~ | ~~52-73~~ | ~~Get real IP address for signature tracking~~ | ~~Legal compliance~~ | ~~2h~~ | ✅ RESOLVED |

---

## Low Priority

| ID | File | Line | Description | Impact | Est. Effort | Status |
|----|------|------|-------------|--------|-------------|--------|
| TD-008 | `src/utils/analyticsExport.ts` | 144 | Implement email scheduling via Edge Function | Nice-to-have feature | 3h | Pending |
| ~~TD-009~~ | ~~`src/components/partner/ExpandablePipelineStage.tsx`~~ | ~~279-291~~ | ~~Implement reschedule meeting dialog~~ | ~~User convenience~~ | ~~2h~~ | ✅ RESOLVED |
| TD-010 | `src/pages/assessments/Incubator20.tsx` | 27 | Fetch user profile for better scenario personalization | Assessment quality | 1h | Pending |
| TD-011 | `src/pages/MeetingTemplates.tsx` | 64 | Fetch from actual meeting_templates table once schema updated | Feature completion | 1h | Pending |
| ~~TD-012~~ | ~~`src/pages/MessagingAnalytics.tsx`~~ | ~~57-104~~ | ~~Calculate actual response time from message timestamps~~ | ~~Analytics accuracy~~ | ~~1h~~ | ✅ RESOLVED |
| TD-013 | `src/pages/ContractDetailPage.tsx` | 122 | Open modal for milestone revision feedback | User workflow | 2h | Pending |
| TD-014 | `src/pages/ContractDetailPage.tsx` | 127 | Open file upload modal for deliverables | User workflow | 2h | Pending |
| TD-015 | `src/pages/ContractDetailPage.tsx` | 131 | Open comments drawer for milestone discussions | User collaboration | 2h | Pending |
| ~~TD-016~~ | ~~`src/hooks/useAlgorithmicFeed.ts`~~ | ~~31-47~~ | ~~Get share count from post_reposts table~~ | ~~Feed algorithm accuracy~~ | ~~30m~~ | ✅ RESOLVED |

---

## Summary

- **Total Items:** 16
- **Resolved:** 11 ✅
- **Remaining:** 5
  - **High Priority:** 0 (all resolved)
  - **Medium Priority:** 0 (all resolved)
  - **Low Priority:** 5 (9h estimated)
- **Total Remaining Effort:** ~9 hours

---

## Phase 4 Completion Notes

All critical and medium-priority technical debt has been resolved:

1. **TD-003** - Meeting duration now calculated from `meeting_analytics` table or scheduled start/end times
2. **TD-004/05/06** - `useNextSteps.ts` now fetches real interview counts, referral counts, and notification preferences
3. **TD-007** - Contract signature page fetches real IP via ipify API with fallbacks
4. **TD-009** - `RescheduleDialog` component integrated into pipeline stage
5. **TD-012** - Messaging analytics calculates actual response times from message timestamps
6. **TD-016** - Algorithmic feed fetches real share counts from `post_reposts` table

---

## Guidelines

1. Address high-priority items first as they block critical functionality
2. Bundle related items (e.g., TD-013, TD-014, TD-015 are all in ContractDetailPage.tsx)
3. Update this document when items are completed or new debt is identified
4. Consider refactoring opportunities when addressing technical debt
