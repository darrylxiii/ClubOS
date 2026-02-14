
# Sync Instantly Unibox to CRM Reply Inbox

## Problem

The Smart Reply Inbox at `/crm/inbox` reads from the `crm_email_replies` table, which is **completely empty**. Nothing in the system populates it:

- The `instantly-webhook-receiver` writes reply content to `crm_prospect_activities` but never to `crm_email_replies`
- The `sync-interested-leads` function syncs prospect records but not their email conversations
- There is no edge function that calls Instantly's `GET /api/v2/emails` endpoint (the Unibox API)

The result: the Reply Inbox UI is a fully built but empty shell.

---

## Solution: Two-Path Sync

### Path 1: New Edge Function -- `sync-instantly-unibox`

A new edge function that pulls emails directly from Instantly's Unibox API and populates `crm_email_replies`.

**How it works:**
1. Calls `GET /api/v2/emails` with `email_type=received` (inbound replies only) and `preview_only=false` (to get full body)
2. Paginates through results using Instantly's cursor
3. For each email:
   - Matches to a `crm_prospect` by lead email address
   - Matches to a `crm_campaign` by Instantly campaign_id
   - Upserts into `crm_email_replies` using `external_id` (Instantly email UUID) as dedup key
   - Maps Instantly's `ai_interest_value` to a preliminary classification
   - Stores `thread_id` for conversation threading
4. Optionally triggers AI analysis (`analyze-email-reply`) for unclassified replies
5. Logs sync stats to `crm_sync_logs`

**Instantly API fields mapped to `crm_email_replies`:**

| Instantly Field | CRM Field |
|----------------|-----------|
| `id` | `external_id` |
| `from_address_email` | `from_email` |
| `from_address_json` | `from_name` |
| `to_address_email_list` | `to_email` |
| `subject` | `subject` |
| `body.text` | `body_text` |
| `body.html` | `body_html` |
| `content_preview` | `body_preview` |
| `message_id` | `message_id` |
| `thread_id` | `thread_id` |
| `timestamp_email` | `received_at` |
| `ai_interest_value` | `sentiment_score` + initial classification |
| `is_unread` | `is_read` (inverted) |
| `campaign_id` | `campaign_id` (via lookup) |

### Path 2: Fix the Webhook Receiver

Update `instantly-webhook-receiver` so that when a `lead.replied` event comes in, it also writes to `crm_email_replies` (not just `crm_prospect_activities`). This gives near-instant population for new replies going forward.

### Path 3: Automated Scheduling

Add a `pg_cron` job that runs `sync-instantly-unibox` every 15 minutes, ensuring the Reply Inbox stays current even if webhooks fail.

---

## Instantly API Integration

The shared client (`_shared/instantly-client.ts`) needs new functions:

```text
listUniboxEmails(params)  --> GET /api/v2/emails
  - email_type: 'received' | 'sent' | 'all' | 'manual'
  - campaign_id: optional filter
  - lead: optional email filter
  - latest_of_thread: boolean
  - preview_only: boolean (false to get full body)
  - limit: number
  - starting_after: cursor

getUnreadCount()          --> GET /api/v2/emails/unread/count

markThreadAsRead(threadId) --> POST /api/v2/emails/threads/{thread_id}/mark-as-read
```

---

## Reply Sending (Bi-directional Sync)

The existing `send-instantly-reply` function uses the old V1 API. It needs to be updated to use V2's `POST /api/v2/emails/reply` which requires:

- `reply_to_uuid`: The Instantly email ID to reply to (now available via `external_id` on `crm_email_replies`)
- `eaccount`: The sending account email
- `subject`: Subject line
- `body`: `{ html, text }` format

After sending, the outbound reply is logged in `crm_email_replies` with `ue_type = 3` (sent) so the full thread is visible in the inbox.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/_shared/instantly-client.ts` | Modify | Add `listUniboxEmails`, `getUnreadCount`, `markThreadAsRead` functions |
| `supabase/functions/sync-instantly-unibox/index.ts` | Create | New edge function to pull Unibox emails into `crm_email_replies` |
| `supabase/functions/instantly-webhook-receiver/index.ts` | Modify | Also write to `crm_email_replies` on `lead.replied` events |
| `supabase/functions/send-instantly-reply/index.ts` | Modify | Update to V2 reply API, log outbound emails to `crm_email_replies` |
| `supabase/config.toml` | Modify | Register `sync-instantly-unibox` function |
| SQL migration | Create | `pg_cron` job for 15-minute Unibox sync |

---

## Technical Details

### `sync-instantly-unibox` Edge Function Flow

```text
1. Fetch last sync timestamp from crm_sync_logs (type='unibox_sync')
2. Call GET /api/v2/emails?email_type=received&preview_only=false
3. Paginate through all results
4. For each email:
   a. Skip if external_id already exists in crm_email_replies
   b. Find prospect by matching lead email to crm_prospects.email
   c. Find campaign by matching campaign_id to crm_campaigns.external_id
   d. Map ai_interest_value to classification:
      - >= 0.8: hot_lead
      - >= 0.5: warm_lead / interested
      - >= 0.3: question
      - < 0.3: unclassified
   e. Insert into crm_email_replies
5. Log sync stats to crm_sync_logs
```

### Webhook Receiver Enhancement

In the `lead.replied` handler (line ~190-204), after storing in `crm_prospect_activities`, also insert into `crm_email_replies`:

```text
- from_email = data.email (the lead's email)
- subject = data.subject
- body_text = data.reply_body
- prospect_id = prospect.id
- classification = 'unclassified' (will be analyzed)
- received_at = data.replied_at
```

### Send Reply V2 Update

Replace the old `sendReply` call with the V2 format:

```text
POST /api/v2/emails/reply
{
  "reply_to_uuid": <instantly email UUID from crm_email_replies.external_id>,
  "eaccount": <sending account email>,
  "subject": "Re: ...",
  "body": { "html": "<p>...</p>", "text": "..." }
}
```

### pg_cron Schedule

```text
Every 15 minutes: sync-instantly-unibox (pull new received emails)
Every 30 minutes: sync-interested-leads (already scheduled, syncs prospect stages)
```

---

## What Changes for the User

After implementation:
- The Reply Inbox at `/crm/inbox` will populate with all received replies from Instantly campaigns
- New replies appear within 15 minutes (via scheduled sync) or near-instantly (via webhook)
- Replies sent from the CRM will go through Instantly's V2 API and appear in both TQC's inbox and Instantly's Unibox
- Thread view will show the full conversation history
- AI classification will auto-categorize replies as hot/warm/objection etc.
