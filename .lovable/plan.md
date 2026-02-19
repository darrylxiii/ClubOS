
# Shareable Job Pipeline Links — Full Feature Design

## What This Builds

A system that allows admins and strategists to generate a secure, time-limited, optionally password-protected link that gives any anonymous visitor (no account required) a read-only view of a job's pipeline — showing the pipeline stages, candidate cards with enriched data, and key metrics. Designed for external partners reviewing shortlists without needing a TQC account.

---

## How It Fits Into the Existing System

The platform already has three working share-link patterns to follow:
- `profile_share_links` table + `track_share_link_view` RPC → `/share/:token` → `SharedProfile.tsx`
- `dossier_shares` table + `generate_dossier_share_token` RPC → `/dossier/:shareToken` → `DossierView.tsx`
- `meeting_dossiers` table + `share_token` column

This feature follows the same architecture: a new `job_pipeline_shares` table, a new public route `/pipeline/:token`, and a new `SharedPipelineView.tsx` page — no authentication required.

---

## Data Model

### New Table: `job_pipeline_shares`

```text
id              uuid PK
job_id          uuid → jobs.id (CASCADE DELETE)
created_by      uuid → auth.users
token           text UNIQUE NOT NULL (cryptographically random)
expires_at      timestamptz NOT NULL
password_hash   text NULL  (bcrypt via pgcrypto, optional)
is_active       boolean DEFAULT true
view_count      integer DEFAULT 0
label           text NULL  (e.g. "Sent to Acme HR team")

-- Visibility controls (what to show in the shared view)
show_candidate_names    boolean DEFAULT true
show_candidate_emails   boolean DEFAULT false
show_candidate_linkedin boolean DEFAULT false
show_salary_data        boolean DEFAULT false
show_match_scores       boolean DEFAULT true
show_ai_summary         boolean DEFAULT true
show_contact_info       boolean DEFAULT false

created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### RLS Policies
- `INSERT`: authenticated users with `admin` or `strategist` role only
- `SELECT`: authenticated `admin`/`strategist` can list their own shares; anonymous access is handled via a `SECURITY DEFINER` RPC function that validates token + expiry without exposing the full table
- `UPDATE`: `created_by` user or admin (to revoke/edit)
- `DELETE`: same as UPDATE

### Database Function: `validate_job_pipeline_share(token text, password text)`
A `SECURITY DEFINER` function that:
1. Looks up the token in `job_pipeline_shares`
2. Checks `is_active = true` and `expires_at > now()`
3. If `password_hash` is set, checks `crypt(password, password_hash) = password_hash`
4. Returns the `job_id` + `visibility settings` JSON if valid, or null/error if not
5. Increments `view_count`

This pattern is identical to the existing `track_share_link_view` RPC.

---

## What the Shared View Shows

The anonymous viewer gets a clean, branded read-only page at `/pipeline/:token`:

**Header:**
- The Quantum Club logo + "Confidential — View Only" watermark
- Job title, company name, company logo
- Link expiry notice
- Optional: "Interested in joining The Quantum Club?" CTA

**Pipeline Board:**
- All pipeline stages as columns (e.g. Applied → Screen → Interview → Final → Offer)
- Candidate count per stage
- Each candidate card shows (controlled by visibility flags):
  - Name (if `show_candidate_names`)
  - Current title + company
  - Match score badge (if `show_match_scores`)
  - AI summary snippet (if `show_ai_summary`)
  - Email/LinkedIn only if explicitly enabled by the creator

**No write actions** — no advance/reject/comment buttons. Pure viewing.

**Password Gate (if enabled):**
- Before showing the pipeline, show a simple password entry form
- On submit, call the `validate_job_pipeline_share` RPC

---

## Where Links Are Created (Share Dialog)

A new `SharePipelineDialog` component is added to `JobDashboard.tsx`, accessible via a "Share Pipeline" button in the job header actions (visible to admin/strategist only, same as the existing Edit Job / Archive buttons).

The dialog lets the creator:
1. Set expiry: 24h / 48h / 72h / 7 days / 30 days
2. Set an optional label (e.g. "Sent to Acme partner")
3. Toggle optional password protection (enter a password if enabled)
4. Toggle visibility controls: names, emails, LinkedIn, salary, match scores, AI summary
5. One-click copy generated link
6. List and revoke existing active links for this job

---

## Files to Create / Modify

### New Files
1. **`src/pages/SharedPipelineView.tsx`** — public page for token-based pipeline access
2. **`src/components/jobs/SharePipelineDialog.tsx`** — dialog to generate and manage share links
3. **`src/components/jobs/shared-pipeline/PipelineShareBoard.tsx`** — read-only Kanban board for the shared view
4. **`src/components/jobs/shared-pipeline/SharedCandidateCard.tsx`** — candidate card respecting visibility flags

### Modified Files
5. **`src/App.tsx`** — add public route `/pipeline/:token` using `PublicProviders`
6. **`src/pages/JobDashboard.tsx`** — add "Share Pipeline" button + `SharePipelineDialog`
7. **Database migration** — create `job_pipeline_shares` table, RLS policies, and `validate_job_pipeline_share` RPC function

---

## Technical Implementation — Step by Step

### Step 1: Database Migration
```sql
-- Table
CREATE TABLE public.job_pipeline_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL,
  password_hash text,
  is_active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  label text,
  show_candidate_names boolean NOT NULL DEFAULT true,
  show_candidate_emails boolean NOT NULL DEFAULT false,
  show_candidate_linkedin boolean NOT NULL DEFAULT false,
  show_salary_data boolean NOT NULL DEFAULT false,
  show_match_scores boolean NOT NULL DEFAULT true,
  show_ai_summary boolean NOT NULL DEFAULT true,
  show_contact_info boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.job_pipeline_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can manage pipeline shares"
  ON public.job_pipeline_shares
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'strategist'::app_role)
  );

