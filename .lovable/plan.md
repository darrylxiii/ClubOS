

# Implementation Plan: 6 Premium UX Features

This is a large implementation requiring **3 batches** to ensure quality. Each batch builds on the previous.

---

## Batch 1: Foundation Layer

### Feature 10: Content-Aware Skeletons (Audit & Gap-Fill)

**Current state**: `LoadingSkeletons.tsx` already has 15 skeleton variants (JobCard, Profile, AdminTable, CRM, Scheduling, Analytics, etc.) and they're used in ~27 files. This is reasonably well-covered.

**Gaps found** (pages still using generic spinners or `animate-pulse` divs instead of proper skeletons):
- Pipeline/Kanban views — no `PipelineSkeleton`
- Chart-heavy pages use a single `Skeleton className="h-[300px]"` — need a `ChartSkeleton` with axis lines and bar/line shapes
- Timeline components (`ActivityTimeline`, CRM `ActivityTimeline`) use hand-rolled `animate-pulse` divs instead of the centralized `ActivityFeedSkeleton`
- Meeting room / video call loading states use generic loaders

**Changes**:
- Add to `LoadingSkeletons.tsx`: `PipelineSkeleton`, `ChartSkeleton` (with fake axis + bars shape), `TimelineSkeleton`, `VideoCallSkeleton`
- Replace hand-rolled `animate-pulse` divs in `crm/ActivityTimeline.tsx` and `candidate/ActivityTimeline.tsx` with the existing `ActivityFeedSkeleton`
- This is the smallest feature — done first as warm-up

### Feature 8: Real-Time Collaboration Presence

**Current state**: `useUserPresenceExtended` exists for LiveHub status (online/away/dnd). `useLiveHubPresence` tracks who's online. But there is **zero page-level presence** — nobody knows who else is viewing the same candidate, job, or CRM record.

**Implementation**:
- New hook: `src/hooks/usePagePresence.ts`
  - Uses Supabase Realtime Presence (not Postgres changes) via `supabase.channel('page-presence').track()`
  - Tracks `{ userId, fullName, avatarUrl, currentPage }` per user
  - Syncs on page navigation, cleans up on unmount
- New component: `src/components/shared/PagePresenceAvatars.tsx`
  - Renders overlapping avatar stack of users currently on the same page
  - Tooltip showing names, "Also viewing this page"
  - Max 5 avatars + "+N more" overflow
- Mount in `AppLayout.tsx` header area (next to NotificationBell)
- Filter: only show others on the exact same route path

---

## Batch 2: Core Intelligence Features

### Feature 2: Global Spotlight Search (Unified)

**Current state**: `CommandPalette.tsx` is mounted globally in `AppLayout` — it only does navigation (static list of routes). `WorkspaceCommandPalette` searches workspace pages. `AICommandPalette` is email-only. No cross-entity search exists.

**Implementation**:
- Replace `src/components/CommandPalette.tsx` with `GlobalSpotlightSearch.tsx`
  - Keep all existing navigation commands as a "Quick Actions" group
  - Add real-time search across 6 entity types (debounced, parallel queries):
    - **Candidates**: `profiles` where role includes candidate-like data (name, title)
    - **Jobs**: `jobs` table (title, company)
    - **Companies**: `companies` table (name)
    - **Messages**: `message_threads` (title/last message preview)
    - **Workspace Pages**: `workspace_pages` (title, content snippet — reuse `useFullTextSearch` logic)
    - **Meetings**: `meetings` table (title, date)
  - Each result shows: icon, title, subtitle, entity type badge
  - Click navigates to the entity's detail page
  - Keyboard navigation (arrow keys, Enter to select)
  - Recent searches stored in `localStorage`
  - Role-filtered: candidates don't see admin entities, partners don't see financials
- Update `AppLayout.tsx` import from `CommandPalette` to `GlobalSpotlightSearch`
- Keep `Cmd+K` binding (already wired)
- Update radial menu "Search" action to trigger the same dialog

### Feature 3: Ambient AI Suggestions

**Current state**: `NextBestActionCard` exists but is a static card on the candidate home page. It checks profile completion, upcoming interviews, and browsing — basic heuristics, not data-driven ambient intelligence.

**Implementation**:
- New hook: `src/hooks/useAmbientInsights.ts`
  - Runs on dashboard mount (admin/partner/candidate home pages)
  - Queries real data to detect actionable situations:
    - **Stale candidates**: Applications in "screening" for 7+ days with no activity
    - **Uncontacted leads**: CRM prospects with no touchpoints in 14+ days
    - **Pipeline bottleneck**: Stages with disproportionate candidate count
    - **Upcoming deadlines**: Job closing dates within 3 days
    - **Missing follow-ups**: Meeting happened but no notes/feedback logged within 48h
  - Returns array of `AmbientInsight` objects with priority, message, action link, dismiss callback
  - Dismissals stored per-user in `localStorage` (key = insight hash + date)
- New component: `src/components/shared/AmbientInsightBar.tsx`
  - Renders as a slim, dismissible banner at the top of the main content area
  - Shows one insight at a time, with left/right arrows if multiple
  - Icon + message + action button ("View" / "Fix" / "Follow up")
  - Subtle slide-in animation
  - Role-scoped: admin sees pipeline/stale insights, partner sees CRM insights, candidate sees profile/interview insights
