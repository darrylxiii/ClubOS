

# Fix: Register Avatar Edge Functions in Config

## Problem
The `sync-avatar-linkedin`, `avatar-account-credentials`, and `avatar-session-timeout` edge functions were never added to `supabase/config.toml`. On Lovable Cloud, every edge function must be registered there with `verify_jwt = false` (because JWT verification is handled in-code). Without the config entry, requests to the function fail immediately with "Failed to fetch" -- the function never boots for actual requests.

This is why the candidate LinkedIn scraper works (it has an entry at line 208) but the avatar sync does not.

## Fix

**File:** `supabase/config.toml`

Add three new entries:

```toml
[functions.sync-avatar-linkedin]
verify_jwt = false

[functions.avatar-account-credentials]
verify_jwt = false

[functions.avatar-session-timeout]
verify_jwt = false
```

All three functions already contain in-code authentication checks (verifying the JWT via `supabase.auth.getUser`), so setting `verify_jwt = false` is safe and required on Lovable Cloud.

No other file changes needed. After adding the config entries, the functions will be redeployed and sync will work.
