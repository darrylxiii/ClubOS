
# Home Pages Elite UI/UX Overhaul -- All Three Roles

## Problem

The screenshot confirms the issue: every section is wrapped in multiple card layers. The root cause is `ClubHome.tsx` line 56 which wraps all role content in a `glass-card` div (adds opaque bg, border, padding, blur). Then each widget inside (UnifiedStatsBar, ClubAIHomeChatWidget, Quick Management, Platform Growth, etc.) also uses `Card` or `glass-card` -- creating cards-inside-cards. The result: no breathing room, zero background visibility, and a "cheap dashboard" feel.

## Root Fix: ClubHome.tsx Wrapper

Remove the `glass-card` wrapper from `ClubHome.tsx`. The role views should float directly on the background, not sit inside a giant card container. Change line 56 from `<div className="glass-card">` to just render `{renderRoleView()}` without any wrapping card.

## Fix 1: ClubHomeHeader -- Borderless Glass

**Current**: `bg-card rounded-lg border p-6` (opaque card with hard border)
**Target**: `glass-subtle rounded-2xl p-6` (translucent glass, no hard border, matches platform aesthetic)

Also remove the skeleton fallback border: change from `bg-card rounded-lg border p-6` to `glass-subtle rounded-2xl p-6`.

## Fix 2: UnifiedStatsBar -- Remove Hover Glow Layer

**Current**: Each stat card has a `<div className="absolute -inset-0.5 bg-gradient-to-r ... blur-sm" />` overlay that creates the visible "bigger card behind" effect from the screenshot. The `MetricCard` itself uses `Card` with `glass-subtle` override.

**Target**: Remove the outer glow div entirely. Keep the `MetricCard` with `glass-subtle` but without the absolute-positioned glow wrapper. This eliminates the "card behind card" look.

## Fix 3: AdminHome -- Glass-ify All Widgets

- **Quick Management**: Change `Card className="glass-card"` to `div className="glass-subtle rounded-2xl"`. Remove `CardHeader`/`CardContent` wrappers, use simple padding.
- **PlatformGrowthCard**: Replace `Card` with `div className="glass-subtle rounded-2xl p-6"`. Remove `CardHeader`/`CardContent`, use inline heading.
- **ClubAIHomeChatWidget**: Change `Card className="glass-card overflow-hidden border-primary/10"` to `div className="glass-subtle rounded-2xl overflow-hidden"`.
- All `DashboardSection` children that use `Card` or `glass-card` will be updated to use `glass-subtle rounded-2xl` instead.

## Fix 4: CandidateHome -- De-layer All Widgets

- Remove `DashboardSection` wrappers where they add unnecessary nesting (keep grid utility only).
- **Club Projects Banner**: Change `Card className="glass-strong"` to `div className="glass-subtle rounded-2xl"`.
- Ensure `NextBestActionCard`, `ApplicationStatusTracker`, `CandidateQuickActions` (already updated in prior round) stay on `glass-subtle`.

## Fix 5: PartnerHome -- Glass-ify Quick Actions Card

- **Quick Actions Card** (line 176): Change `Card className="glass-card group hover:border-primary/30"` to `div className="glass-subtle rounded-2xl"`. Remove `CardHeader`/`CardContent` chrome. Use simple padding + text heading.
- Same pattern for all partner widgets using `Card`.

## Fix 6: DashboardSection -- Remove Motion Wrapper

`DashboardSection` wraps every section in a `motion.section` with `initial/animate` -- this causes a staggered bounce that slows perceived load. Simplify to a plain `section` tag. The individual widgets can animate themselves.

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/pages/ClubHome.tsx` | Remove `glass-card` wrapper div |
| `src/components/clubhome/ClubHomeHeader.tsx` | `bg-card rounded-lg border` to `glass-subtle rounded-2xl` |
| `src/components/clubhome/UnifiedStatsBar.tsx` | Remove glow overlay div, simplify hover |
| `src/components/clubhome/AdminHome.tsx` | Quick Management: Card to glass-subtle div |
| `src/components/clubhome/PlatformGrowthCard.tsx` | Card to glass-subtle div |
| `src/components/clubhome/ClubAIHomeChatWidget.tsx` | Card to glass-subtle div |
| `src/components/clubhome/CandidateHome.tsx` | Banner Card to glass-subtle div |
| `src/components/clubhome/PartnerHome.tsx` | Quick Actions Card to glass-subtle div |
| `src/components/clubhome/DashboardSection.tsx` | motion.section to plain section |

Total: 9 files. All changes are class swaps and wrapper removal -- zero logic changes, zero breaking changes.

## Visual Result

```text
Before:                              After:
+=[GLASS-CARD WRAPPER]==========+   +--[transparent]--+
| +=[CARD: Header]=============+ |   | ~glass~ Header   |
| | Avatar + Welcome           | |   |                  |
| +============================+ |   | stat stat stat    |
| +=[CARD: Stats]==============+ |   |   (no glow box)   |
| | +=[CARD]+=[CARD]+=[CARD]+  | |   |                  |
| | | 101  || 17   || 34   |   | |   | ~glass~ AI Chat  |
| | +=====++======++======+    | |   |                  |
| +============================+ |   | ~glass~ Mgmt     |
| +=[CARD: AI Chat]============+ |   |   btn btn btn    |
| +============================+ |   |                  |
| +=[CARD: Quick Mgmt]========+ |   | ~glass~ Growth   |
| +============================+ |   +------------------+
+================================+   background visible
  3-4 nested card layers              0 nested layers
```