- Mount in `AppLayout.tsx` just above `{children}` inside `<main>`

### Feature 6: Activity Timeline (Unified Per-Entity)

**Current state**: Two separate `ActivityTimeline` components exist:
- `candidate/ActivityTimeline.tsx` — queries `activity_timeline` table for candidate events
- `crm/ActivityTimeline.tsx` — queries `crm_touchpoints` for CRM interactions

Neither merges data from multiple sources. No unified timeline exists that combines emails, meetings, notes, status changes, and touchpoints for a single entity.

**Implementation**:
- New component: `src/components/shared/UnifiedEntityTimeline.tsx`
  - Props: `entityType` ("candidate" | "company" | "job") + `entityId`
  - Parallel queries to merge:
    - `activity_feed` (filtered by relevant user/company)
    - `activity_timeline` (for candidate entities)
    - `crm_touchpoints` (for company/prospect entities)
    - `meeting_participants` joined with `meetings` (for meeting events)
    - `message_threads` / messages (recent communications)
  - Normalizes all into a unified `TimelineEvent` interface: `{ id, timestamp, type, icon, title, description, metadata, source }`
  - Renders as a vertical timeline with:
    - Date group headers ("Today", "Yesterday", "March 10")
    - Color-coded icons per event type
    - Expandable detail sections for rich events (meeting notes, email previews)
    - "Load more" pagination
  - Real-time: subscribes to `activity_feed` and `activity_timeline` INSERT events
- Integrate into:
  - Candidate profile detail pages (replace or augment existing `ActivityTimeline`)
  - CRM company/prospect detail views
  - Job dashboard (candidate activity on that job)

---

## Batch 3: Admin-Only Voice Commands

### Feature 15: Voice Commands (Admin Only)

**Current state**: `SpeechRecognition` is used in `useAITranscription`, `useVoiceBooking`, and `LiveCaptions` — but only for meeting transcription and booking. No navigation or command voice interface exists.

**Implementation**:
- New hook: `src/hooks/useVoiceCommands.ts`
  - Gated by role: only activates for `admin` role (checked via `useRole`)
  - Uses `webkitSpeechRecognition` / `SpeechRecognition` API
  - Continuous listening mode (toggle on/off via mic button)
  - Command grammar:
    - Navigation: "go to [page]", "open [page]", "show [page]" — maps spoken phrases to routes using fuzzy matching against the navigation config
    - Search: "search for [term]" — opens GlobalSpotlightSearch with pre-filled query
    - Actions: "create job", "new message", "show notifications"
  - Visual feedback: floating mic indicator when active, pulsing animation, transcript preview
  - Error handling: graceful fallback if browser doesn't support Speech API
- New component: `src/components/admin/VoiceCommandButton.tsx`
  - Mic icon button in header (only renders for admin)
  - Click to toggle listening
  - Shows small floating transcript bubble when processing
  - Success/failure toast for recognized vs unrecognized commands
- New component: `src/components/admin/VoiceCommandIndicator.tsx`
  - Floating overlay showing: listening state, last recognized phrase, matched action
  - Auto-dismisses after command execution
- Mount `VoiceCommandButton` in `AppLayout.tsx` header, gated by `RoleGate allowedRoles={['admin']}`

---

## Files Summary

| Batch | File | Action |
|-------|------|--------|
| 1 | `src/components/LoadingSkeletons.tsx` | Add 4 new skeleton variants |
| 1 | `src/components/crm/ActivityTimeline.tsx` | Use centralized skeleton |
| 1 | `src/components/candidate/ActivityTimeline.tsx` | Use centralized skeleton |
| 1 | `src/hooks/usePagePresence.ts` | **New** — Realtime page presence |
| 1 | `src/components/shared/PagePresenceAvatars.tsx` | **New** — Avatar stack |
| 1 | `src/components/AppLayout.tsx` | Mount presence avatars |
| 2 | `src/components/GlobalSpotlightSearch.tsx` | **New** — Replaces CommandPalette |
| 2 | `src/components/CommandPalette.tsx` | Replaced / removed |
| 2 | `src/hooks/useAmbientInsights.ts` | **New** — Data-driven insight engine |
| 2 | `src/components/shared/AmbientInsightBar.tsx` | **New** — Dismissible insight banners |
| 2 | `src/components/shared/UnifiedEntityTimeline.tsx` | **New** — Multi-source timeline |
| 2 | `src/components/AppLayout.tsx` | Mount spotlight + ambient bar |
| 3 | `src/hooks/useVoiceCommands.ts` | **New** — Speech-to-action (admin) |
| 3 | `src/components/admin/VoiceCommandButton.tsx` | **New** — Mic toggle button |
| 3 | `src/components/admin/VoiceCommandIndicator.tsx` | **New** — Transcript overlay |
| 3 | `src/components/AppLayout.tsx` | Mount voice command button |

No database changes needed — all features use existing tables and Supabase Realtime Presence (built-in, no schema required).

