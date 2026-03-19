

# Add "Add to Job" Button to Candidate Profile Hero

## What

Place an "Add to Job" button next to the "Deep Enrich" button in `CandidateHeroSection.tsx`, visible only to admins. It opens the existing `AddToJobDialog`.

## Change

### File: `src/components/candidate-profile/CandidateHeroSection.tsx`

1. Import `AddToJobDialog` and `Briefcase` icon
2. Add state: `addToJobOpen` (boolean)
3. After the "Deep Enrich" button (line 193), add a new admin-only button:
   ```
   {isAdmin && (
     <Button variant="outline" size="sm" onClick={() => setAddToJobOpen(true)}>
       <Briefcase className="w-4 h-4 mr-2" />
       Add to Job
     </Button>
   )}
   ```
4. Render `<AddToJobDialog>` below `EnrichmentProgressModal`, passing `candidate.id` and `candidateName`

No other files need changes — `AddToJobDialog` already exists and handles everything.

