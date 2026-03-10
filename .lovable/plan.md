

# Bulk-Approve Existing Applications

## Problem
All 221 existing applications have `internal_review_status = NULL` and `partner_review_status = NULL`. The new review system treats these as "pending", flooding the review queue with candidates that were already vetted before the system was built.

## Fix
One data update — set both review statuses to `'approved'` for all existing applications. No code changes needed.

```sql
UPDATE applications
SET internal_review_status = 'approved',
    partner_review_status = 'approved'
WHERE internal_review_status IS NULL
  AND partner_review_status IS NULL;
```

This clears the queue instantly. Going forward, only newly added candidates will enter with pending status and flow through the two-layer review process.

## What This Does NOT Change
- No schema changes
- No code changes
- The review widgets, hub dialog, and notification system all remain intact
- New candidates added after this update will still require internal → partner review as designed

