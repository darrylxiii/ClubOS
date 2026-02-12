
# Score Matrix Audit: Current State 22/100

## Critical Findings

Every dimension of the assessment engine has fundamental data pipeline failures. Here is the honest scorecard and what it takes to reach 100/100.

---

## Current Scores Per Dimension

| Dimension | Current Score | Why |
|---|---|---|
| Skills Match | 5/100 | `candidate_profiles.skills` is `[]` for 154 of 155 candidates. Only 9 rows exist in `profile_skills` (2 users). `jobs.requirements` is `[]` for ALL 31 published jobs. Zero data on both sides = zero matching possible. |
| Experience | 35/100 | `years_of_experience` exists for this candidate (19.3 years), and `work_history` has 5 entries. But the engine ignores work history content entirely -- it only reads the number and does a naive title-keyword match ("senior", "lead") for expected years. No skill extraction from roles. |
| Engagement | 5/100 | 0 rows in `candidate_interactions`, 0 rows in `applications`, `last_activity_at` is NULL. The only non-zero signal is `profile_completeness: 32`. The engine has no data to score. |
| Culture Fit | 0/100 | Zero interview feedback exists for this candidate (0 applications = 0 interviews). The engine returns "No interview culture fit data" with confidence 0. |
| Salary Match | 40/100 | Candidate has `desired_salary_min: 70000, desired_salary_max: 90000, currency: EUR`. Jobs have salary data (25 of 31). But the edge function references `job.salary_min/max` which are integers (monthly for some jobs, annual for others) -- no unit normalization. Also, `nice_to_have` column does not exist on `jobs` table but the code references it. |
| Location | 30/100 | Candidate has `desired_locations: ["Amsterdam"]` and `remote_preference: "hybrid"`. Jobs have `location` text and `is_remote` boolean. But the edge function reads `candidate.desired_locations` (correct) but also checks a non-existent `preferred_locations` column. It ignores `job_locations` table (9 entries) and `location_city`/`location_country_code` columns. |

**Overall: 22/100** -- The engine exists structurally but has zero functioning data pipelines feeding it.

---

## Root Cause: 7 Broken Data Pipelines

### Pipeline 1: Skills are never populated
- `candidate_profiles.skills` is `[]` for 99.4% of candidates
- `profile_skills` has only 9 rows across 2 users
- Work history has rich role titles ("Senior Graphic Designer", "Art Director") but skills are never extracted
- Education has degrees ("Master in Art Direction for Fashion") but skills are never extracted
- LinkedIn scraper does NOT populate skills into the skills array

### Pipeline 2: Job requirements are never populated
- `jobs.requirements` is `[]` for ALL 31 published jobs
- Job descriptions contain skills in free text (e.g., "Java, JavaScript, XML, HTML5 and CSS3") but are never parsed
- No `nice_to_have` column exists on `jobs` table (code references it but it does not exist)
- The `skills_taxonomy` has 200 entries but synonyms are all empty arrays `[]`

### Pipeline 3: Engagement tracking is disconnected
- `candidate_interactions` has 0 rows for this candidate
- No mechanism logs when a strategist messages, calls, or emails a candidate
- `unified_communications` exists but is not fed into `candidate_interactions`
- Response time tracking does not exist

### Pipeline 4: Culture fit has no pre-interview baseline
- Culture fit is 100% dependent on `interview_feedback.culture_fit_score`
- No initial culture fit signal from profile data, personality insights, or AI analysis
- `personality_insights` column exists but is not used by the assessment engine
- `candidate_brief` column exists but is not used

### Pipeline 5: Salary units are inconsistent
- Some jobs have monthly salaries (e.g., Mendix Consultant: 4500-6000 EUR/month)
- Some jobs have annual salaries (e.g., Marketing Manager: 40000-75000 EUR/year)
- No `salary_period` column exists on `jobs` to distinguish monthly vs annual
- The engine compares raw numbers without normalization

### Pipeline 6: Location matching ignores structured data
- `job_locations` table has 9 entries with proper `city`, `country`, `location_type` fields
- The engine only reads `jobs.location` (free text) and `employment_type` for remote detection
- It ignores `jobs.is_remote` boolean entirely
- It ignores `jobs.location_city` and `jobs.location_country_code`

### Pipeline 7: Taxonomy synonyms are empty
- All 200 `skills_taxonomy` entries have `synonyms: []`
- "JS" will never match "JavaScript"
- "React" will never match "React.js" or "ReactJS"

