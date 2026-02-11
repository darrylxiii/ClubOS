

# Comprehensive Candidate Intelligence Pipeline

Build a multi-source enrichment system that automatically discovers and aggregates public information about candidates from across the internet, using data you already have (name, email, LinkedIn, resume) as starting points.

## What Data You Already Have (Starting Points)

From LinkedIn scraper + resume parser, you typically have:
- Full name
- Email address
- LinkedIn URL
- Current company + title
- Skills list
- Portfolio URL (if provided)

## New Enrichment Sources (4 Edge Functions)

### 1. Google Search Intelligence (`enrich-public-presence`)
**API**: Apify `apify/google-search-scraper` (uses existing `APIFY_API_KEY`)
**Input**: Candidate's full name + current company
**Discovers**:
- Conference talks and speaking engagements
- Published articles (Medium, Substack, industry blogs)
- Podcast appearances
- Press mentions and interviews
- Awards and recognitions
- Court/regulatory filings (public record only)

**Cost**: ~EUR 0.01 per candidate

### 2. GitHub / GitLab Technical Footprint (`enrich-github-profile`)
**API**: Apify GitHub scraper (uses existing `APIFY_API_KEY`)
**Input**: GitHub username (from LinkedIn, resume, or email-based GitHub search)
**Discovers**:
- Public repositories, stars, contributions
- Top programming languages
- Contribution streak and activity patterns
- Open-source involvement
- README quality and documentation habits

**Cost**: ~EUR 0.005 per candidate

### 3. Portfolio and Personal Site Scraper (`enrich-portfolio`)
**API**: Firecrawl connector (needs setup -- free tier available)
**Input**: Portfolio URL from profile, or discovered personal site from Google search
**Works for**:
- Behance portfolios (designers)
- Dribbble profiles (designers)
- Personal websites and blogs
- Medium/Substack profiles
- Speaker decks and slide shares
- Any public URL the candidate lists

**Cost**: Free tier covers initial usage

### 4. AI-Powered 360-Degree Brief (`generate-candidate-brief`)
**API**: Lovable AI (no extra cost, uses existing `LOVABLE_API_KEY`)
**Input**: All enriched data combined
**Generates**:
- 3-sentence executive summary
- Top 3 unique differentiators
- Risk factors (job hopping, skill gaps, notice concerns)
- Recommended interview angles
- Skill verification scores (cross-referencing claimed skills against GitHub repos, articles, work history)
- Overall confidence rating

## Database Changes (1 Migration)

Add 5 new columns to `candidate_profiles`:

| Column | Type | Purpose |
|--------|------|---------|
| `public_mentions` | jsonb | Google search results, articles, talks |
| `portfolio_data` | jsonb | Scraped portfolio/Behance/Dribbble content |
| `candidate_brief` | jsonb | AI-synthesized 360 brief |
| `skill_verification` | jsonb | Per-skill confidence with evidence links |
| `enrichment_sources` | text[] | Tracks which sources have run (e.g., `['linkedin', 'github', 'google', 'portfolio']`) |

Note: `github_profile_data`, `github_username`, `github_connected`, and `portfolio_url` columns already exist.

## New UI Components (3 Cards)

### Technical Footprint Card
- GitHub stats: repos, stars, top languages, contribution graph
- Shows "No GitHub profile found" gracefully for non-technical candidates
- Links to actual repos

### Public Presence Card
- Published articles with titles and sources
- Conference talks with event names
- Press mentions grouped by recency
- "No public presence found" fallback

### Candidate Brief Card (The Crown Jewel)
- AI executive summary
- Differentiators as highlighted chips
- Risk factors as amber warnings
- Skill verification: each claimed skill with a confidence bar and evidence count
- "Powered by QUIN" attribution

## Enrichment Flow

```text
User clicks "Deep Enrich" on candidate profile
                    |
                    v
       linkedin-scraper (existing, if not already done)
                    |
                    v
       enrich-github-profile (new)
       -- Tries GitHub username from LinkedIn/resume
       -- Falls back to email-based GitHub search
                    |
                    v
       enrich-public-presence (new)
       -- Searches "Full Name" + "Company" on Google
       -- Extracts articles, talks, mentions
                    |
                    v
       enrich-portfolio (new, requires Firecrawl)
       -- Scrapes portfolio_url if present
       -- Scrapes any personal sites found in Google results
                    |
                    v
       generate-candidate-brief (new)
       -- Feeds ALL data into Lovable AI
       -- Generates brief, verification scores, risk factors
                    |
                    v
       Profile refreshes with full intelligence
```

## Modified Files

| File | Change |
|------|--------|
| `src/pages/CandidateProfile.tsx` | Add 3 new cards to Overview tab |
| `src/components/candidate-profile/CandidateHeroSection.tsx` | Add "Deep Enrich" button + enrichment freshness indicator |

## Implementation Phases

**Phase 1** (immediate, no new APIs needed):
- Database migration for new columns
- `enrich-github-profile` edge function (Apify)
- `enrich-public-presence` edge function (Apify)
- `generate-candidate-brief` edge function (Lovable AI)
- All 3 new UI cards
- "Deep Enrich" button on hero section

**Phase 2** (requires Firecrawl connector setup):
- `enrich-portfolio` edge function
- Portfolio card enhancement with scraped content

## Privacy and Consent Safeguards

- Only scrapes publicly available information (no private data)
- All enrichment logged in `audit_logs`
- Candidates can see what was discovered about them in their own profile
- Ghost mode disables all enrichment activity
- Enrichment cooldown: max once per 24 hours per candidate
- All data stored server-side, never exposed to unauthorized roles

## Cost Per Full Enrichment

| Source | Cost |
|--------|------|
| LinkedIn (existing) | ~EUR 0.01 |
| GitHub (Apify) | ~EUR 0.005 |
| Google Search (Apify) | ~EUR 0.01 |
| Portfolio (Firecrawl) | Free tier |
| AI Brief (Lovable AI) | Included |
| **Total per candidate** | **~EUR 0.025** |

