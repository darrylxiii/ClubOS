
# Salary Insights Real Data Implementation Plan

## Current Score: 35/100 → Target: 85+/100

## Overview

Transform the `/salary-insights` page from static placeholder data to a comprehensive, real-time market intelligence system powered by multiple data sources.

---

## Phase 1: Foundation Fixes (Immediate)

### 1.1 Fix Experience Filtering
The experience slider currently has no effect on data. We'll implement proper PostgreSQL range filtering.

**File**: `src/pages/SalaryInsights.tsx`
- Add experience range to the Supabase query using the `@>` (contains) operator
- Filter benchmarks where the candidate's years fall within the stored range

### 1.2 Remove Hardcoded Fallbacks
Replace the arbitrary €45,000-€75,000 fallback with:
- Clear "No data available" messaging
- Suggestion to adjust filters
- Option to request data for this role/location

### 1.3 Add Data Quality Indicators
Display alongside salary data:
- Sample size (e.g., "Based on 150 data points")
- Last updated timestamp
- Confidence score (low/medium/high based on sample size)

---

## Phase 2: Database Enhancement

### 2.1 Expand Benchmark Seed Data
Add ~150 additional benchmark records via database migration:

**New Locations**:
- Paris, Munich, Dublin, Barcelona, Zurich, Stockholm, Copenhagen, Vienna, Warsaw, Milan

**New Roles**:
- VP of Engineering, CTO, CFO
- Backend Engineer, Frontend Engineer, Fullstack Engineer
- ML Engineer, AI Engineer, Platform Engineer
- Head of Product, Chief Product Officer
- UX Researcher, Design Director
- HR Business Partner, Head of People

**New Currencies**:
- USD, CHF, SEK, DKK, PLN

### 2.2 Fix Market Intelligence Aggregation
Update the `aggregate-market-intelligence` edge function:
- Correct column names to match actual schema
- Add scheduling via pg_cron to run daily
- Blend internal platform data with seeded benchmarks

---

## Phase 3: Internal Data Aggregation

### 3.1 Create Composite Benchmarks
New edge function: `calculate-live-salary-benchmarks`
- Aggregate salary data from:
  - Candidate profiles (current + desired salary)
  - Job postings with salary ranges
  - Offers extended through the platform
- Weight by recency and sample size
- Store in `salary_benchmarks` with `source = 'platform'` flag

### 3.2 Real-Time Blending
Update the frontend to:
- Query both seeded and platform-derived benchmarks
- Display "Sources: Market Data + Platform Intelligence"
- Show breakdown of where data comes from

---

## Phase 4: External API Integration

### 4.1 New Edge Function: `sync-salary-market-data`
Create a scheduled function that fetches from external sources:

**Primary Options** (choose based on API availability):
1. **Levels.fyi** - Excellent for tech roles
2. **Open Government Data** - Free EU salary statistics
3. **Company Glassdoor Scraping** - Public company salary data

**Function Logic**:
```text
1. Fetch external data for target roles/locations
2. Normalize to standard schema
3. Upsert to salary_benchmarks with source='external'
4. Calculate confidence based on freshness + sample size
```

### 4.2 API Secret Management
- Add API key secret via the secrets tool if using paid APIs
- Or use free public data sources (EU statistics, government labor data)

---

## Phase 5: UI/UX Enhancements

### 5.1 Data Transparency Panel
Add a collapsible section showing:
- "Data Sources" (Platform: 40%, Market Data: 35%, External: 25%)
- "Last Updated: 2 days ago"
- "Sample Size: 450 professionals"

### 5.2 Personalized Insights (for logged-in users)
- Pre-fill role/location from user profile
- Show "Your Position" marker on the salary range
- Generate QUIN-powered negotiation tips

### 5.3 Trend Indicators
- Show 6-month trend arrows (↑ +5%, ↓ -2%)
- Compare current vs. previous quarter
- Highlight "hot" roles with high demand

---

## Technical Implementation Details

### Database Changes
1. Add `source` column to `salary_benchmarks` (values: 'seed', 'platform', 'external')
2. Add `confidence_score` column (0.0 - 1.0)
3. Add `fetched_at` timestamp for external data

### Files to Create
- `supabase/functions/calculate-live-salary-benchmarks/index.ts`
- `supabase/functions/sync-salary-market-data/index.ts`
- `src/hooks/useSalaryBenchmarks.ts` (dedicated hook)
- `src/components/salary/DataQualityIndicator.tsx`
- `src/components/salary/SalaryTrendChart.tsx`

### Files to Modify
- `src/pages/SalaryInsights.tsx` - Major refactor
- `supabase/functions/aggregate-market-intelligence/index.ts` - Fix column names

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Benchmark Records | 59 | 500+ |
| Locations Covered | 6 | 20+ |
| Roles Covered | 18 | 50+ |
| Experience Filtering | Broken | Working |
| Data Freshness | Static | Daily updates |
| External Sources | 0 | 1-2 APIs |
| Score | 35/100 | 85+/100 |

---

## Implementation Priority

1. **Day 1**: Fix experience filtering (quick win)
2. **Day 2-3**: Expand seed data via migration, add quality indicators
3. **Week 1**: Build internal aggregation function
4. **Week 2**: Add external API integration
5. **Week 3**: Personalization + trend visualization

This approach prioritizes fixing broken functionality first, then systematically adding real data sources while maintaining the premium, trustworthy feel essential to The Quantum Club brand.
