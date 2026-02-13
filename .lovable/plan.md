

# Fix: Duplicate Key Error on Calendar Reconnection

## Problem

When reconnecting a Google Calendar that was previously connected, the code tries to `INSERT` a new row. However, a unique constraint (`calendar_connections_user_id_provider_email_key`) already exists for that user/provider/email combination, causing the error.

## Solution

Change the `.insert()` call to `.upsert()` with `onConflict: 'user_id,provider,email'`. This will update the existing row (refreshing tokens, re-activating) instead of failing on duplicate.

## Technical Details

**File:** `src/components/settings/ConnectionsSettings.tsx` (lines 173-184)

Change:
```typescript
.insert({
  user_id: user.id,
  provider: 'google',
  email: userInfo.email,
  ...
})
```

To:
```typescript
.upsert({
  user_id: user.id,
  provider: 'google',
  email: userInfo.email,
  label: label.trim(),
  access_token: data.tokens.access_token,
  refresh_token: data.tokens.refresh_token || null,
  token_expires_at: data.tokens.expires_at,
  is_active: true,
}, { onConflict: 'user_id,provider,email' })
```

This single change allows both first-time connections and reconnections to work seamlessly.
