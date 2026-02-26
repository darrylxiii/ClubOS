

# Fix Triple-Firing Dossiers and Briefings on Job Dashboard

## Problem

When you open a job dashboard, the page renders the **top 3 active candidates** in two separate sections:
- "Top Candidate Intelligence" — renders 3x `CandidateIntelligenceDossier` (each auto-calls `generate-candidate-dossier`)
- "Decision-Ready Briefings" — renders 3x `ExecutiveBriefingCard` (each auto-calls `generate-executive-briefing`)

Both components have a `useEffect` that fires the AI call immediately on mount. That is **6 AI edge function calls** every single time you open a job page, even if nothing has changed.

## Root Cause

1. `CandidateIntelligenceDossier` line 37-39: `useEffect(() => { loadDossier(); }, [candidateId, jobId])` — auto-fires on mount
2. `ExecutiveBriefingCard` line 48-52: `useEffect(() => { if (!compact) { loadBriefing(); } }, [candidateId, jobId, compact])` — auto-fires on mount when not compact

Both lack any caching or change-detection.

## Solution

### 1. Convert Both Components to On-Demand (Button-Triggered)

Remove the `useEffect` auto-fire from both components. Instead, show a "Generate" button by default. Users click to generate when they actually need the data.

**CandidateIntelligenceDossier.tsx:**
- Remove the `useEffect` on lines 37-39
- The component already has a fallback UI with a "Generate Intelligence Dossier" button (lines 52-63) — this will now be the default state

**ExecutiveBriefingCard.tsx:**
- Remove the `useEffect` on lines 48-52
- The component already has a fallback UI with a "Generate Executive Briefing" button (lines 67-77) — this will now be the default state

### 2. Add Server-Side TTL Caching to Both Edge Functions

When a user does click "Generate", the edge function should check for a recent cached result first and skip AI generation if the underlying data has not changed.

**`generate-candidate-dossier` edge function:**
- Before calling AI, query `ai_generated_content` for a result with `content_type = 'candidate_dossier'` and matching `candidate_id` + `job_id` created within the last 2 hours
- If found, return cached result immediately (zero AI cost)
- If not found or older than 2 hours, generate fresh and store in `ai_generated_content`

**`generate-executive-briefing` edge function:**
- Same pattern: check for cached result with `content_type = 'executive_briefing'` within 2 hours
- Return cached if fresh, regenerate if stale
- Add a `force` parameter so the "Regenerate" button can bypass the cache

### 3. Smart Change Detection (Hash-Based Skip)

To handle the case where a user clicks "Generate" but nothing has changed since the last generation:
- When generating, compute a simple hash of the input data (application count, statuses, scores, interview count)
- Store this hash alongside the cached result
- On next generation request, compute hash of current data — if it matches the stored hash, return the cached result regardless of TTL
- This means even after 2 hours, if nothing changed, it still skips regeneration

## Estimated Savings

- **Before:** 6 AI calls per job page open (every single visit)
- **After:** 0 AI calls per job page open; only on-demand when user clicks; cached for 2 hours; skipped entirely if no data changed
- At ~3 job opens per day, this saves ~18 AI calls/day just from this one page

## Files Modified

| File | Change |
|---|---|
| `src/components/intelligence/CandidateIntelligenceDossier.tsx` | Remove `useEffect` auto-fire |
| `src/components/intelligence/ExecutiveBriefingCard.tsx` | Remove `useEffect` auto-fire |
| `supabase/functions/generate-candidate-dossier/index.ts` | Add TTL cache check + hash-based skip |
| `supabase/functions/generate-executive-briefing/index.ts` | Add TTL cache check + hash-based skip |

