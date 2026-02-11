

# Candidate Data Completeness Audit

## Current Score: 34 / 100

The database schema is surprisingly rich -- you have the right columns and tables for a world-class talent platform. The problem is that almost none of them are being populated. The infrastructure exists but the data pipeline is hollow.

---

## Scorecard Breakdown

| Category | Max | Current | Status |
|---|---|---|---|
| **A. Core Identity** (name, email, phone, avatar, LinkedIn) | 10 | 7 | Most candidates have name + email. Phone and LinkedIn sparse. |
| **B. Professional Context** (title, company, years of exp) | 10 | 5 | 101/130 have title, 70 have company, 0 have years_of_experience. |
| **C. Skills & Competencies** | 10 | 1 | Only 1/130 candidate_profiles has skills populated. 9 rows total in profile_skills. Skills taxonomy table is empty. |
| **D. Work History & Education** | 10 | 1 | 0/130 have work_history or education in candidate_profiles. 17 rows in profile_experience, 6 in profile_education (user-managed profiles only). |
| **E. Compensation & Preferences** | 10 | 2 | Only 25/130 have salary data. 0 have industry_preference. Notice period sparse. |
| **F. Tagging & Categorization** | 10 | 2 | 104/130 have tags but they are all just "manually_added" -- no meaningful categorization. No tag taxonomy or management UI for strategists. |
| **G. CV / Documents** | 8 | 2 | Only 24/130 have a resume_url. 9 total documents stored. No CV parsing pipeline filling fields. |
| **H. AI Enrichment & Scoring** | 10 | 1 | 0 AI summaries, 0 embeddings generated, 0 enrichment data. Talent tier is "pool" for all 130. Tier score and move_probability exist but aren't differentiated. |
| **I. Interview Intelligence** | 7 | 0 | candidate_interview_performance has 0 rows. Scorecards exist in schema but no data flows from meetings to candidate profiles. |
| **J. Auto-Matching for New Jobs** | 10 | 3 | talent_matches table exists, generate_talent_matches RPC exists, profile_embedding column exists -- but 0 embeddings generated, 0 talent_matches created, 253 match_scores exist (from user-side). No trigger on job creation. |
| **K. Re-engagement & Recall** | 5 | 1 | auto_reengagement_enabled defaults to true for all. But no actual re-engagement logic runs. candidate_company_history is empty. |

---

## What the Schema Has (Well Designed)

The database architecture is actually very solid. Here is what already exists:

- **candidate_profiles**: 80+ columns covering identity, comp, AI fields, tiering, embeddings, ghost mode, re-engagement
- **profile_skills**: Structured skill tracking with proficiency, years, endorsements, AI verification
- **profile_experience / profile_education**: Full structured work and education history
- **skills_taxonomy**: Hierarchical skill dictionary with industry relevance scores and demand trends
- **candidate_interview_performance**: Per-meeting AI scores (clarity, confidence, competence, cultural fit, red/green flags)
- **candidate_company_history**: Historical interaction tracking with companies (stage reached, could_revisit, revisit_after)
- **candidate_assessment_profiles**: Soft skills assessment (stress resilience, coachability, blind spots, culture fit)
- **talent_matches**: Job-to-candidate recommendations with match_factors
- **candidate_documents**: Versioned, typed document storage with parsing results
- **candidate_notes**: Typed, tagged strategist notes
- **profile_embedding (vector)**: Ready for semantic matching
- **job_embedding (vector)**: Ready on the jobs side too

---

## What is Missing (Why the Score is 34)

### 1. No Data Ingestion Pipeline (biggest gap)
When a candidate is added manually or via LinkedIn, almost nothing gets populated beyond name, email, and title. There is no:
- CV parsing that fills skills, work_history, education, certifications, languages
- LinkedIn data enrichment that fills current_company, years_of_experience, work history
- Profile completeness calculation (all 130 candidates show 0% completeness)

### 2. No Meaningful Tagging System
Tags exist as a JSONB array, but every candidate just has "manually_added". There is no:
- Tag taxonomy (seniority level, function, industry, availability, quality tier)
- Tag management UI for strategists to add/remove structured tags
- Auto-tagging based on parsed CV data or job interactions
- Filterable tag-based search for "show me all Senior Product Managers in fintech"

### 3. No Embedding Generation
Both candidate_profiles.profile_embedding and jobs.job_embedding columns exist, but 0 embeddings have been generated. This means:
- No semantic matching when a new job is created
- No "find similar candidates" capability
- The generate_talent_matches RPC cannot produce quality results

### 4. No Auto-Match on Job Creation
There is no trigger or workflow that fires when a new job is created to:
- Generate embeddings for the job description
- Run vector similarity against candidate_profiles.profile_embedding
- Create talent_matches recommendations
- Notify strategists of strong matches

### 5. No Interview-to-Profile Feedback Loop
Interview performance data (scorecards, AI analysis) does not flow back to the candidate_profiles aggregate fields (interview_score_avg, key_strengths_aggregated, etc.)

---

## Implementation Plan

### Phase 1: Data Foundation (Score impact: +20 points, target: 54/100)

