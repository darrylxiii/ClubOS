

# Fix: Missing LinkedIn Profile Pictures

## Root Cause

The logs prove it definitively. The Apify response returns the profile picture under `basic_info.profile_picture_url`:

```
basic_info keys: ["fullname","first_name","last_name","headline","public_identifier","profile_url","profile_picture_url","about",...]
```

The current `PIC_ALIASES` array does NOT contain `profile_picture_url`. It has close variations like `profile_pic_url`, `profile_picture`, `profile_image_url` -- but not the exact key the API returns.

Every sync logs `pic: false` because of this single missing alias.

## Fix

### File: `supabase/functions/sync-avatar-linkedin/index.ts`

**Line 93**: Add `'profile_picture_url'` to the `PIC_ALIASES` array.

```
Before:
  'profile_pic_url', 'profilePicture', 'avatar', 'imageUrl',

After:
  'profile_pic_url', 'profile_picture_url', 'profilePicture', 'avatar', 'imageUrl',
```

That is the only code change needed. Then redeploy.

## Why This Is Enough

- The `findField` helper already searches inside `basic_info` (line 74 checks nested containers)
- The image download + storage logic (lines 184-208) already works correctly
- Connection and follower counts are already saving (logs show `conn: 613`, `follow: 617`, etc.)
- The only broken piece is the missing alias for the profile picture field name

## Deployment

Redeploy `sync-avatar-linkedin` after the one-line fix.