---

## Plan to Reach 100/100

### Phase 1: Fill the Skills Pipeline (Skills Match 5 -> 90)

**1A. AI Skill Extraction from Work History + Education**
- New edge function: `extract-skills-from-experience`
- For each candidate with `work_history` or `education` but empty `skills`:
  - Send role titles, descriptions, and education fields to Lovable AI (Gemini 3 Flash)
  - Prompt: "Extract all professional skills from these roles and education. Return as JSON array."
  - Write extracted skills back to `candidate_profiles.skills` JSONB
  - Also create `profile_skills` rows with inferred proficiency levels
- Trigger: on LinkedIn sync, on profile update, on manual "Enrich" click

**1B. AI Skill Extraction from Job Descriptions**
- New edge function: `extract-job-requirements`
- For each job with a `description` but empty `requirements`:
  - Send job description to Lovable AI
  - Prompt: "Extract must-have skills and nice-to-have skills from this job description."
  - Write must-haves to `jobs.requirements` JSONB
  - Add `nice_to_have` column to `jobs` table and populate
- Trigger: on job create/update, on JD upload

**1C. Populate Skills Taxonomy Synonyms**
- Migration or seed script to add synonyms to all 200 taxonomy entries
- Examples: `javascript -> ["js", "ecmascript"]`, `react -> ["reactjs", "react.js"]`, `python -> ["py"]`
- Add common abbreviations, framework variants, and alternative names

**1D. Update Assessment Engine**
- Read from both `candidate_profiles.skills` AND extracted skills from work history
- Read from both `jobs.requirements` AND `jobs.nice_to_have` (new column)
- Use taxonomy synonyms for fuzzy matching

### Phase 2: Fix Engagement Pipeline (5 -> 85)

**2A. Feed Communications into Interactions**
- When a `unified_communications` entry is created (email sent, call logged), also create a `candidate_interactions` row
- Track: first response time, average response time, total touchpoints
- New columns on `candidate_interactions`: `response_time_minutes`, `interaction_quality`

**2B. Track Candidate Platform Activity**
- Log when candidates view jobs, update profiles, submit applications
- Feed these into the engagement calculation
- Use `candidate_application_logs` that already exist but are empty

**2C. Enhance Engagement Scoring**
- Add response speed scoring: < 1 hour = 100, < 4 hours = 80, < 24 hours = 60, > 48 hours = 20
- Add "initial response time" as a key signal (first reply after outreach)
- Weight recent activity higher than old activity (exponential decay)

### Phase 3: Bootstrap Culture Fit (0 -> 70)

**3A. AI Pre-Interview Culture Fit Baseline**
- Use `personality_insights` and `candidate_brief` (already exist on profiles)
- Use AI to analyze communication style from `unified_communications`
- Generate an initial culture fit estimate (low confidence, 0.2-0.4)
- Factors: communication formality, response patterns, career trajectory alignment

**3B. Post-Conversation Recalculation**
- After each strategist conversation (logged in `unified_communications`):
  - Run `extract-communication-facts` to extract relationship signals
  - Update culture fit score incorporating new signals
  - Increase confidence incrementally

**3C. Interview Feedback Integration (already exists but needs data)**
- Culture fit becomes high-confidence (0.8+) after interview feedback
- Aggregate multiple interviewers' scores
- Flag concerns from `company_candidate_feedback.culture_fit_issues`

### Phase 4: Fix Salary Match (40 -> 95)

**4A. Add Salary Period Column**
- Add `salary_period` column to `jobs`: `'annual'`, `'monthly'`, `'daily'`, `'hourly'`
- Default to `'annual'` for existing jobs
- Normalize all comparisons to annual: monthly * 12, daily * 220, hourly * 1760

**4B. Currency Normalization**
- Both candidate and jobs use EUR in this dataset, but add conversion rates for future-proofing
- Store candidate's `preferred_currency` and job's `currency`
- Convert to common base before comparison

**4C. Current vs. Desired Salary Intelligence**
- Use `current_salary_min/max` (columns exist) to detect salary expectations vs current pay
- If desired salary is 20%+ above current: flag "ambitious jump"
- Show this context in the salary match card

### Phase 5: Fix Location Match (30 -> 95)

**5A. Use Structured Location Data**
- Read from `job_locations` table (has `city`, `country`, `location_type`)
- Read `jobs.is_remote` boolean (currently ignored)
- Read `jobs.location_city` and `jobs.location_country_code`
- Match against `candidate_profiles.desired_locations` array

