

# Partner & Admin Review Command Center — Complete Plan

## What Exists Today
- **Internal Review Panel** (`InternalReviewPanel.tsx`): Table-based bulk approve/reject for admins/strategists — works but only inside individual JobDashboard → Reviews tab
- **Partner First Review Panel** (`PartnerFirstReviewPanel.tsx`): Card-based swipe UI for partners — also buried inside individual JobDashboard
- **`pipeline_reviewers` table**: Supports assigning specific reviewers per job with `review_type` column and `is_primary` flag — already in the database
- **`PipelineCustomizer.tsx`**: Has reviewer assignment UI but only for `review_type = 'partner'`
- **No aggregated view** on any home page — partners and admins must click into each job individually
- **No notifications** when reviews are pending or overdue

## What We'll Build

### 1. Aggregated Review Queue Hook (`useAggregatedReviewQueue.ts`)
Single hook that fetches pending review counts across ALL jobs:
- For **admins/strategists**: counts where `internal_review_status = 'pending'` or NULL
- For **partners**: counts where `internal_review_status = 'approved'` AND `partner_review_status` is pending/NULL
- Groups by job with title, company name, oldest pending date (for SLA tracking)
- Returns `{ jobs: Array<{jobId, jobTitle, companyName, pendingCount, oldestPendingAt}>, totalPending, overdueCount }`

### 2. Pending Reviews Widget — Partner Home (`PendingReviewsWidget.tsx`)
A prominent glass card placed **above the Offers row** on `PartnerHome.tsx`:
- Pulsing amber badge when reviews exist, calm green when all clear
- Each job row: title, pending count, oldest review age, "Review" button
- SLA indicator: highlight in red if any review is older than 48h
- "Review All" button opens the full hub dialog
- Empty state: "All caught up — no candidates awaiting your review"

### 3. Pending Reviews Widget — Admin Home (`AdminPendingReviewsWidget.tsx`)
Similar card for `AdminHome.tsx` placed after `AttentionRequiredStrip`:
- Shows internal review queue counts (pre-vet layer)
- Also shows partner review queues that are overdue (admin oversight)
- "Triage" button opens the admin review hub

### 4. Review Hub Dialog (`ReviewHubDialog.tsx`)
Full-screen dialog (`max-w-7xl`, `h-[90vh]`) that works for BOTH admin and partner flows:
- **Left sidebar**: Scrollable job list with pending counts per job, click to select
- **Right panel**: Renders `InternalReviewPanel` (for admins) or `PartnerFirstReviewPanel` (for partners) based on role
- Auto-advances to next job when current queue empties
- Header shows total progress: "4 of 12 reviewed today"
- Keyboard shortcut `Ctrl+R` to open from home page

### 5. Reviewer Assignment — Both Layers (`PipelineCustomizer.tsx` enhancement)
Extend the existing reviewer assignment UI to support **both** review types:
- Add a toggle/tab for `review_type = 'internal'` vs `review_type = 'partner'`
- Admins can assign specific recruiters/strategists to the internal review layer
- Partners (or admins) can assign specific partner contacts to the partner review layer
- Show assigned reviewers with primary badge

### 6. Review Notification System
When `internal_review_status` changes to `'approved'` (candidate passes internal review), notify assigned partner reviewers:
- Insert into `notification_preferences`-compatible system
- Create a database trigger or edge function `notify-review-ready` that:
  - Looks up `pipeline_reviewers` for the job where `review_type = 'partner'`
  - Creates an in-app notification for each assigned reviewer
  - Optionally sends email via existing email infrastructure
- Similarly, when a new application arrives, notify assigned internal reviewers
- SLA alerts: a scheduled check (or on-load) flags reviews older than 24h (internal) or 48h (partner) as overdue

### 7. Review SLA Badge on Job Cards
On `CompanyJobsDashboard.tsx` and any job list, show a small badge:
- "3 awaiting review" with amber/red color based on SLA status
- Clickable → opens ReviewHubDialog filtered to that job

---

## Database Changes

**New table: `review_notifications`**
```sql
CREATE TABLE public.review_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL DEFAULT 'partner',
  notification_type TEXT NOT NULL DEFAULT 'review_ready',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.review_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON public.review_notifications FOR SELECT TO authenticated
USING (reviewer_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.review_notifications FOR UPDATE TO authenticated
USING (reviewer_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.review_notifications FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'strategist'::app_role) OR
  public.has_role(auth.uid(), 'recruiter'::app_role)
);
```

**No schema changes to `pipeline_reviewers`** — it already supports `review_type` as a text column.

---

## Files to Create
1. `src/hooks/useAggregatedReviewQueue.ts` — cross-job review counts
2. `src/components/partner/PendingReviewsWidget.tsx` — partner home widget
3. `src/components/clubhome/AdminPendingReviewsWidget.tsx` — admin home widget
4. `src/components/partner/ReviewHubDialog.tsx` — full-screen review modal

## Files to Edit
1. `src/components/clubhome/PartnerHome.tsx` — insert PendingReviewsWidget after stats bar
2. `src/components/clubhome/AdminHome.tsx` — insert AdminPendingReviewsWidget after AttentionRequiredStrip
3. `src/components/partner/PipelineCustomizer.tsx` — add internal reviewer assignment tab
4. `src/hooks/useReviewQueue.ts` — add notification insert after internal approve (to alert partner reviewers)

## Component Architecture

```text
PartnerHome / AdminHome
  └─ PendingReviewsWidget / AdminPendingReviewsWidget
       ├─ useAggregatedReviewQueue (shared hook)
       ├─ Job rows with SLA indicators
       └─ onClick → ReviewHubDialog
             ├─ Left: Job selector sidebar with counts
             └─ Right: PartnerFirstReviewPanel OR InternalReviewPanel (role-based)

PipelineCustomizer (existing, enhanced)
  └─ Tabs: "Internal Reviewers" | "Partner Reviewers"
       └─ Assign reviewers with is_primary flag

useReviewQueue.approveInternalMutation (enhanced)
  └─ After status update → insert review_notifications for assigned partner reviewers
```

