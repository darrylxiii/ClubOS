
# Fix: "Extract from CV" Button and Full Resume-Based Skill Matrix

## Problems Found

1. **Edge function returns 401 (JWT rejected)**: `extract-skills-from-experience` has `verify_jwt = true` in config.toml, causing the request to be rejected
2. **Function reads empty arrays, not the actual resume**: It looks at `work_history` and `education` fields (both empty), but ignores the uploaded CV file (`candidate_documents` table has the PDF)
3. **Data type mismatch**: `profile_skills.proficiency_level` is an INTEGER column, but the function tries to write strings like `"beginner"`
4. **Missing unique constraint**: The `onConflict: 'user_id,skill_name'` has no backing unique index, causing silent failures
5. **No job-context matching**: Skills are extracted generically -- not matched against the specific job's requirements to fill the matrix

## Plan

### 1. Database Migration
- Add a unique index on `profile_skills(user_id, skill_name)` so upserts work
- Add a proficiency mapping comment (the column stays INTEGER; we map beginner=1, intermediate=2, advanced=3, expert=4 in code)

### 2. Set `verify_jwt = false` in config.toml
Change the entry for `extract-skills-from-experience` so the function is reachable. Auth is validated inside the function via the service role key.

### 3. Rewrite `extract-skills-from-experience/index.ts`

The new flow:
1. Accept `candidate_id` and optional `job_id`
2. Look up the candidate's uploaded CV from `candidate_documents`
3. Download the PDF from storage, convert to base64
4. Send to Lovable AI (Gemini Flash) with the resume content
5. If `job_id` is provided, also fetch the job's `requirements` and `nice_to_have` -- ask the AI to specifically assess each requirement against the resume
6. Return extracted skills with proficiency (mapped to integers 1-4) and job match results
7. Store in `profile_skills` with proper integer proficiency and `candidate_profiles.skills`

### 4. Update `SkillMatchBreakdown.tsx`

- Pass `jobId` to the `extractSkills` call so the edge function knows which job to match against
- Show the "Extract from CV" button even when skills already exist (so users can re-extract)
- After extraction, refresh the skills data without a full page reload (use state update instead of `window.location.reload()`)

### 5. Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | `verify_jwt = false` for `extract-skills-from-experience` |
| `supabase/functions/extract-skills-from-experience/index.ts` | Full rewrite: read actual CV PDF, extract + match skills against job requirements |
| `src/components/candidate-profile/SkillMatchBreakdown.tsx` | Pass `jobId` to extraction, show button always, refresh without reload |

### Technical Details

**Proficiency mapping** (string to integer):
- beginner = 1, intermediate = 2, advanced = 3, expert = 4

**CV retrieval**: Query `candidate_documents` for the latest `document_type = 'cv'` or `'resume'`, download from the `resumes` storage bucket using the `file_url` path, convert to base64 for multimodal AI processing.

**Job matching prompt**: When `job_id` is provided, the AI prompt includes each must-have and nice-to-have requirement, asking for a per-requirement assessment (matched/not matched + evidence from the resume).

**No new edge functions or storage buckets needed.**
