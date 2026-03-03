
# Enterprise-Grade Job Creation System — Revised Plan

## Current State (Score: 38/100)

The existing `CreateJobDialog.tsx` is a 1042-line single-scroll `Dialog` with:
- No multi-step wizard, no glass UI
- No admin email notification on submission
- No auto-created admin task
- Missing DB columns: `experience_level`, `seniority_level`, `department`, `location_type` do NOT exist in the `jobs` table
- The `nice_to_have` column exists but is unused by the form
- No copy guidance — generic placeholders throughout

---

## Phase 1: Database Migration (required first)

Add the missing columns to the `jobs` table:

```sql
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS seniority_level text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'onsite',
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'no_rush',
  ADD COLUMN IF NOT EXISTS expected_start_date date;
```

These are all nullable/defaulted, so no migration risk to existing data.

---

## Phase 2: Update Zod Schema

**File:** `src/schemas/jobFormSchema.ts`

Add new fields:
- `experience_level` — optional enum (junior, mid, senior, lead, director, vp_csuite)
- `seniority_level` — optional enum (same values, kept separate for semantic clarity)
- `department` — optional string
- `location_type` — enum (onsite, hybrid, remote, flexible)
- `urgency` — optional enum (immediate, two_weeks, one_month, three_months, no_rush)
- `expected_start_date` — optional date string
- `nice_to_have` — optional string array (already in DB, just needs form support)
- `requirements` — optional string array (already in DB as jsonb)

---

## Phase 3: Rebuild CreateJobDialog as Multi-Step Wizard

**File:** `src/components/partner/CreateJobDialog.tsx` (full rewrite)

Replace the single `Dialog` with a `Sheet` (side="right") using `glass` class on `SheetContent`, matching the ExitIntentPopup aesthetic.

### Step Architecture

Use a `currentStep` state (0-4) with a step indicator bar at the top. Each step validates before advancing. Back button always available. Draft auto-save continues working via existing `useJobFormDraft` hook.

### Step 0: Role Basics
- **Company** — pre-filled if `companyId` prop set; Select with existing `companies` fetch
- **Job Title** — Input, placeholder: "e.g. Senior Product Designer", character counter (5-200)
- **Department** — Select: Engineering, Product, Design, Marketing, Sales, Operations, Finance, People, Legal, Other
- **Employment Type** — visual radio cards with icons (Briefcase for Full-time, Clock for Part-time, FileText for Contract, Laptop for Freelance, GraduationCap for Internship)
- **Seniority Level** — visual radio cards (Junior, Mid-Level, Senior, Lead, Director, VP/C-Suite)

Copy: "Start with the fundamentals. These details help us match the right candidates."

### Step 1: Location and Work Model
- **Location Type** — radio cards (MapPin for On-site, Building for Hybrid, Globe for Remote, Compass for Flexible)
- **Primary Location** — `EnhancedLocationAutocomplete` (existing), shown unless "Remote" selected
- **Additional Locations** — `MultiLocationInput` (existing), collapsible
- Conditional hint when Remote: "Candidates worldwide will be able to see this role."

Copy: "Where will this person work? Be specific — it improves match quality."

### Step 2: Compensation and Timeline
- **Currency + Salary Range** — existing min/max inputs with currency selector (EUR/USD/GBP)
- Hint: "Compensation details are shared only with shortlisted candidates unless displayed on the listing."
- **Expected Start** — date picker (optional)
- **Urgency** — Select: Immediate, Within 2 weeks, Within 1 month, Within 3 months, No rush

Copy: "Setting expectations upfront reduces back-and-forth later."

### Step 3: Role Details
- **Job Description** — Textarea (existing), placeholder: "What will this person do day-to-day? What does success look like in 6 months?"
- **Requirements** — tag input (text items, stored as jsonb array)
- **Nice-to-Have** — tag input (text items, stored in `nice_to_have` column)
- **Required Tools** — `ToolSelector` (existing)
- **Nice-to-Have Tools** — `ToolSelector` (existing)
- **JD File Upload** — existing file upload logic
- **Supporting Documents** — existing multi-file upload
- **External URL** — existing field

Copy: "Be specific about what matters. Vague descriptions attract vague applications."

### Step 4: Settings and Review
- **Pipeline Type** — `PipelineTypeSelector` (existing)
- **Fee Configuration** — `JobFeeConfiguration` (existing, admin/strategist only)
- **Stealth Mode** — `StealthJobToggle` + `StealthViewerSelector` (existing)
- **Review Summary** — read-only glass-card with all entered data in structured sections
- **Submit button**: "Submit for Review" (partners) or "Publish Role" (admin/strategist)

