
# Sourcing Agent: From Internal-Only to External Discovery

## The Problem

The current headhunter agent has a critical limitation: it can **only match against candidates already in your database**. It generates a search persona from the job description, then queries your internal RAG system (`retrieve-context`). If the perfect candidate isn't already imported, the agent will never find them.

A true sourcing agent needs to **go out and find new people** -- searching LinkedIn, GitHub, and the web for candidates who match a role, then scraping their profiles and ingesting them into your pipeline automatically.

## Current State

| Capability | Status |
|-----------|--------|
| LinkedIn profile scraping (by URL) | Working -- Apify + Proxycurl fallback |
| GitHub profile enrichment | Working -- Apify scraper |
| Public presence search | Working -- Google Search via Apify |
| Internal semantic candidate search | Working -- embeddings + keyword |
| Headhunter agent (internal matching) | Working -- but limited to existing DB |
| **External candidate discovery** | **Missing entirely** |
| **LinkedIn People Search** | **Missing** |
| **Automated pipeline: search, scrape, ingest, rank** | **Missing** |

## What This Plan Delivers

A new **`source-candidates`** edge function that acts as a full autonomous sourcing pipeline:

```text
Job Description
    |
    v
[1] AI generates search criteria (titles, skills, industries, locations)
    |
    v
[2] Proxycurl Person Search API finds matching LinkedIn profiles
    |
    v
[3] For each result: scrape full profile via existing linkedin-scraper
    |
    v
[4] Deduplicate against existing candidate_profiles (by linkedin_url)
    |
    v
[5] Insert new candidates + trigger enrichment pipeline
    |
    v
[6] AI ranks all discovered candidates against the job
    |
    v
[7] Save ranked results to agent_matches with sourcing metadata
    |
    v
[8] Log everything to agent_decision_log for Agentic OS visibility
```

### Why Proxycurl Person Search

You already have the `PROXYCURL_API_KEY` configured. Proxycurl offers a **Person Search API** (`/search/person/`) that accepts structured criteria -- job title, skills, location, company, industry -- and returns matching LinkedIn profile URLs. This is the missing piece: going from "what I need" to "who exists out there."

Cost: approximately $0.03 per search result returned.

## Technical Implementation

### 1. New Edge Function: `source-candidates`

**Input**: `{ jobId: string, maxResults?: number, searchRadius?: 'narrow' | 'balanced' | 'wide' }`

**Step-by-step logic**:

1. **Fetch job details** from `jobs` table (title, description, location, skills, company)

2. **Generate search criteria via AI** (Lovable AI, gemini-3-flash-preview):
   - Use tool calling to extract structured output:
     ```text
     {
       current_role_title: "Senior Frontend Engineer",
       past_role_title: "Frontend Developer",
       skills: ["React", "TypeScript", "Next.js"],
       location: "Netherlands",
       industry: "SaaS",
       years_experience_min: 5,
       company_size: "51-200"
     }
     ```
   - The search radius parameter controls how strict vs. broad the criteria are

3. **Execute Proxycurl Person Search** (`POST https://nubela.co/proxycurl/api/search/person/`):
   - Pass structured criteria as query parameters
   - Returns list of LinkedIn profile URLs with basic info
   - Paginate if needed (up to maxResults, default 20)

4. **Deduplicate**: Check each returned LinkedIn URL against `candidate_profiles.linkedin_url` (using the existing URL normalization logic)

5. **Scrape new profiles**: For each new candidate, invoke the existing `linkedin-scraper` function to get full profile data

6. **Ingest into database**: Insert new `candidate_profiles` records with `source_channel: 'agent_sourced'` and `source_metadata` linking back to the job

7. **Trigger enrichment**: For each new candidate, invoke `enrich-candidate-profile` (AI summary, talent tier, move probability)

8. **AI Ranking**: Once all candidates are ingested, use AI to rank them against the job with a detailed match explanation per candidate

