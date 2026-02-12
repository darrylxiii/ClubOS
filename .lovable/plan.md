
# Site-Wide Radial Context Menu — Action-Oriented Shortcuts

## Philosophy

The radial menu should not just be a "page shortcut wheel." It should surface **actions** — things you do, not places you go. The user's examples are perfect: record a voice memo, create a task, open AI chat, resume where you left off. These are power-user muscle-memory actions.

---

## Admin Shortcuts (6 items)

| Slot | Icon | Label | Action |
|---|---|---|---|
| 1 | Mic | Voice Memo | Starts recording a voice memo inline. On stop, saves to a `voice_memos` table with optional transcription via Lovable AI. Shows a mini recorder overlay. |
| 2 | Plus | Quick Task | Opens a compact modal to create a task on the current board (title + priority only). Uses `pilot_tasks` insert. |
| 3 | Bot | Club AI | Scrolls to / opens the Club AI chat widget. If not on home, navigates to `/` and focuses the chat input. |
| 4 | History | Last Pipeline | Reads the last-visited pipeline route from `localStorage` and navigates there. Falls back to `/crm/prospects`. |
| 5 | Search | Command Palette | Programmatically triggers the existing `CommandPalette` (Cmd+K). |
| 6 | Activity | Quantum Pulse | Toggles the Quantum Pulse sentinel bar focus — scrolls to stalled candidates view. |

## Strategist Shortcuts (6 items)

| Slot | Icon | Label | Action |
|---|---|---|---|
| 1 | Mic | Voice Memo | Same as admin |
| 2 | Plus | Quick Task | Same as admin |
| 3 | Bot | Club AI | Same as admin |
| 4 | Users | Pipeline | Navigate to `/crm/prospects` |
| 5 | FileText | New Dossier | Navigate to dossier creation |
| 6 | Calendar | Schedule | Navigate to meetings/calendar |

## Partner Shortcuts (5 items)

| Slot | Icon | Label | Action |
|---|---|---|---|
| 1 | Mic | Voice Memo | Same |
| 2 | Bot | Club AI | Same |
| 3 | ListChecks | Shortlist | Navigate to shortlist review |
| 4 | MessageSquare | Messages | Navigate to `/messages` |
| 5 | Building | Company | Navigate to company profile |

## Candidate Shortcuts (5 items)

| Slot | Icon | Label | Action |
|---|---|---|---|
| 1 | Mic | Voice Memo | Same |
| 2 | Bot | Club AI | Same |
| 3 | Briefcase | Applications | Navigate to applications |
| 4 | UserCircle | Profile | Navigate to `/profile` |
| 5 | Share2 | Refer | Navigate to referrals |

---

## Voice Memo Feature (New)

This is the most substantial new capability. On clicking the Voice Memo wedge:

1. A small floating recorder overlay appears (bottom-right, above QuantumPulse)
2. Uses `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder` API
3. Shows a waveform animation while recording, with a timer
4. On stop: saves the audio blob to Lovable Cloud storage (`voice-memos` bucket)
5. Optionally transcribes via Lovable AI (non-blocking, updates the record after)
6. Record saved to a new `voice_memos` table: `id, user_id, audio_url, transcript, duration_seconds, created_at`

The user can view saved memos from their profile or a dedicated section later.

---

## Quick Task Modal (New)

On clicking Quick Task wedge:

1. A compact dialog opens with just: Title input, Priority selector (Low/Medium/High), optional Board selector
2. On submit: inserts into `pilot_tasks` with the current user's ID
3. Toast confirmation: "Task created"
4. No full-page navigation needed

---

## Last Pipeline Tracking

- On every navigation to a pipeline-related route (`/crm/prospects`, `/crm/focus`, `/crm/inbox`, etc.), store the path in `localStorage` under key `tqc_last_pipeline`
- The radial menu "Last Pipeline" action reads this value and navigates there
- Falls back to `/crm/prospects` if no value stored

---

## Technical Implementation

### Database Migration

Create a `voice_memos` table:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `audio_url` (text, NOT NULL)
- `transcript` (text, nullable)
- `duration_seconds` (integer)
- `title` (text, nullable — auto-generated or user-set)
- `status` (text, default 'recorded' — values: recorded, transcribing, transcribed)
- `metadata` (jsonb, default '{}')
- `created_at` (timestamptz)
- RLS: users can only CRUD their own memos

Create a `voice-memos` storage bucket (private, authenticated users only).

### New Files

| File | Purpose |
|---|---|
| `src/components/ui/radial-menu.tsx` | Core radial menu: SVG wedge math, framer-motion spring animation, Radix ContextMenu integration. Rewrite of the provided component using existing stack. |
| `src/components/ui/radial-menu-provider.tsx` | Wraps app content with ContextMenu.Root. Reads role, renders correct items, handles action dispatch. |
| `src/config/radial-menu-items.ts` | Role-to-action mapping. Each item has: `id, label, icon, action` (where action is a function, not just a path). |
| `src/hooks/useRadialMenu.ts` | Combines `useRole()` with items config. Also exposes `triggerAction(id)` for programmatic use. |
| `src/components/voice/VoiceMemoRecorder.tsx` | Floating recorder overlay: start/stop, waveform viz, upload to storage, save to DB. |
| `src/hooks/useVoiceMemo.ts` | MediaRecorder logic, blob handling, upload to storage bucket, insert to `voice_memos` table. |
| `src/components/clubpilot/QuickTaskDialog.tsx` | Compact modal: title + priority + submit. Inserts into `pilot_tasks`. |
| `src/hooks/useLastPipeline.ts` | Read/write `localStorage` for last pipeline route. Hook that navigation components call on mount. |

### Modified Files

| File | Change |
|---|---|
| `src/components/AppLayout.tsx` | Wrap the `<main>` content area with `RadialMenuProvider`. Mount `VoiceMemoRecorder` and `QuickTaskDialog` globally (controlled via state from the radial menu hook). |
| `src/components/CommandPalette.tsx` | Export a `triggerOpen` function or use a global event so the radial menu can open it programmatically. |

### Integration in AppLayout

The RadialMenuProvider wraps the main content area so right-click anywhere (except on elements with their own context menus like workspace pages or message threads) triggers the radial wheel. The provider manages:
- Which overlay is active (voice memo recorder, quick task dialog)
- Dispatching navigation actions
- Reading role for item filtering

### Visual Design

- 240px diameter dark glass ring (`bg-card/90 backdrop-blur-xl border border-border/20`)
- 50px band width with 6 wedge slots
- Gold highlight on hover (matching the Refined Luxury aesthetic)
- Hovered item label appears in the center circle
- Spring animation on open: `stiffness: 420, damping: 32`
- Single fade-in, no per-wedge popcorn effect

### Accessibility

- Arrow keys cycle through wedges
- Enter activates the focused wedge
- Each wedge has `aria-label`
- Escape closes the menu
- Respects `prefers-reduced-motion` — instant show/hide without spring
