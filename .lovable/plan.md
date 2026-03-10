

# Review System Audit & Upgrade to World-Class

## Current Audit Scores

### Internal Review Panel — 38/100
| Area | Score | Issue |
|------|-------|-------|
| **Information density** | 3/10 | Table shows only name, title, match%. No resume, LinkedIn, experience, location, skills, salary expectations |
| **Candidate context** | 2/10 | Zero profile preview — reviewer must open candidate separately to make any informed decision |
| **AI assistance** | 0/10 | No AI summary, no fit analysis, no recommendation |
| **Bulk intelligence** | 2/10 | Select-all + approve is there but no sorting, filtering, or priority signals |
| **Visual hierarchy** | 4/10 | Plain table with no color-coded signals, no urgency indicators |
| **Feedback quality** | 3/10 | Single text field for notes. No structured tags, no rating, no reason categories |
| **Empty/loading states** | 5/10 | Basic but functional |
| **Keyboard/speed** | 2/10 | No keyboard shortcuts at all |
| **Comparison** | 0/10 | Cannot compare candidates side by side |
| **Undo/safety** | 0/10 | No undo, no confirmation for approve (bulk approve is instant and irreversible) |

### Partner First Review Panel — 52/100
| Area | Score | Issue |
|------|-------|-------|
| **Candidate card** | 5/10 | Shows name, title, match, salary, skills, source — but no resume link, no LinkedIn, no experience years, no location, no education |
| **AI assistance** | 0/10 | No AI fit summary, no recommendation, no comparison to job requirements |
| **Swipe UX** | 6/10 | Keyboard + swipe gestures work. But no visual swipe animation, no undo |
| **Feedback quality** | 7/10 | Tags, rating, notes, structured rejection — solid but missing "compared to what we need" context |
| **Progress tracking** | 5/10 | Progress bar shows position but no session stats (approved today, avg time per review) |
| **Profile depth** | 2/10 | Cannot expand to see full profile, resume, or interview history without leaving the modal |
| **Hold management** | 3/10 | Hold exists but no way to revisit held candidates, no reminder system |
| **Comparison** | 0/10 | No way to compare current candidate to already-approved ones |
| **Mobile** | 4/10 | Swipe works but card layout isn't optimized for mobile |

### Review Hub Dialog — 55/100
| Area | Score | Issue |
|------|-------|-------|
| **Layout** | 7/10 | Clean sidebar + main panel, auto-advance works |
| **Job context** | 3/10 | Sidebar shows job title + count only. No job requirements summary, no "what we're looking for" |
| **Session stats** | 0/10 | No "reviewed today", no time tracking, no velocity |
| **Notification bell** | 0/10 | No unread indicator, no real-time updates |
| **Search/filter** | 0/10 | Cannot search within candidates or filter by match score |

### Aggregated Widgets — 60/100
| Area | Score | Issue |
|------|-------|-------|
| **Information** | 6/10 | Shows counts, SLA, overdue — functional |
| **Urgency** | 7/10 | Color-coded overdue badges work well |
| **Actions** | 5/10 | Click to open hub works, but no quick-approve from widget |

---

## Upgrade Plan — Target: Exceptional

### 1. Rich Candidate Profile Card (Both Panels)
Transform the bland candidate display into an intelligence briefing:
- **Hero section**: Avatar, name, title, location, years of experience, LinkedIn link, resume download button
- **AI Fit Summary**: 2-3 sentence AI-generated summary of why this candidate does/doesn't fit the role (generated on load via Lovable AI — `google/gemini-2.5-flash`)
- **Job Requirements Match Grid**: Visual checklist showing required skills met/unmet
- **Expandable sections**: Work history, education, skills deep-dive — collapsible accordion
- **Internal review notes** passed from admin to partner (already exists, needs better styling)

### 2. AI-Powered Review Assistant
- Auto-generate a "Fit Score Breakdown" for each candidate showing: skills match, experience match, salary alignment, location compatibility
- "AI Recommendation" chip: "Strong Hire", "Proceed with Caution", "Likely Not a Fit" with reasoning
- This uses the existing `calculateCandidateScore` utility but enhances it with job-requirement context

### 3. Enhanced Internal Review Panel
Complete redesign from plain table to card-grid with intelligence:
- **Card view** (default) + table view toggle — each card shows avatar, name, match score ring, AI recommendation, key skills
- **Sorting**: By match score, by date added, by AI recommendation
- **Filtering**: By match score range, by source channel
- **Quick actions on card**: Approve (green check), Reject (red X), Expand (eye icon)
- **Expand card inline**: Shows full candidate briefing without leaving the panel
- **Keyboard shortcuts**: `A` to approve selected, `R` to reject, `Space` to select/deselect, `J/K` to navigate
- **Bulk action bar**: Sticky bottom bar when items selected — "Approve 3 selected" / "Reject 3 selected"
- **Undo toast**: 5-second undo window after any action

### 4. Enhanced Partner Review Panel
- **Visual swipe feedback**: Card tilts/glows green (right) or red (left) during swipe
- **Candidate comparison drawer**: "Compare to Approved" button shows side-by-side with the strongest approved candidate
- **Session stats header**: "3 reviewed · 2 approved · 1 rejected · avg 45s per review"
- **Hold queue tab**: Small tab at bottom to revisit held candidates with one click
- **Profile deep-dive sheet**: "View Full Profile" slides in a sheet with resume, work history, interview notes, timeline
- **Smart defaults**: If match > 85%, pre-select "great_fit" tag. If < 40%, show caution banner

### 5. Review Hub Dialog Upgrades
- **Job context panel**: When selecting a job in sidebar, show a brief "What we're looking for" summary (from job requirements)
- **Session progress bar**: Top bar showing "Today: 7 reviewed, 12 remaining"
- **Real-time badge**: Pulse indicator when new candidates enter the queue (via existing realtime subscription pattern)
- **Search within candidates**: Filter by name or skill within the current job's queue
- **Keyboard shortcut overlay**: `?` key shows shortcut cheat sheet

### 6. Notification & Urgency System
- **Unread dot on widget**: Pulse animation for new reviews since last visit
- **Toast notifications**: When a new candidate passes internal review, partner gets an in-app toast
- **SLA countdown**: Show "2h 15m remaining" instead of just "overdue" — makes urgency tangible

---

## Files to Create
1. `src/components/partner/CandidateReviewCard.tsx` — Rich candidate card used by both panels
2. `src/components/partner/ReviewSessionStats.tsx` — Session tracking header component
3. `src/components/partner/CandidateComparisonDrawer.tsx` — Side-by-side comparison sheet
4. `src/components/partner/ReviewShortcutOverlay.tsx` — Keyboard shortcut help overlay

## Files to Edit
1. `src/components/partner/InternalReviewPanel.tsx` — Card grid redesign with sorting/filtering/keyboard
2. `src/components/partner/PartnerFirstReviewPanel.tsx` — Rich card, swipe animations, comparison, session stats, hold queue
3. `src/components/partner/ReviewHubDialog.tsx` — Job context, session bar, search, real-time indicator
4. `src/components/partner/PendingReviewsWidget.tsx` — Unread indicator, SLA countdown
5. `src/components/clubhome/AdminPendingReviewsWidget.tsx` — Unread indicator, SLA countdown
6. `src/hooks/useReviewQueue.ts` — Add candidate profile enrichment (resume_url, linkedin, experience, education)
7. `src/hooks/useAggregatedReviewQueue.ts` — Add unread tracking logic

## No Database Changes Required
All candidate profile data already exists in `candidate_profiles`. The AI summary will be generated client-side via Lovable AI on-demand.

