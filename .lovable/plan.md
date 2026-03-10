

# Batch 4–6: Remaining Audit Fixes (75 → 85/100)

Given the scale (463 `useState<any>`, 592 `as any`, 2645 `.single()`), a full elimination is unrealistic in one pass. This plan targets the **highest-impact subset** — files users actually hit — across three focused batches.

---

## Batch 4A: More `.single()` → `.maybeSingle()` (Top 20 remaining files)

Filter-based lookups that crash on empty results. Target files from the search results that were NOT fixed in prior passes:

| File | Dangerous call |
|------|---------------|
| `SkillDemandWidget.tsx` | `.eq('id', user.id).single()` |
| `RecordingPlaybackPage.tsx` | `.eq('id', rec.meeting_id).single()` (×2) |
| `CandidatePipelineStatus.tsx` | `.eq('id', candidateId).single()` (×2) |
| `RescheduleMeetingDialog.tsx` | `.eq('id', bookingId).single()` |
| `MeetingQAPanel.tsx` | `.eq('participant_id', ...).single()` |
| `useGlobalCallSignaling.ts` | `.eq('id', inv.caller_id).single()` |
| `useRelationshipHealth.ts` | `.eq('entity_id', id).single()` |
| `useNoShowPrediction.ts` | filter-based `.single()` |
| `useMeetingIntelligence.ts` | `.eq('meeting_id', ...).single()` |
| `useDepreciationLedger.ts` | `.eq('period_month', month).single()` |
| `ShareRecordingDialog.tsx` | `.select('share_token').single()` on insert — keep |
| `ModuleQuiz.tsx` | `.eq('id', quizId).single()` — PK lookup, keep |
| `CreateContractPage.tsx` | `.eq('id', user.id).single()` |
| `InviteAcceptance.tsx` | `.eq('invitation_token', token).single()` |
| `MilestoneCommentsDrawer.tsx` | `.eq('id', payload.new.id).single()` — realtime, keep |
| `CandidateOnboardingSteps.tsx` | `.eq('id', authData.user.id).single()` + `.eq('setting_key', ...).single()` |

**Rule**: Keep `.single()` for `insert().select().single()` and PK `id` lookups. Convert all filter-based (slug, user_id, email, token, entity_id) to `.maybeSingle()`.

~15 files changed.

---

## Batch 4B: Silent catch blocks → toast.error() (Remaining pages)

Pages where `catch` has only `console.error` and no toast yet:

| File | Silent catches |
|------|---------------|
| `PersonalMeetingRoom.tsx` | `loadPMR` — already has toast ✓, but `generateQRCode` (line 80) is silent |
| `AcademyCreatorHub.tsx` | data load catch blocks |
| `CareerInsightsDashboard.tsx` | `loadInsights` catch |
| `CourseDetail.tsx` | progress/cert fetch catches |
| `ContractListPage.tsx` | data fetch catch |
| `ClientAnalyticsPage.tsx` | query catch |

Add `toast.error("Something went wrong. Please try again.")` after every `console.error` in catch blocks.

~6 files changed.

---

## Batch 5: Widget graceful degradation

Components that `return null` on error/empty, making sections vanish without explanation:

| Component | Current | Fix |
|-----------|---------|-----|
| `CompanyMLInsights.tsx` | `useState<any>(null)` + loading only | Add error state with "ML insights unavailable" inline message |
| `InterviewerAICoach.tsx` | `useState<any>(null)` | Add error handling + "Coach unavailable" fallback |
| `InstantMeetingButton.tsx` | `useState<any[]>([])` | Add toast on template load failure |
| `MeetingIntelligenceCard` | Already fixed ✓ | — |

~3 files changed.

---

## Batch 6: ErrorState on remaining data pages

Pages that still show blank/infinite-loader on error (not yet wired with `ErrorState`):

| Page | Issue |
|------|-------|
| `PersonalMeetingRoom.tsx` | Shows skeleton forever on error |
| `BookingManagement.tsx` | Already has toast but no error card |
| `SchedulingSettings.tsx` | Shows skeleton forever on error |
| `MessagingAnalytics.tsx` | Blank on error |
| `CandidateAnalytics.tsx` | Returns null if no data |
| `Post.tsx` | Has `notFound` but no generic error state |
| `AcademyCreatorHub.tsx` | Blank on error |

Add `fetchError` state + `<ErrorState>` render before loading skeleton in each page.

~7 files changed.

---

## Summary

| Batch | What | Files | Impact |
|-------|------|-------|--------|
| 4A | `.single()` → `.maybeSingle()` wave 2 | ~15 | Prevents crashes |
| 4B | Silent catches → toasts | ~6 | User sees failures |
| 5 | Widget degradation | ~3 | No vanishing sections |
| 6 | ErrorState wiring | ~7 | No infinite loaders |

**Total: ~31 files. Score: 75 → 85.**

The remaining 15 points (type safety `any` elimination + useQuery migration) require deeper refactoring of 50+ files and should be tackled as a separate dedicated effort.

