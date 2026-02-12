

# Enrichment Progress Modal -- Real-Time Feedback for LinkedIn Sync and Deep Enrich

Replace the invisible toast-based enrichment flow with a dedicated full-screen modal that shows live progress, step-by-step results, and a final summary of everything discovered.

## The Problem

Both "Sync LinkedIn" and "Deep Enrich" fire background API calls with only a tiny toast at the bottom of the screen. Users click the button, see nothing meaningful happen, and have to guess whether it worked or what data was found.

## The Solution

A modal dialog that opens immediately on click and stays open throughout the enrichment process, showing:

1. **Live step-by-step progress** with animated status indicators (pending, running, complete, failed, skipped)
2. **Per-step result summaries** as each step finishes (e.g., "Found 23 repos, top language: TypeScript")
3. **A final summary card** showing total data points discovered, fields updated, and a "View Profile" dismiss button

## How It Works

### LinkedIn Sync Modal
Opens with steps:
- Scraping LinkedIn profile (spinner while running)
- Updating candidate fields (shows which fields got new data)
- Recalculating profile intelligence (completeness, tier, AI summary)
- Final summary: "Updated 8 fields: name, title, company, avatar, 12 skills merged, 4 work history entries, 2 education entries"

### Deep Enrich Modal
Opens with steps:
- GitHub scan (result: "Found profile: 23 repos, 142 stars, top langs: TypeScript, Python" or "No GitHub profile found -- skipped")
- Public presence scan (result: "Found 5 mentions: 2 articles, 1 conference talk, 2 press mentions")
- AI brief generation (result: "Generated executive summary, 3 differentiators, 2 risk factors, 8 skill verifications")
- Final summary card with totals

## New Component

### `EnrichmentProgressModal.tsx`
Located at `src/components/candidate-profile/EnrichmentProgressModal.tsx`

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `mode: 'linkedin' | 'deep-enrich'`
- `candidateId: string`
- `candidateData: any` (for passing linkedin_url, existing skills, etc.)
- `onComplete: () => void` (triggers profile reload)

**Internal state:**
- Array of steps, each with: `{ id, label, status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped', result?: string, details?: string[] }`
- Overall progress percentage
- Final summary object

**UI layout:**
- Dialog with glass-morphism styling
- Header with mode title and animated progress bar
- Step list with status icons (clock for pending, spinner for running, checkmark for complete, X for failed, skip icon for skipped)
- Each completed step expands to show a one-line result summary
- Failed steps show the error message in amber/red
- Bottom: "Close" button (disabled while running), or "View Updated Profile" on completion

## Modified Files

| File | Change |
|------|--------|
| `src/components/candidate-profile/CandidateHeroSection.tsx` | Replace inline `handleSyncLinkedIn` and `handleDeepEnrich` with modal open triggers; move enrichment logic into the modal |
| `src/pages/CandidateProfile.tsx` | Same for the header-level "Sync LinkedIn" button -- delegate to the modal |

## Step Execution Logic (Inside Modal)

### LinkedIn Sync Steps
1. **Scrape LinkedIn** -- calls `linkedin-scraper`, captures response fields
2. **Update Profile** -- applies null-safe field updates, counts fields changed
3. **Recalculate Intelligence** -- calls `enrich-candidate-profile`, captures new completeness/tier
4. **Done** -- builds summary from step results

### Deep Enrich Steps
1. **GitHub Scan** -- calls `enrich-github-profile`, shows repo count or "skipped"
2. **Public Presence** -- calls `enrich-public-presence`, shows mention count
3. **AI Brief** -- calls `generate-candidate-brief`, shows brief stats
4. **Done** -- builds summary

## Design Details

- Uses `framer-motion` for step transitions (fade in results as they complete)
- Glass card styling from `candidateProfileTokens.glass.card`
- Progress bar with gold accent gradient
- Step icons use semantic colors: blue for running, green for complete, red for failed, gray for pending
- "Powered by QUIN" attribution at the bottom
- Modal cannot be dismissed while enrichment is running (prevents partial state)
- On completion, the modal auto-scrolls to the summary and enables the close button

## Technical Notes

- All enrichment API calls and profile update logic moves from `CandidateHeroSection` into the modal component, keeping the hero section clean
- The modal handles errors per-step (one failed step does not block subsequent steps)
- Each step's result is derived from the actual API response data, not hardcoded
- The `onComplete` callback triggers `loadCandidate()` to refresh the profile with new data
