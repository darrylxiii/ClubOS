# Phase 3: Module Black Hole Report

**Total Modules Scanned:** 2954
**Total Connections (Approx):** 15765

## 🕳️ False Modularity (Delete/Inline Candidates)
**Found 10 trivial files (< 10 LOC).**
> Action: Inline these if they are just wrapper exports.

| Module | LOC | Fan-In |
|---|---|---|
| `src/vite-env.d.ts` | 1 | 0 |
| `src/components/ui/aspect-ratio.tsx` | 3 | 0 |
| `src/components/tracing/NavigationTracer.tsx` | 9 | 1 |
| `src/components/financial/FinancialOverviewChart.tsx` | 7 | 1 |
| `src/pages/ClubPilot.tsx` | 9 | 1 |
| `src/pages/Inbox.tsx` | 9 | 1 |
| `src/pages/InviteDashboard.tsx` | 4 | 1 |
| `src/pages/CommunicationAnalyticsPage.tsx` | 8 | 1 |
| `src/pages/admin/DisasterRecoveryPage.tsx` | 9 | 1 |
| `src/pages/admin/RevenueLadderPage.tsx` | 8 | 1 |

## 🌌 Gravitational Singularities (High Coupling)
> Action: Refactor these. They are the 'God Classes' of the frontend.

| Module | Fan-In | Fan-Out | LOC |
|---|---|---|---|
| `src/components/ui/button.tsx` | 1247 | 5 | 68 |
| `src/integrations/supabase/client.ts` | 1162 | 2 | 29 |
| `src/components/ui/card.tsx` | 1072 | 3 | 82 |
| `src/components/ui/badge.tsx` | 942 | 3 | 27 |
| `src/components/ui/sonner.tsx` | 653 | 2 | 27 |
| `src/lib/utils.ts` | 464 | 2 | 5 |
| `src/lib/miljoenenjacht/utils.ts` | 464 | 0 | 20 |
| `src/components/ui/input.tsx` | 453 | 2 | 34 |
| `src/components/ui/label.tsx` | 384 | 4 | 13 |
| `src/contexts/AuthContext.tsx` | 354 | 7 | 162 |
| `src/components/ui/dialog.tsx` | 311 | 4 | 86 |
| `src/components/ui/select.tsx` | 280 | 4 | 130 |
| `src/components/ui/avatar.tsx` | 257 | 3 | 33 |
| `src/components/ui/textarea.tsx` | 246 | 2 | 22 |
| `src/components/ui/skeleton.tsx` | 231 | 1 | 5 |
| `src/components/ui/tabs.tsx` | 221 | 3 | 47 |
| `src/components/ui/scroll-area.tsx` | 221 | 3 | 34 |
| `src/components/ui/progress.tsx` | 216 | 3 | 23 |
| `src/components/AppLayout.tsx` | 193 | 31 | 189 |
| `src/lib/notify.ts` | 145 | 1 | 129 |
| `src/components/ui/switch.tsx` | 121 | 3 | 24 |
| `src/components/ui/tooltip.tsx` | 103 | 3 | 22 |
| `src/components/ui/separator.tsx` | 90 | 3 | 17 |
| `src/components/ui/alert.tsx` | 77 | 3 | 37 |
| `src/components/ui/checkbox.tsx` | 77 | 4 | 23 |
| `src/components/ui/table.tsx` | 69 | 2 | 62 |
| `src/components/ui/popover.tsx` | 66 | 3 | 24 |
| `src/lib/logger.ts` | 64 | 2 | 193 |
| `src/components/RoleGate.tsx` | 63 | 4 | 28 |
| `src/components/ui/dropdown-menu.tsx` | 63 | 4 | 162 |
