
# Fix "Waiting for Host" - Host Participant Record Not Active

## Root Cause Analysis

The issue stems from **duplicate participant records** for the same user in the same meeting:

| Finding | Impact |
|---------|--------|
| Host has **11 participant records** | All marked as `left`, none active |
| Query uses `.maybeSingle()` | Fails silently with multiple records |
| Heartbeat updates ALL records | Blocked by unique constraint when setting `left_at = null` |
| Result | Host appears offline to other participants |

### The Unique Constraint Problem

```text
UNIQUE INDEX meeting_participants_user_active_unique 
ON (meeting_id, user_id) WHERE left_at IS NULL
```

This means only ONE record per user per meeting can be "active" (left_at = null). When the heartbeat tries to update all 11 records to set `left_at = null`, the database rejects it because that would create 11 active records for the same user.

---

## Solution: Single-Record Update Pattern

### Phase 1: Fix Join Logic in MeetingRoom.tsx

Change the existing record lookup to find the MOST RECENT record and update only that one:

**File: `src/pages/MeetingRoom.tsx` (lines 200-224)**

Current code:
```typescript
const { data: existingParticipant } = await supabase
  .from('meeting_participants')
  .select('id')
  .eq('meeting_id', meeting.id)
  .eq('user_id', user.id)
  .maybeSingle();  // ← BUG: fails with multiple records
```

Fixed code:
```typescript
// Get the most recent participant record (there may be stale duplicates)
const { data: existingParticipant } = await supabase
  .from('meeting_participants')
  .select('id')
  .eq('meeting_id', meeting.id)
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();  // Now safe because limit(1) ensures only one row
```

### Phase 2: Fix Heartbeat in MeetingVideoCallInterface.tsx

The heartbeat currently updates ALL matching records, which fails when multiple exist. Change it to update only the active record (or most recent if none active):

**File: `src/components/meetings/MeetingVideoCallInterface.tsx` (lines 626-641)**

Current code:
```typescript
const { error } = await supabase
  .from('meeting_participants')
  .update({ 
    last_seen: new Date().toISOString(),
    left_at: null,
    status: 'accepted'
  })
  .eq('meeting_id', meeting.id)
  .or(`user_id.eq.${participantId},session_token.eq.${participantId}`);
// ← BUG: Updates ALL 11 records, violates unique constraint
```

Fixed code:
```typescript
// First check if we already have an active record
const { data: activeRecord } = await supabase
  .from('meeting_participants')
  .select('id')
  .eq('meeting_id', meeting.id)
  .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
  .is('left_at', null)
  .limit(1)
  .maybeSingle();

if (activeRecord) {
  // Update the active record's heartbeat
  await supabase
    .from('meeting_participants')
    .update({ 
      last_seen: new Date().toISOString(),
      status: 'accepted'
    })
    .eq('id', activeRecord.id);
} else {
  // No active record - find most recent and reactivate it
  const { data: latestRecord } = await supabase
    .from('meeting_participants')
    .select('id')
    .eq('meeting_id', meeting.id)
    .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRecord) {
    await supabase
      .from('meeting_participants')
      .update({ 
        last_seen: new Date().toISOString(),
        left_at: null,  // Reactivate
        status: 'accepted'
      })
      .eq('id', latestRecord.id);
  }
}
```

### Phase 3: Fix Auto-Rejoin Logic

Apply the same single-record pattern to the auto-rejoin effect:

**File: `src/components/meetings/MeetingVideoCallInterface.tsx` (lines 661-685)**

Update to target only the most recent record instead of all matching records.

### Phase 4: Immediate Database Cleanup

Run a one-time cleanup to consolidate duplicate records:

```sql
-- Keep only the most recent record per user per meeting
-- Mark older duplicates as permanently left

WITH ranked AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY meeting_id, user_id 
           ORDER BY created_at DESC
         ) as rn
  FROM meeting_participants
  WHERE user_id IS NOT NULL
)
UPDATE meeting_participants mp
SET status = 'archived'
FROM ranked r
WHERE mp.id = r.id AND r.rn > 1;
```

### Phase 5: Add Meeting Status Reset

The meeting is currently marked as `completed`. When the host rejoins a completed meeting, reset it to `in_progress`:

**File: `src/pages/MeetingRoom.tsx` (line 256-262)**

Current:
```typescript
if (user.id === meeting.host_id && meeting.status === 'scheduled') {
  await supabase
    .from('meetings')
    .update({ status: 'in_progress' })
    .eq('id', meeting.id);
}
```

Fixed:
```typescript
// Reset meeting to in_progress if host rejoins (works for scheduled OR completed)
if (user.id === meeting.host_id && meeting.status !== 'in_progress') {
  await supabase
    .from('meetings')
    .update({ status: 'in_progress' })
    .eq('id', meeting.id);
  console.log('[MeetingRoom] ✅ Meeting status reset to in_progress');
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/MeetingRoom.tsx` | Add `.order().limit(1)` to existing record query (lines 200-206) |
| `src/pages/MeetingRoom.tsx` | Reset meeting status for completed meetings too (line 257) |
| `src/components/meetings/MeetingVideoCallInterface.tsx` | Change heartbeat to single-record update pattern (lines 626-641) |
| `src/components/meetings/MeetingVideoCallInterface.tsx` | Change auto-rejoin to single-record pattern (lines 673-681) |

---

## Immediate Action: Clean Up Current Meeting

Before deploying code changes, clean up the current meeting so you can test immediately:

```sql
-- Consolidate host's records: Keep only the most recent, clear left_at
UPDATE meeting_participants
SET left_at = null, status = 'accepted', last_seen = NOW()
WHERE id = (
  SELECT id FROM meeting_participants 
  WHERE meeting_id = 'b1d749ce-33a3-4956-ac4a-b1759c353b4c'
    AND user_id = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5'
  ORDER BY created_at DESC
  LIMIT 1
);

-- Reset meeting status
UPDATE meetings 
SET status = 'in_progress' 
WHERE id = 'b1d749ce-33a3-4956-ac4a-b1759c353b4c';
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Host active records | 0 | 1 |
| Sebastiaan sees | "Waiting for Host" | "Join Meeting" button |
| Heartbeat success | Fails (unique constraint) | Works (single record) |
| Duplicate handling | Creates new records | Updates existing |

---

## Why This Happened

1. **Missing LIMIT clause**: The join logic used `.maybeSingle()` without `.limit(1)`, causing silent failures
2. **Bulk heartbeat updates**: Updating ALL matching records violates the unique constraint
3. **Meeting status stuck**: Once marked `completed`, the host couldn't reset it on rejoin
4. **No duplicate prevention**: Multiple join attempts created multiple records instead of reusing existing ones

---

## Technical Details

### Constraint Definition
```sql
CREATE UNIQUE INDEX meeting_participants_user_active_unique 
ON meeting_participants (meeting_id, user_id) 
WHERE (left_at IS NULL) AND (user_id IS NOT NULL)
```

This index ensures only ONE active participant record per user per meeting. The fix respects this constraint by always targeting a single specific record for updates.