9. **Save to agent_matches**: Store ranked results with `source: 'external_sourcing'`

10. **Audit and log**: Write to `agent_decision_log` so it appears in the Agentic OS hub

### 2. Updated Headhunter Agent

Modify `run-headhunter-agent` to orchestrate both:
- **Internal search** (existing `retrieve-context` flow) -- fast, free
- **External sourcing** (new `source-candidates` flow) -- slower, costs per result

The agent first searches internally. If internal results are insufficient (< 5 candidates or low match scores), it automatically triggers external sourcing.

### 3. New UI: Sourcing Mission Panel

A new component in the Agentic OS hub and on the Job detail page showing:
- Active sourcing missions (which jobs are being sourced)
- Discovery progress (profiles found, scraped, ingested, ranked)
- Results grid with match scores and "Add to Shortlist" actions
- Cost tracking (Proxycurl credits used per mission)

### 4. Database Changes

```text
CREATE TABLE sourcing_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  status TEXT DEFAULT 'pending',  -- pending, searching, scraping, ranking, completed, failed
  search_criteria JSONB,
  search_radius TEXT DEFAULT 'balanced',
  profiles_found INT DEFAULT 0,
  profiles_new INT DEFAULT 0,
  profiles_ranked INT DEFAULT 0,
  cost_credits_used NUMERIC DEFAULT 0,
  results JSONB,
  error TEXT,
  triggered_by TEXT,  -- 'manual', 'heartbeat', 'job_publish'
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID
);

-- RLS: admin/strategist only
```

### 5. Heartbeat Integration

Update `agentic-heartbeat` to:
- When processing `job_status_open` events, run internal headhunter first
- If internal results < 5, automatically create a sourcing mission
- Process pending sourcing missions (max 2 concurrent to avoid rate limits)

### 6. Agent Chat Integration

Register sourcing as a capability in the Headhunter agent's registry so admins can say:
- "Source 15 senior engineers in Amsterdam for the Acme role"
- "Expand the search for job X to include Germany"
- "Show me what you found for the VP Product role"

## New Files

| File | Purpose |
|------|---------|
| `supabase/functions/source-candidates/index.ts` | Core sourcing pipeline (search, scrape, ingest, rank) |
| `src/components/admin/agentic/SourcingMissionsView.tsx` | Sourcing missions dashboard in Agentic OS |
| `src/components/jobs/SourcingPanel.tsx` | Sourcing panel on job detail page |
| `src/hooks/useSourcingMissions.ts` | Data hook for sourcing missions |

## Modified Files

| File | Change |
|------|--------|
| `supabase/functions/run-headhunter-agent/index.ts` | Orchestrate internal + external sourcing |
| `supabase/functions/agentic-heartbeat/index.ts` | Process sourcing missions |
| `src/pages/admin/AgenticOSHub.tsx` | Add "Sourcing" tab |
| `supabase/config.toml` | Register new function |

## Cost and Rate Limit Safeguards

- Default cap: 20 profiles per sourcing mission (configurable)
- Maximum 2 concurrent sourcing missions via heartbeat
- Daily budget limit stored in a config table (default: 100 searches/day)
- Each mission logs credits used for cost visibility
- Proxycurl rate limits handled with exponential backoff

## Data Flow Summary

```text
Job Published
    |
    v
Heartbeat picks up event
    |
    v
Headhunter runs internal search
    |
    +-- 5+ good matches? --> Done (save to agent_matches)
    |
    +-- < 5 matches? --> Create sourcing_mission
                              |
                              v
                         source-candidates runs
                              |
                              v
                         Proxycurl Person Search
                              |
                              v
                         linkedin-scraper (per profile)
                              |
                              v
                         enrich-candidate-profile
                              |
                              v
                         AI ranking against job
                              |
                              v
                         Save to agent_matches
                              |
                              v
                         Visible in Agentic OS + Job page
```
