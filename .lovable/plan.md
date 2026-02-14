

# Fix Instantly to CRM Sync Pipeline

## Problem Summary

The CRM is stuck with data from February 3 because of two compounding issues:

1. **No automatic scheduling**: The `sync-interested-leads` function only runs when manually triggered -- there is no cron job or periodic automation calling it.
2. **Webhooks not arriving**: The `instantly-webhook-receiver` has received only 1 test event in its entire lifetime. Instantly is not sending real-time events to your system.

Together, this means neither the push path (webhooks) nor the pull path (scheduled sync) is active.

---

## Fix Plan

### Fix 1: Add automatic sync scheduling via pg_cron

Create a database-level cron job that calls the `sync-interested-leads` edge function every 30 minutes. This is the most reliable approach since it runs server-side with no dependency on a user being online.

**How it works:**
- A PostgreSQL `pg_cron` job fires every 30 minutes
- It calls `net.http_post()` to invoke the edge function
- The function fetches interested/replied/meeting-booked leads from Instantly API and upserts them into `crm_prospects`

**Technical detail:**
- Uses `pg_net` extension (already available) to make HTTP calls from the database
- Targets the deployed edge function URL with the service role key for authentication
- Logs every run in `crm_sync_logs` (already implemented in the function)

### Fix 2: Add a "Sync Now" button on the CRM Prospects page

Add a manual trigger button so strategists can force a sync without waiting for the next cron run. This gives immediate control when they know new leads have come in.

**Where:** The existing `/crm/prospects` page header area
**What:** A "Sync from Instantly" button with loading state and last-sync timestamp

### Fix 3: Re-register Instantly webhooks

Call the existing `register-instantly-webhooks` edge function to ensure webhooks point to the correct URL. This restores the real-time push path so leads appear in CRM within seconds of showing interest.

**What this does:**
- Deletes any stale webhook registrations in Instantly
- Registers a new webhook pointing to `instantly-webhook-receiver` for key events: `lead.replied`, `lead.interested`, `lead.meeting_booked`, `lead.meeting_completed`, `lead.not_interested`

### Fix 4: Add sync health indicator to CRM page

Show a small status badge on the CRM page indicating when the last sync ran and whether it succeeded. This prevents the "stuck and nobody notices" problem from recurring.

---

## Technical Details

### Database Migration (pg_cron job)

A SQL migration will:
1. Enable the `pg_cron` extension if not already active
2. Create a cron job named `sync-instantly-interested-leads` that runs every 30 minutes
3. The job calls the edge function via `net.http_post` with the service role key

### Files to Create/Modify

| File | Change |
|------|--------|
| SQL migration | Create pg_cron job for 30-minute sync schedule |
| `src/components/crm/CRMSyncControls.tsx` | New component: "Sync Now" button + last sync timestamp + health badge |
| `src/pages/CRMProspects.tsx` (or wherever the prospect list header lives) | Add `CRMSyncControls` to the page header |

### Sync Flow After Fix

```text
Every 30 min (pg_cron) ---------> sync-interested-leads ---------> crm_prospects (upsert)
                                         |
Real-time (Instantly webhook) --> instantly-webhook-receiver --> crm_prospects (upsert)
                                         |
Manual ("Sync Now" button) -----> sync-interested-leads ---------> crm_prospects (upsert)
```

All three paths feed the same CRM table, ensuring no interested leads are missed regardless of which mechanism fires.

### Estimated Impact

- Sync gap reduced from "infinite" (manual only) to maximum 30 minutes
- Webhook re-registration restores near-instant updates for key events
- Health indicator prevents silent failures going unnoticed again