**5B. Geo-Proximity Scoring**
- If candidate wants "Amsterdam" and job is in "Rijswijk" (15km away): score 85, not 0
- Use country-level matching as fallback: same country = 70
- Use `jobs.latitude`/`jobs.longitude` if available for distance calculation

**5C. Remote/Hybrid Matrix**
- Proper 2D matrix scoring instead of current if/else chain:

```text
                  Job: Remote  Job: Hybrid  Job: Onsite
Candidate Remote:    100          70           30
Candidate Hybrid:     90          95           60
Candidate Onsite:     50          70          100
```

### Phase 6: Fix Experience Match (35 -> 90)

**6A. Extract Seniority from Job**
- Use `jobs.experience_level` and `jobs.seniority_level` columns (they exist but are unused)
- Map to expected years: Junior=1-3, Mid=3-6, Senior=5-10, Lead=8-15, Director=12+

**6B. Analyze Work History Depth**
- Count actual roles, not just `years_of_experience`
- Detect career progression (Designer -> Senior Designer -> Art Director = strong signal)
- Industry relevance: match candidate's industry experience to job's company industry

**6C. Education Relevance**
- Match education field to job requirements
- "Master in Art Direction for Fashion" is highly relevant for "Creative Strategist" but irrelevant for "Mendix Consultant"

### Phase 7: Edge Function Rewrite

Complete rewrite of `calculate-assessment-scores` to:
1. Use ALL correct column names (fix `desired_locations` vs `preferred_locations` bug)
2. Read from `jobs` table (not `job_postings` which does not exist)
3. Read `nice_to_have` from new column
4. Use `job_locations` table for structured location data
5. Use `jobs.is_remote` boolean
6. Normalize salary periods
7. Read `personality_insights` and `candidate_brief` for culture fit baseline
8. Extract skills from work history if `skills` is empty
9. Use taxonomy synonyms for matching
10. Add response time metrics to engagement

### Phase 8: UI Enhancements

- Show data gaps prominently: "Skills Match cannot be computed -- add skills to profile"
- Add "Fix this" action buttons that link to the data entry needed
- Show what data was used for each score (transparency)
- Show score change history (computed_at timestamps)

---

## Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/extract-skills-from-experience/index.ts` | AI extraction of skills from work_history and education |
| `supabase/functions/extract-job-requirements/index.ts` | AI extraction of must-have/nice-to-have from job descriptions |

## Files to Modify

| File | Change |
|---|---|
| Migration SQL | Add `nice_to_have` JSONB and `salary_period` TEXT to `jobs`; populate taxonomy synonyms |
| `supabase/functions/calculate-assessment-scores/index.ts` | Complete rewrite with all 7 pipeline fixes |
| `src/components/candidate-profile/CandidateSkillAssessment.tsx` | Add data-gap indicators and "Fix this" actions |
| `src/components/candidate-profile/SkillMatchBreakdown.tsx` | Show AI-extracted skills from work history |
| `src/components/candidate-profile/CultureFitSignals.tsx` | Add pre-interview AI baseline section |
| `src/components/candidate-profile/EngagementTimeline.tsx` | Add response time metrics and communication activity |
| `src/hooks/useAssessmentScores.ts` | Trigger skill extraction before assessment if skills are empty |
| `supabase/config.toml` | Register new edge functions |

## Scoring Projection After Implementation

| Dimension | Before | After | Key Change |
|---|---|---|---|
| Skills Match | 5 | 90 | AI extracts skills from both sides; taxonomy synonyms work |
| Experience | 35 | 90 | Uses seniority columns, work history depth, education relevance |
| Engagement | 5 | 85 | Communications feed interactions; response time tracking |
| Culture Fit | 0 | 70 | AI baseline from personality + comms; grows with feedback |
| Salary Match | 40 | 95 | Period normalization; current vs desired intelligence |
| Location | 30 | 95 | Structured data from job_locations; geo-proximity; remote matrix |
| **Overall** | **22** | **88** | With full data pipelines connected |

To reach true 100/100 requires: (a) all candidates have populated skills, salary, and location preferences, (b) all jobs have parsed requirements with nice-to-haves, (c) at least one conversation logged per candidate for engagement, and (d) personality insights generated for culture fit baseline. The system can score 88/100 architecturally; the remaining 12 points come from data completeness across the candidate and job population.