**1.1 Profile Completeness Engine**
- Create a database function `calculate_candidate_completeness()` that scores based on filled fields
- Add trigger on candidate_profiles UPDATE to recalculate
- Fields weighted: name (5), email (5), phone (3), title (5), company (5), skills (10), work_history (10), education (5), salary (8), resume (10), LinkedIn (5), languages (3), certifications (3), notice_period (5), location prefs (5), work_authorization (3), tags (5), AI summary (5)

**1.2 Structured Tag Taxonomy**
- Create `candidate_tag_definitions` table with: id, name, category (seniority, function, industry, availability, quality, custom), color, created_by
- Create `candidate_tag_assignments` table with: candidate_id, tag_id, assigned_by, assigned_at
- Migrate existing JSONB tags to the relational model
- Build tag management UI: autocomplete tag input on candidate detail, bulk tagging in list view
- Seed with standard tags:
  - **Seniority**: Junior, Mid, Senior, Lead, Director, VP, C-Level
  - **Function**: Engineering, Product, Design, Marketing, Sales, Operations, Finance, HR, Legal
  - **Industry**: Fintech, Fashion, Beauty, Tech, Healthcare, SaaS, E-commerce
  - **Availability**: Immediately Available, 1-Month Notice, 3-Month Notice, Passive, Not Looking
  - **Quality**: Star Candidate, Strong, Needs Development, Archive
  - **Source**: Referral, LinkedIn, Direct Apply, Sourced, Agency

**1.3 CV Parse Data Extraction**
- Enhance existing CV upload to extract and fill: skills[], work_history[], education[], certifications[], languages[], years_of_experience
- On parse completion, auto-assign function and seniority tags based on extracted data

### Phase 2: Intelligence Layer (Score impact: +25 points, target: 79/100)

**2.1 Embedding Generation Pipeline**
- Create edge function `generate-candidate-embedding` that generates vector embeddings from: skills + title + work_history summary + AI summary
- Create edge function `generate-job-embedding` from: title + description + requirements
- Trigger embedding generation on candidate profile update and job creation
- Store in existing profile_embedding and job_embedding columns

**2.2 Auto-Match on Job Creation**
- Create database trigger `on_job_published` that calls an edge function
- Edge function: query top-N candidates by vector similarity, considering filters (location, salary range, work authorization)
- Insert results into talent_matches with match_factors explaining why
- Notify assigned strategist with "QUIN found 12 potential matches for [Job Title]"

**2.3 AI Enrichment**
- Generate ai_summary for each candidate from their aggregated data
- Calculate differentiated talent_tier (star / strong / pool / archive) based on: completeness, skills match history, interview performance, engagement
- Calculate move_probability from: notice_period, actively_looking, last_activity recency, contract_end_date

### Phase 3: Feedback Loops (Score impact: +21 points, target: 100/100)

**3.1 Interview-to-Profile Aggregation**
- After scorecard submission, aggregate scores into candidate_profiles: interview_score_avg, interview_count, key_strengths_aggregated, key_weaknesses_aggregated
- Update talent_tier based on interview performance

**3.2 Company History Tracking**
- When an application reaches a terminal state (hired, rejected, withdrawn), auto-create a candidate_company_history record
- Track could_revisit and revisit_after for silver-medalist re-engagement

**3.3 Skills Taxonomy Population**
- Seed skills_taxonomy with 200+ skills across tech, business, creative categories
- Link profile_skills to taxonomy for standardization
- Track demand trends from active job requirements

**3.4 Re-engagement Automation**
- Scheduled function that checks: candidates with could_revisit=true AND revisit_after < now()
- Checks if any new jobs match their profile
- Creates pilot task for strategist: "Re-engage [Name] -- new role at [Company] matches their profile"

---

## Technical Details

### New Tables
```text
candidate_tag_definitions
  - id (uuid, PK)
  - name (text, unique per category)
  - category (text: seniority, function, industry, availability, quality, source, custom)
  - color (text)
  - description (text, nullable)
  - is_system (boolean, default false)
  - created_by (uuid)
  - created_at (timestamptz)

candidate_tag_assignments
  - id (uuid, PK)
  - candidate_id (uuid, FK -> candidate_profiles)
  - tag_id (uuid, FK -> candidate_tag_definitions)
  - assigned_by (uuid)
  - assigned_at (timestamptz)
  - UNIQUE(candidate_id, tag_id)
```

### New Edge Functions
- `generate-candidate-embedding` -- vectorize candidate profile data
- `generate-job-embedding` -- vectorize job description
- `auto-match-candidates` -- run on job publish, find top matches
- `enrich-candidate-profile` -- AI summary, tier calculation, move probability

### New Database Functions
- `calculate_candidate_completeness(p_candidate_id uuid)` -- returns integer 0-100
- `aggregate_interview_performance(p_candidate_id uuid)` -- updates avg scores
- `record_company_history()` -- trigger on application status change

### UI Changes
- Tag management component on candidate detail page (autocomplete + chips)
- Bulk tag assignment in candidate list view
- Tag filter sidebar in candidate search
- Completeness score badge on candidate cards
- "Matched Candidates" tab auto-populated when a job is published

