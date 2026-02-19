
# Migrate Organization Intelligence from Proxycurl to Apify

Proxycurl is no longer available. All LinkedIn scraping must switch to **Apify**, which is already configured (`APIFY_API_KEY` is present in your secrets). This is the same provider used by your GitHub and Public Presence enrichment functions.

---

## Scope

### 4 Edge Functions to rewrite (Proxycurl -> Apify)

1. **`scan-partner-organization/index.ts`** -- the main scan orchestrator
   - Replace Proxycurl employee-count and employee-listing endpoints with Apify's LinkedIn Company Scraper actor
   - Remove all `PROXYCURL_API_KEY` references; use `APIFY_API_KEY` instead
   - Remove `proxycurl_credit_ledger` inserts (Apify uses a different billing model)

2. **`process-scan-batch/index.ts`** -- enriches individual profiles from the queue
   - Replace Proxycurl profile-lookup calls with Apify's LinkedIn Profile Scraper actor
   - Map Apify's response fields to the existing `company_people` schema
   - Remove credit ledger tracking

3. **`detect-org-changes/index.ts`** -- delta scans for hires/departures
   - Replace Proxycurl employee-count and employee-listing with Apify equivalents
   - Remove credit ledger tracking

4. **`linkedin-scraper-proxycurl/index.ts`** -- candidate self-import
   - Replace Proxycurl person-profile endpoint with Apify LinkedIn Profile Scraper
   - Map response fields to existing `candidateData` shape
   - Rename to a more accurate function name or keep the file but update internals

### 1 Frontend component to update

5. **`src/components/profile/LinkedInImport.tsx`**
   - Update the function invocation name if renamed
   - Remove the user-facing "Proxycurl" text in the alert description
   - Replace with neutral copy: "We'll import publicly available data from your profile."

### 1 Hook -- minor text update

6. **`src/hooks/usePartnerOrgIntelligence.ts`** -- no logic changes needed (it calls the same function names), just verify compatibility

---

## Technical Details

### Apify Actors to use

| Purpose | Apify Actor | How it works |
|---|---|---|
| Company employee listing | `apify/linkedin-company-employees-scraper` | Accepts company LinkedIn URL, returns employee profiles |
| Individual profile enrichment | `apify/linkedin-profile-scraper` | Accepts profile URL(s), returns structured profile data |

### API pattern (already used in your codebase)

```text
POST https://api.apify.com/v2/acts/{actorId}/run-sync-get-dataset-items?token={APIFY_API_KEY}
Content-Type: application/json
Body: { ...actor-specific input }
```

### Data mapping

Apify returns a slightly different schema than Proxycurl. Key field mappings:

- `profile.firstName` / `profile.lastName` (vs Proxycurl `first_name` / `last_name`)
- `profile.position` array with `companyName`, `title`, `startedOn`, `finishedOn`
- `profile.educations` array with `schoolName`, `degree`, `fieldOfStudy`
- `profile.skills` array of strings

The existing `company_people` and `candidateData` structures will be preserved; only the mapping layer changes.

### Credit ledger

The `proxycurl_credit_ledger` table becomes unused. Rather than dropping it (which could affect existing data), we will simply stop writing to it. A future cleanup migration can remove it if desired.

---

## What stays the same

- All database tables (`company_people`, `company_scan_queue`, `company_scan_jobs`, `company_people_changes`)
- The hook and all frontend components (same function names, same data shapes)
- The scan workflow (estimate -> start -> batch enrich -> classify)
- Authentication and RLS policies
