
# Email Dump for Jobs -- Comprehensive Plan

## Problem
Recruiters send emails to partners with candidate information. When partners don't use the OS, recruiters must manually enter each candidate into the system -- double work. We need a way to dump raw email content (forwarded emails, copy-pasted text) per job and have AI extract all candidates automatically into the pipeline.

## Solution Overview
Build an "Email Dump" feature on each Job Dashboard where strategists can:
1. Paste raw email text (or multiple emails) into a text area
2. AI parses the content and extracts every candidate mentioned (name, email, phone, title, company, LinkedIn URL)
3. Review extracted candidates in a preview table with edit capability
4. Batch-import all confirmed candidates into the pipeline as applications + candidate_profiles in one click

---

## Architecture

### 1. Database: `job_email_dumps` table
Stores every raw email dump per job for audit trail and re-processing.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| job_id | uuid FK -> jobs | Which job this dump belongs to |
| raw_content | text | The pasted/forwarded email text |
| extracted_candidates | jsonb | AI-parsed candidate array |
| import_status | text | pending / imported / partial / failed |
| imported_count | int | How many were imported |
| created_by | uuid FK -> profiles | Who pasted it |
| created_at | timestamptz | |
| processed_at | timestamptz | When AI extraction completed |

RLS: Only admins and strategists (via user_roles) can read/write.

### 2. Edge Function: `parse-email-candidates`
- Receives `{ raw_content, job_id }`
- Sends the raw text to Lovable AI (gemini-3-flash-preview) with a structured extraction prompt
- Uses **tool calling** to extract an array of candidates with fields: `full_name`, `email`, `phone`, `current_title`, `current_company`, `linkedin_url`, `notes`
- Returns the structured array to the frontend
- Handles rate limit (429) and payment (402) errors gracefully

### 3. Frontend Components

**A. `EmailDumpTab.tsx`** (new tab on JobDashboard)
- Large text area for pasting email content
- "Extract Candidates" button that calls the edge function
- Support for pasting multiple emails at once (separator detection)

**B. `ExtractedCandidatesPreview.tsx`**
- Table showing all AI-extracted candidates
- Editable inline fields (name, email, LinkedIn, title, company)
- Duplicate detection: checks against existing `candidate_profiles` by email/LinkedIn
- Checkboxes to select/deselect individual candidates
- Confidence indicator per candidate (from AI)

**C. `EmailDumpHistory.tsx`**
- List of previous dumps for this job with timestamp, who created, count imported
- Re-process button for failed dumps

### 4. Import Logic (on "Import to Pipeline")
For each confirmed candidate:
1. Check if `candidate_profiles` already exists (match by email or linkedin_url)
2. If exists: link existing profile; if not: create new `candidate_profiles` row with `source_channel = 'email_dump'`
3. Create `applications` row linked to the job with:
   - `candidate_id` -> the profile
   - `candidate_full_name`, `candidate_email`, `candidate_linkedin_url`, etc. denormalized
   - `application_source` = 'sourced' (or appropriate enum value)
   - `current_stage_index` = 0 (Applied stage)
   - `status` = 'active'
4. Update the `job_email_dumps` row with `import_status = 'imported'` and count
5. Optionally trigger auto-tagging and enrichment for new profiles

### 5. JobDashboard Integration
- Add "Email Dump" tab to the existing TabsList in `JobDashboard.tsx`
- Only visible to admin/strategist roles
- Badge showing number of pending dumps

---

## Implementation Phases

### Phase 1: Database + Edge Function
- Create `job_email_dumps` table with RLS
- Build `parse-email-candidates` edge function using Lovable AI tool calling
- Register in config.toml

### Phase 2: Frontend -- Email Dump Tab
- Create `EmailDumpTab.tsx` with paste area and extraction flow
- Create `ExtractedCandidatesPreview.tsx` with editable table
- Create `EmailDumpHistory.tsx` for audit trail
- Add tab to `JobDashboard.tsx`

### Phase 3: Import Pipeline
- Implement deduplication logic (email + LinkedIn matching)
- Batch create `candidate_profiles` + `applications`
- Trigger `auto-tag-candidate` and `enrich-candidate-profile` for new profiles
- Update dump status

---

## Technical Details

### AI Extraction Prompt Strategy
The edge function will use tool calling with this schema:

```text
Function: extract_candidates
Parameters:
  candidates: array of {
    full_name: string (required)
    email: string
    phone: string
    current_title: string
    current_company: string
    linkedin_url: string
    notes: string (any extra context from the email)
    confidence: number (0-1, how confident the extraction is)
  }
```

System prompt will instruct the model to:
- Extract ALL people mentioned as candidates (not senders/recruiters)
- Normalize LinkedIn URLs to standard format
- Parse phone numbers with country codes
- Identify titles and companies from context
- Flag low-confidence extractions

### Deduplication Strategy
1. First match by email (exact, case-insensitive)
2. Then match by LinkedIn URL (normalized)
3. Then fuzzy match by full_name + current_company (flag for review, don't auto-merge)

### Edge Cases Handled
- Multiple emails pasted at once (detect "From:" / "Subject:" separators)
- Forwarded email chains (extract only candidates, not email metadata people)
- Non-English names and international phone formats
- Candidates with partial info (name only is sufficient)
- Duplicate candidates within the same dump
- Candidates already in the pipeline for this specific job

### Security
- RLS on `job_email_dumps`: only admins/strategists via user_roles
- Edge function validates auth token
- Raw email content stored for audit but not exposed to candidates/partners
- No PII leakage to unauthorized roles