### UI Pattern (matching ExitIntentPopup)
- `SheetContent` with `glass` class, `side="right"`, `className="sm:max-w-2xl w-full"`
- Step indicator: numbered circles with connecting lines, active step highlighted with primary color
- Each step body in `bg-muted/50 rounded-lg p-4 space-y-4` sections
- Footer: sticky bottom bar with Back/Next buttons, both `flex-1`
- Progress percentage shown next to step indicator
- Radio cards pattern: `rounded-lg border p-4 cursor-pointer hover:border-primary/50`, active: `border-primary bg-primary/5`

### State Management
- All existing state variables preserved (formData, tools, stealth, pipeline, fees, locations, files)
- New state: `currentStep: number` (0-4), `stepValidation: Record<number, boolean>`
- Step validation function per step: validates only that step's fields before allowing advance
- Error state remains per-field with existing `fieldErrors` pattern

---

## Phase 4: Admin Email Notification

**New file:** `supabase/functions/notify-admin-job-submitted/index.ts`

Pattern: mirrors `send-partner-request-received` exactly.

- Accepts: `jobId`, `jobTitle`, `companyName`, `submittedByName`, `submittedByEmail`, `employmentType`, `location`, `urgency`
- Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to query `user_roles` for admin users, then `profiles` for their emails
- Sends branded email via Resend using `EMAIL_SENDERS.internal` with `getEmailHeaders()` and `htmlToPlainText()`
- Subject: "New role submitted for review: {jobTitle}"
- Body: StatusBadge(pending) + summary card + CTA button to `/admin/job-approvals`
- Inserts into `notifications` table for each admin:
  ```
  { user_id, title, message, type: 'job_submitted', action_url: '/admin/job-approvals', category: 'jobs' }
  ```
- `verify_jwt = false` in config.toml (called from client after job insert)

**Config update:** Add to `supabase/config.toml`:
```toml
[functions.notify-admin-job-submitted]
verify_jwt = false
```

---

## Phase 5: Auto-Create Admin Task

In `CreateJobDialog.tsx` `handleSubmit`, after successful job creation with `pending_approval` status:

1. Generate task number: query `unified_tasks` count, format as `TQ-XXXX`
2. Insert into `unified_tasks`:
   - `title`: "Review new role: {jobTitle}"
   - `description`: "Submitted by {name} for {companyName}. Review and approve or decline."
   - `priority`: "high"
   - `status`: "pending"
   - `task_type`: "review"
   - `company_name`: companyName
   - `position`: jobTitle
   - `due_date`: 24 hours from now
   - `created_by`: user.id
   - (skip `project_id` and `board_id` — they are nullable, task will appear in the unassigned/inbox view)
3. Insert creator as assignee: query first admin from `user_roles`, insert into `unified_task_assignees`

Error handling: if task creation fails, log error but do NOT block the job submission (the job is already created).

---

## Phase 6: Wire Notification Call

In `handleSubmit`, after job creation and task creation, invoke the edge function:

```typescript
try {
  await supabase.functions.invoke('notify-admin-job-submitted', {
    body: { jobId, jobTitle: formData.title, companyName, ... }
  });
} catch (e) {
  console.error('Admin notification failed:', e);
  // Non-blocking: job is already created
}
```

---

## Files to Create/Edit

| File | Action |
|------|--------|
| Database migration | Add 6 columns to `jobs` table |
| `src/schemas/jobFormSchema.ts` | Add new field validations |
| `src/components/partner/CreateJobDialog.tsx` | Full rewrite as multi-step Sheet wizard |
| `supabase/functions/notify-admin-job-submitted/index.ts` | New edge function |
| `supabase/config.toml` | Register new function |

## What Does NOT Change
- All existing sub-components: ToolSelector, StealthJobToggle, StealthViewerSelector, PipelineTypeSelector, JobFeeConfiguration, EnhancedLocationAutocomplete, MultiLocationInput
- ExitIntentPopup (the reference style)
- Job approval flow in `/admin/job-approvals`
- RLS policies on `jobs` table
- File upload to `job-documents` bucket
- Draft auto-save hook (`useJobFormDraft`)
- The `handleSubmit` core logic (insert job, upload files, insert tools) — preserved and wrapped in steps

## Error Handling Strategy
- Each step validates independently before advancing
- If job insert fails: show error, user stays on Step 4
- If file upload fails: job is created, toast warning, user can re-upload later
- If task/notification fails: non-blocking, logged silently
- Draft auto-save runs every 30s across all steps (existing hook)
- Closing the Sheet with unsaved changes triggers existing save-draft behavior
