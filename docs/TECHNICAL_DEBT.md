# Technical Debt Tracker

This document tracks TODOs and technical debt items that need to be addressed. Items are prioritized by impact and estimated effort.

---

## High Priority

| ID | File | Line | Description | Impact | Est. Effort |
|----|------|------|-------------|--------|-------------|
| ~~TD-001~~ | ~~`src/services/adminCandidateService.ts`~~ | ~~170~~ | ~~Implement proper strategist fetching in getStrategists()~~ | ~~Critical for admin workflow~~ | ~~2h~~ | ✅ RESOLVED |
| ~~TD-002~~ | ~~`src/pages/ContractDetailPage.tsx`~~ | ~~115~~ | ~~Trigger payment release via edge function on milestone approval~~ | ~~Blocks contract payments~~ | ~~4h~~ | ✅ RESOLVED |

---

## Medium Priority

| ID | File | Line | Description | Impact | Est. Effort |
|----|------|------|-------------|--------|-------------|
| TD-003 | `src/components/meetings/MeetingAnalyticsDashboard.tsx` | 126 | Calculate actual meeting durations from database | Analytics accuracy | 1h |
| TD-004 | `src/hooks/useNextSteps.ts` | 88 | Fetch interview schedule count from interviews table | User dashboard completeness | 30m |
| TD-005 | `src/hooks/useNextSteps.ts` | 95 | Fetch referrals count from referrals table | User dashboard completeness | 30m |
| TD-006 | `src/hooks/useNextSteps.ts` | 96 | Check notification settings for configured status | User onboarding flow | 1h |
| TD-007 | `src/pages/ContractSignaturePage.tsx` | 57 | Get real IP address for signature tracking | Legal compliance | 2h |

---

## Low Priority

| ID | File | Line | Description | Impact | Est. Effort |
|----|------|------|-------------|--------|-------------|
| TD-008 | `src/utils/analyticsExport.ts` | 144 | Implement email scheduling via Edge Function | Nice-to-have feature | 3h |
| TD-009 | `src/components/partner/ExpandablePipelineStage.tsx` | 142 | Implement reschedule meeting dialog | User convenience | 2h |
| TD-010 | `src/pages/assessments/Incubator20.tsx` | 27 | Fetch user profile for better scenario personalization | Assessment quality | 1h |
| TD-011 | `src/pages/MeetingTemplates.tsx` | 64 | Fetch from actual meeting_templates table once schema updated | Feature completion | 1h |
| TD-012 | `src/pages/MessagingAnalytics.tsx` | 59 | Calculate actual response time from message timestamps | Analytics accuracy | 1h |
| TD-013 | `src/pages/ContractDetailPage.tsx` | 122 | Open modal for milestone revision feedback | User workflow | 2h |
| TD-014 | `src/pages/ContractDetailPage.tsx` | 127 | Open file upload modal for deliverables | User workflow | 2h |
| TD-015 | `src/pages/ContractDetailPage.tsx` | 131 | Open comments drawer for milestone discussions | User collaboration | 2h |
| TD-016 | `src/hooks/useAlgorithmicFeed.ts` | 176 | Get share count from post_shares table | Feed algorithm accuracy | 30m |

---

## Summary

- **Total Items:** 16
- **High Priority:** 2 (6h estimated)
- **Medium Priority:** 5 (5h estimated)
- **Low Priority:** 9 (14.5h estimated)
- **Total Estimated Effort:** ~25.5 hours

---

## Guidelines

1. Address high-priority items first as they block critical functionality
2. Bundle related items (e.g., TD-004, TD-005, TD-006 are all in useNextSteps.ts)
3. Update this document when items are completed or new debt is identified
4. Consider refactoring opportunities when addressing technical debt
