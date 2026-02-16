

# Fix: Avatar Profile Picture + Connections Data from LinkedIn Sync

## Problem

The sync IS working (confirmed by logs: "Apify success: Darryl Mehilal"). Followers (5258) and headline were saved correctly. But:
- `avatar_url` is NULL -- the Apify response uses a field name not covered by the current mapping
- `connections_count` is NULL -- same issue, field name mismatch
- No image was uploaded to storage (0 files), confirming the profile pic URL was never extracted

## Solution

### 1. Add comprehensive logging to see raw Apify response

Add `console.log(JSON.stringify(raw))` right after receiving the Apify data. This ensures we can see the exact field names in the logs for future debugging.

### 2. Expand field-name mapping significantly

The current code only checks 4 names for profile picture and 2 for connections. Different Apify actors and response versions use many variations. We need to check all common patterns:

**Profile picture** (currently: `profile_pic_url`, `profilePicture`, `avatar`, `imageUrl`):
Add: `profilePictureUrl`, `profile_picture`, `profilePhoto`, `photo`, `picture`, `image`, `img`, `profileImage`, `profile_image_url`, `displayPictureUrl`, `pictureUrl`, `photo_url`

**Connections** (currently: `connections`, `connections_count`):
Add: `numConnections`, `connectionCount`, `total_connections`, `connectionsCount`, `numberOfConnections`

**Followers** (keep existing, add a few more):
Add: `followersCount`, `numFollowers`, `total_followers`, `numberOfFollowers`

### 3. Deep-search the response object

Instead of only looking at `basic_info` spread with top-level, recursively scan all nested objects for these field names. The Apify response may nest data under `profile`, `data`, `result`, or similar containers.

### 4. Handle LinkedIn CDN image URLs

LinkedIn profile picture URLs from scrapers are often temporary CDN links that expire or require cookies. The current code already tries to download and re-upload to storage -- but we should:
- Log when the image fetch fails or returns too few bytes
- Accept images even below 1000 bytes (some profile thumbnails are small)
- Lower the threshold to 100 bytes

## File Changes

### `supabase/functions/sync-avatar-linkedin/index.ts`

- Add raw response logging after Apify call (1 line)
- Replace the hardcoded field-name checks (lines 92-100) with a helper function that searches across many aliases and also scans nested objects
- Lower the image size threshold from 1000 to 100 bytes
- Add logging for image download success/failure

### Technical Details

```text
Helper function: findField(obj, fieldNames[])
  - Searches top-level keys
  - Searches inside nested objects (basic_info, profile, data, result)
  - Returns first non-null/non-empty match

Field mappings:
  profilePic: ~15 field name variants
  connections: ~8 field name variants  
  followers: ~8 field name variants
```

No database changes needed -- the columns already exist and are correctly typed. No frontend changes needed -- the card already displays avatar_url, connections_count, and followers_count when present.

### Deployment

Redeploy `sync-avatar-linkedin` after changes.

