

# Add Company/School Logos and LinkedIn-style Grouped Experience

## Overview

Three visual improvements to the candidate profile's Experience and Education sections:

1. Company logos next to work experience entries
2. Group consecutive roles at the same employer into a single "company stack" (like LinkedIn)
3. Make Education full-width (same size as Experience) with school logos

---

## Part 1: Capture Logo URLs During Scraping

### File: `supabase/functions/linkedin-scraper/index.ts`

The scrapers return company and school logo URLs that are currently discarded. Capture them into the normalized data:

**apimaestro mapper (line 187-200):** Add `companyLogo` field:
```text
experience: rawExp.map((exp: any) => ({
  title: exp.title || exp.role || exp.position || '',
  company: exp.company || exp.companyName || exp.organization || '',
  companyLogo: exp.companyLogo || exp.companyLogoUrl || exp.logo || exp.company_logo_url || '',
  ...
}))
```

**Proxycurl mapper (line 270-277):** Add `companyLogo`:
```text
experience: (data.experiences || []).map((exp: any) => ({
  ...existing fields...
  companyLogo: exp.logo_url || exp.company_linkedin_profile_url || '',
}))
```

**Education mappers:** Add `schoolLogo`:
```text
education: rawEdu.map((edu: any) => ({
  ...existing fields...
  schoolLogo: edu.logo || edu.logoUrl || edu.school_logo || '',
}))
```

**Normalizer (line 333-341):** Pass through the logo fields:
```text
const normalizedWorkHistory = (profile.experience || []).map(exp => ({
  ...existing fields...
  company_logo: emptyToNull(exp.companyLogo),
}));

const normalizedEducation = (profile.education || []).map(edu => ({
  ...existing fields...
  school_logo: emptyToNull(edu.schoolLogo),
}));
```

### File: `supabase/functions/batch-linkedin-enrich/index.ts`

Same logo field mapping applied to the batch enrichment response processing.

---

## Part 2: Map Logo Fields to UI

### File: `src/pages/UnifiedCandidateProfile.tsx`

Pass `company_logo` and `school_logo` through the mapped arrays:

```text
const mappedExperiences = ((candidateData)?.work_history || []).map((job, idx) => ({
  ...existing fields...
  company_logo: job.company_logo || null,
}));

const mappedEducation = ((candidateData)?.education || []).map((edu, idx) => ({
  ...existing fields...
  school_logo: edu.school_logo || null,
}));
```

---

## Part 3: Redesign ExperienceTimeline Component

### File: `src/components/candidate-profile/ExperienceTimeline.tsx`

Major visual overhaul with three changes:

### 3a. Company Logo Display

Add a logo/avatar next to each experience entry. Uses a fallback chain:
1. Stored `company_logo` from scraper
2. Google Favicon API: `https://www.google.com/s2/favicons?domain={company}.com&sz=64`
3. Initial letter fallback (colored circle with first letter of company name)

Same pattern for school logos in education.

### 3b. LinkedIn-style Company Grouping

Group consecutive experiences at the same company into a stacked view:

```text
Before (flat list):
  - Senior Engineer at Google
  - Engineer at Google
  - Junior Engineer at Google
  - Developer at Meta

After (grouped):
  [Google logo]  Google -- 5 yrs 2 mos (total)
    |-- Senior Engineer (2022-Present)
    |-- Engineer (2020-2022)
    |-- Junior Engineer (2018-2020)

  [Meta logo]  Meta -- 2 yrs
    |-- Developer (2016-2018)
```

Implementation: A `groupExperiencesByCompany` utility that:
- Iterates through experiences in order
- Groups consecutive entries with the same company name (case-insensitive)
- Calculates total duration for the group
- Single-entry companies render as before (no nesting)

### 3c. Full-Width Education Section

Remove the `grid grid-cols-1 lg:grid-cols-2` wrapper (line 167) that puts Education and Certifications side by side. Instead:

- Education gets its own full-width Card (same width as Experience)
- Each education entry gets a timeline layout matching the experience section
- School logo displayed the same way as company logo
- Certifications remain in a separate card below

---

## Updated Interface

```text
interface Experience {
  id: string;
  title: string;
  company: string;
  company_logo?: string | null;  // NEW
  location?: string;
  start_date: string;
  end_date?: string;
  current: boolean;
  description?: string;
  skills?: string[];
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  field?: string;
  school_logo?: string | null;  // NEW
  start_date?: string;
  end_date?: string;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/linkedin-scraper/index.ts` | Capture `companyLogo` and `schoolLogo` from scraper responses; pass through normalizer |
| `supabase/functions/batch-linkedin-enrich/index.ts` | Same logo field mapping |
| `src/pages/UnifiedCandidateProfile.tsx` | Map `company_logo` and `school_logo` fields to component props |
| `src/components/candidate-profile/ExperienceTimeline.tsx` | Add company/school logos, group experiences by company, make education full-width |

No database migrations needed. Logo URLs are stored inside the existing `work_history` and `education` JSONB columns.

---

## Logo Fallback Strategy

Since LinkedIn CDN logo URLs also expire (same problem as profile pictures), the approach uses a multi-tier fallback:

1. **Stored logo** from scraper (may expire)
2. **Google Favicon API** as a reliable, permanent fallback: `https://www.google.com/s2/favicons?domain={companyDomain}&sz=64`. This works well for most established companies.
3. **Initial letter** in a styled circle as the final fallback

This avoids the complexity of downloading and storing hundreds of company/school logos while still providing a good visual experience. The Google Favicon API is free, fast, and doesn't expire.

---

## Visual Result

The final layout for the Experience section:

```text
+--------------------------------------------------+
| [Briefcase icon]  Work Experience                 |
|--------------------------------------------------|
|                                                  |
| [G logo]  Google -- 5 yrs 2 mos                  |
|   |                                              |
|   +-- Senior Software Engineer                   |
|   |   Jan 2022 - Present -- 3 yrs 1 mo           |
|   |                                              |
|   +-- Software Engineer                          |
|   |   Mar 2020 - Dec 2021 -- 1 yr 10 mos         |
|   |                                              |
|   +-- Junior Engineer                            |
|       Jun 2018 - Feb 2020 -- 1 yr 9 mos          |
|                                                  |
| [M logo]  Meta                                   |
|   |                                              |
|   +-- Frontend Developer                         |
|       Jan 2016 - May 2018 -- 2 yrs 5 mos         |
+--------------------------------------------------+

+--------------------------------------------------+
| [GraduationCap]  Education                        |
|--------------------------------------------------|
|                                                  |
| [MIT logo]  Massachusetts Institute of Technology |
|   |   M.S. Computer Science                      |
|   |   2014 - 2016                                |
|                                                  |
| [Stanford logo]  Stanford University              |
|       B.S. Computer Science                      |
|       2010 - 2014                                |
+--------------------------------------------------+

+--------------------------------------------------+
| [Award icon]  Certifications                      |
|   ...                                            |
+--------------------------------------------------+
```
