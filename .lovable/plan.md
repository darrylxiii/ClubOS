
# Fix: Root Cause -- App.css Is Never Imported (Dead Code)

## Discovery

The `#root { width: 100%; min-height: 100vh; }` fix applied in `src/App.css` has **zero effect** because `App.css` is never imported anywhere in the application. It is leftover boilerplate from the Vite starter template.

- `src/main.tsx` imports `./index.css` only
- No file in the project imports `App.css`
- The actual `#root` styles come from an inline `<style>` block in `index.html` (line 140-144)

This means every "fix" applied to `App.css` was silently ignored.

## Fix Plan

### 1. Move the root fix to where it actually applies

Add `width: 100%` to the `#root` rule in `index.html` inline styles (the only place `#root` is actually styled). Also remove `contain: layout style paint` which can interfere with layout calculations.

### 2. Delete the dead `App.css` boilerplate

Remove `src/App.css` entirely -- it contains only unused Vite starter template styles (`.logo`, `.card`, `.read-the-docs`, `logo-spin` animation) that are never loaded.

### 3. Continue batch cleanup of remaining ~80 pages

With the root cause truly fixed this time, continue removing `container mx-auto`, `max-w-*xl`, and redundant `<AppLayout>` wrappers from the remaining pages across Partner, Feature, Meeting, Support, and Project modules.

### Pages still needing updates (from the approved plan)

**Partner pages:** PartnerRejections, PartnerTargetCompanies, IntegrationsManagement, AuditLog, BillingDashboard, SLADashboard

**Feature pages:** Meetings, MeetingNotes, MeetingInsights, MeetingHistory, PersonalMeetingRoom, HiringIntelligenceHub, Academy, LeaderboardPage, SocialManagement, Pricing, Subscription, ExpertMarketplace, CoverLetterGenerator, LiveHub, ClubAI, ModuleEdit, ValuesPoker, Radio, SalesKPIDashboard, UnifiedKPICommandCenter, AgentDashboard

**Remaining pages:** ProjectProposalsPage, ProjectApplyPage, SupportTicketList, SupportTicketNew, KnowledgeBase, InviteDashboard, Scheduling, and others still using old patterns

**Components with redundant AppLayout:** ContactProfileView, EmailTemplateEditor, RecordingPlaybackPage -- these wrap in AppLayout despite being rendered within ProtectedLayout routes

## Technical Details

### Why the previous fix didn't work

```
src/main.tsx:
  import "./index.css";    // <-- This is the only CSS import
  // App.css is NEVER imported

src/App.css:              // <-- Dead file, changes here do nothing
  #root { width: 100%; }
```

### The actual fix location

```html
<!-- index.html inline <style> (line 140) -->
<!-- BEFORE -->
#root { 
  min-height: 100vh;
  position: relative;
  contain: layout style paint;
}

<!-- AFTER -->
#root { 
  width: 100%;
  min-height: 100vh;
  position: relative;
}
```

### Why removing `contain: layout style paint`

The CSS `contain` property tells the browser the element's rendering is independent. While usually a performance optimization, `contain: paint` creates a new stacking context and `contain: layout` can affect how flex children calculate their available width. Removing it eliminates any possibility of layout containment interfering with full-width rendering.

## Expected Impact

This is the actual root-cause fix. Combined with the per-page cleanup already done and the remaining batch, content will dynamically fill the available screen width on all monitor sizes.

## Risk

Very low. Removing `contain` from `#root` has negligible performance impact (React already manages its own rendering boundaries). Deleting `App.css` removes only unused styles. The page-level changes are the same CSS-only class modifications from the approved plan.
