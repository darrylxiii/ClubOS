

# CRM Dashboard Fix — Column Mismatch + Missing Features

## Root Cause: Data Column Mismatch

The sync function (`sync-instantly-campaigns`) writes to these DB columns:
- `total_opened`, `total_replied`, `total_bounced`, `total_clicked`, `total_unsubscribed`

But the frontend `CRMCampaign` TypeScript type and ALL UI code reads:
- `total_opens`, `total_replies`, `total_bounces`

Both column sets exist in the DB (legacy duplicates), but the sync only populates one set while the UI reads the other. Result: **all campaign stats show as 0** — open rate, reply rate, bounces all blank.

This affects:
- `CRMDashboard.tsx` — reply rate KPI shows 0%
- `CampaignDashboard.tsx` — all campaign cards show 0% open/reply rate
- `EmailSequencingHub.tsx` — aggregate stats all 0
- `useCRMAnalytics.ts` — campaign performance charts empty
- `src/lib/export-utils.ts` — exports have empty stat columns

## Fix Plan

### 1. Update `CRMCampaign` type + all UI references
Update `src/types/crm-enterprise.ts` to use the DB column names that the sync actually populates. Then update all files that reference the old names:

| Old (empty) | New (populated by sync) |
|---|---|
| `total_opens` | `total_opened` |
| `total_replies` | `total_replied` |
| `total_bounces` | `total_bounced` |

Files to update:
- `src/types/crm-enterprise.ts` — type definition
- `src/pages/crm/CampaignDashboard.tsx` — `totalReplies`, `CampaignCard` openRate/replyRate/bounces
- `src/pages/crm/CRMDashboard.tsx` — `totalReplies` in KPI calc
- `src/pages/crm/EmailSequencingHub.tsx` — `totalReplies`, `totalOpens`
- `src/hooks/useCRMAnalytics.ts` — `campaign.total_opens`, `campaign.total_replies`
- `src/lib/export-utils.ts` — column keys

### 2. Also populate the sync with `total_prospects`
The sync function writes `leads_count` but never writes `total_prospects`. The UI reads `total_prospects` for the campaign progress bar. Add `total_prospects: analytics?.leads_count || 0` to the sync mapping.

### 3. DB migration to sync legacy columns
Create a migration that copies data from the populated columns to the legacy ones (or drops the duplicates). Since the legacy columns still exist and might have old data, the safest approach is to update the UI to read from the correct columns (approach in step 1).

### 4. Verify CRM Settings tabs are intact
The Settings page has all 9 tabs (General, Integrations, Imports, Suppression, Lead Scoring, Automations, Audit Trail, Shortcuts, Notifications). The routes file has proper redirects. This is working correctly — no fix needed.

### 5. Add "Sync Now" button to CRM Dashboard
Currently the only way to trigger an Instantly sync is manually invoking the edge function. Add a "Sync" button on the Campaign Dashboard that calls `sync-instantly-campaigns` so admins can pull fresh data on demand.

---

## Technical Details

### Files Modified
1. `src/types/crm-enterprise.ts` — rename 3 fields
2. `src/pages/crm/CampaignDashboard.tsx` — update field references
3. `src/pages/crm/CRMDashboard.tsx` — update `totalReplies` calc
4. `src/pages/crm/EmailSequencingHub.tsx` — update field references
5. `src/hooks/useCRMAnalytics.ts` — update field references
6. `src/lib/export-utils.ts` — update column keys
7. `supabase/functions/sync-instantly-campaigns/index.ts` — add `total_prospects` mapping

### No DB migration needed
The correct columns already exist and are populated. We just need the frontend to read from them.