-- Validation RPC (SECURITY DEFINER — bypasses RLS for anonymous callers)
CREATE OR REPLACE FUNCTION public.validate_job_pipeline_share(
  _token text,
  _password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _share job_pipeline_shares;
BEGIN
  SELECT * INTO _share
  FROM public.job_pipeline_shares
  WHERE token = _token
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check password if set
  IF _share.password_hash IS NOT NULL THEN
    IF _password IS NULL OR crypt(_password, _share.password_hash) <> _share.password_hash THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  -- Increment view count
  UPDATE public.job_pipeline_shares
  SET view_count = view_count + 1, updated_at = now()
  WHERE id = _share.id;

  RETURN jsonb_build_object(
    'job_id', _share.job_id,
    'show_candidate_names', _share.show_candidate_names,
    'show_candidate_emails', _share.show_candidate_emails,
    'show_candidate_linkedin', _share.show_candidate_linkedin,
    'show_salary_data', _share.show_salary_data,
    'show_match_scores', _share.show_match_scores,
    'show_ai_summary', _share.show_ai_summary,
    'show_contact_info', _share.show_contact_info,
    'expires_at', _share.expires_at
  );
END;
$$;
```

The `validate_job_pipeline_share` function is `SECURITY DEFINER` — anonymous users call it and it validates without exposing any row directly via RLS. The full `job_pipeline_shares` table remains inaccessible to anon.

### Step 2: `SharedPipelineView.tsx` (Public Page)
- Reads `:token` from URL params
- First renders a loading state
- If the share has a password, shows a password entry card before fetching job data
- Calls `validate_job_pipeline_share(token, password?)` via `supabase.rpc()`
- On success, receives `job_id` + visibility settings
- Fetches job data (title, company, stages) from `jobs` table — uses the existing RLS policy which allows public read of non-stealth jobs
- Fetches applications with candidate names, titles (fields that are already partially public), filtered by visibility flags
- Renders `PipelineShareBoard` — a read-only Kanban layout
- Footer: expiry notice, TQC branding, "Join The Quantum Club" CTA

### Step 3: `PipelineShareBoard.tsx` + `SharedCandidateCard.tsx`
- Horizontally scrollable Kanban columns (one per pipeline stage)
- Each column shows count badge + candidate cards
- `SharedCandidateCard` renders: avatar initials, name (if allowed), title/company, match score badge, AI summary excerpt — zero action buttons
- Clean dark TQC aesthetic, consistent with `DossierView.tsx` branding

### Step 4: `SharePipelineDialog.tsx`
A dialog (mirrors `ShareProfileDialog.tsx` pattern) containing:
- Expiry duration select (24h, 48h, 72h, 7d, 30d)
- Optional label text input
- Password toggle + input
- Visibility toggles (names, emails, LinkedIn, match scores, AI summary)
- "Generate Link" button → calls RPC `generate_share_token` → inserts into `job_pipeline_shares`
- Link display with copy button + open in new tab
- List of existing active shares with view count, expiry, revoke button

### Step 5: Wire into `JobDashboard.tsx`
Add a `Share` button to the top header actions area (beside the existing Edit/Archive/Delete dropdown), visible only to `admin` and `strategist` roles. Opens `SharePipelineDialog`.

### Step 6: Register Public Route in `App.tsx`
```tsx
<Route path="/pipeline/:token" element={
  <PublicProviders>
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}><SharedPipelineView /></Suspense>
    </RouteErrorBoundary>
  </PublicProviders>
} />
```

---

## Security Model

| Concern | How It Is Handled |
|---|---|
| Anonymous access to pipeline data | Only possible via a valid, unexpired, active token. No direct table access via anon RLS. |
| Password protection | `bcrypt` via `pgcrypto.crypt()` server-side. Password never stored in plaintext. |
| Candidate PII exposure | Field-level visibility flags stored on the share row. Enforced server-side by only selecting the permitted columns. |
| Token guessing | 32-byte random hex = 64-character token. Brute force infeasible. |
| Revocation | `is_active = false` immediately invalidates the link without deleting audit history. |
| Admin notes / internal data | Never included in the shared view. Only candidate-facing profile data. |
| Salary data | Hidden by default behind `show_salary_data = false` flag. |

---

## Candidate Data Privacy (Employer Shield)

The `blocked_companies` field on `candidate_profiles` and the employer shield logic are **not exposed** in the shared view. Only general profile data (name, title, company, AI summary) is shown, controlled by visibility flags. Sensitive internal fields (`internal_rating`, `ai_concerns`, `personality_insights`) are never included.

---

## Summary of All Files

| File | Action | Purpose |
|---|---|---|
| Database migration | Create | `job_pipeline_shares` table + RLS + `validate_job_pipeline_share` RPC |
| `src/pages/SharedPipelineView.tsx` | Create | Public token-validated pipeline viewer |
| `src/components/jobs/SharePipelineDialog.tsx` | Create | Link generation + management dialog |
| `src/components/jobs/shared-pipeline/PipelineShareBoard.tsx` | Create | Read-only Kanban board for shared view |
| `src/components/jobs/shared-pipeline/SharedCandidateCard.tsx` | Create | Candidate card respecting visibility flags |
| `src/App.tsx` | Modify | Add `/pipeline/:token` public route |
| `src/pages/JobDashboard.tsx` | Modify | Add "Share Pipeline" button + dialog |
