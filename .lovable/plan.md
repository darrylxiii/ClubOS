
# Fix: Work Experience, Education, and Executive Summary on Candidate Profile

## Root Cause Analysis

Three issues found:

### Issue 1: Work Experience and Education sections are always empty
The `UnifiedCandidateProfile` (line 86-96) queries `experience` and `education` **database tables** that do not exist. LinkedIn-scraped data is stored as JSONB arrays on `candidate_profiles.work_history` and `candidate_profiles.education` columns. The `ExperienceTimeline` component receives empty arrays and renders nothing.

### Issue 2: Executive Summary is truncated and not expandable
In `CandidateDecisionDashboard.tsx` (line 358), the `ai_summary` is rendered with `line-clamp-4` CSS, cutting off anything beyond 4 lines with no way to expand it.

### Issue 3: No fallback from table data to JSONB data
Even if the `experience` table existed, scraped candidates would not have entries there. The page needs to use `candidate_profiles.work_history` and `candidate_profiles.education` JSONB fields as the primary data source.

---

## Fix 1: Feed JSONB data into ExperienceTimeline

**File:** `src/pages/UnifiedCandidateProfile.tsx`

Replace the broken `experience`/`education` table queries (lines 86-96) with data from the candidate profile's JSONB columns. After loading `candidateData`, map `work_history` and `education` arrays into the format `ExperienceTimeline` expects.

```text
// Remove: (supabase as any).from('experience')... and .from('education')...
// Replace with:

const mappedExperiences = (candidateData?.work_history || []).map((job: any, idx: number) => ({
  id: job.id || `work-${idx}`,
  title: job.title || job.position || 'Untitled Role',
  company: job.company || 'Unknown Company',
  location: job.location || null,
  start_date: normalizeDate(job.start_date),
  end_date: normalizeDate(job.end_date),
  current: !job.end_date,
  description: job.description || null,
  skills: job.skills || [],
}));

const mappedEducation = (candidateData?.education || []).map((edu: any, idx: number) => ({
  id: edu.id || `edu-${idx}`,
  degree: edu.degree || edu.field_of_study || 'Degree',
  institution: edu.institution || edu.school || 'Institution',
  field: edu.field_of_study || edu.field || null,
  start_date: normalizeDate(edu.start_date || edu.start_year),
  end_date: normalizeDate(edu.end_date || edu.end_year),
}));
```

A `normalizeDate` helper handles the various date formats from scrapers (year-only, object format like `{year, month}`, or ISO strings).

Also map `candidateData.certifications` from the JSONB column into the certifications array.

### Fix 2: Make Executive Summary expandable

**File:** `src/components/partner/CandidateDecisionDashboard.tsx`

Replace the truncated `line-clamp-4` paragraph (line 358) with an expandable section:

- Add `summaryExpanded` state (default `false`)
- When collapsed: show `line-clamp-4` with a "Read more" button
- When expanded: show full text with a "Show less" button
- Smooth transition between states

### Fix 3: ExperienceTimeline empty state

**File:** `src/components/candidate-profile/ExperienceTimeline.tsx`

Add empty state cards when both `experiences` and `education` arrays are empty, showing a "No work experience recorded" message with a Briefcase icon and a "No education recorded" message with a GraduationCap icon. This prevents the section from being invisible and signals that data can be added.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/UnifiedCandidateProfile.tsx` | Replace broken table queries with JSONB mapping from candidate_profiles; add normalizeDate helper |
| `src/components/partner/CandidateDecisionDashboard.tsx` | Make Executive Summary expandable with Read more/Show less toggle |
| `src/components/candidate-profile/ExperienceTimeline.tsx` | Add empty state cards for when no experience/education data exists |

No database migrations needed. All data already exists in the `candidate_profiles` table.

---

## Technical Details

### Date Normalization Helper

The LinkedIn scraper stores dates in inconsistent formats. The helper handles:
- ISO strings: `"2023-01-01"` -- pass through
- Year-only: `2023` or `"2023"` -- convert to `"2023-01-01"`
- Object format: `{year: 2023, month: 6}` -- convert to `"2023-06-01"`
- Null/undefined -- return undefined

```text
function normalizeDate(d: any): string | undefined {
  if (!d) return undefined;
  if (typeof d === 'string') return d;
  if (typeof d === 'number') return `${d}-01-01`;
  if (d.year) return `${d.year}-${String(d.month || 1).padStart(2, '0')}-01`;
  return undefined;
}
```

### Expandable Summary Pattern

```text
const [summaryExpanded, setSummaryExpanded] = useState(false);

// In render:
<p className={`text-sm text-muted-foreground ${!summaryExpanded ? 'line-clamp-4' : ''}`}>
  {candidate.ai_summary}
</p>
{candidate.ai_summary.length > 200 && (
  <button onClick={() => setSummaryExpanded(!summaryExpanded)}
    className="text-xs text-primary hover:underline mt-1">
    {summaryExpanded ? 'Show less' : 'Read more'}
  </button>
)}
```
