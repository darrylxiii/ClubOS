

# Fix: Deep Enrich Edge Functions Blocked by JWT Verification

## Root Cause

All three enrichment functions have `verify_jwt = true` in `supabase/config.toml`:

```toml
[functions.enrich-github-profile]
verify_jwt = true

[functions.enrich-public-presence]
verify_jwt = true

[functions.generate-candidate-brief]
verify_jwt = true
```

With Lovable Cloud's signing-keys system, `verify_jwt = true` is a deprecated approach that rejects requests before they even reach the function code -- returning a 401 "Missing authorization header" error. This is why the logs show the functions boot but never process any requests.

## Fix

Change all three to `verify_jwt = false` in `supabase/config.toml` (lines 1136, 1139, 1142):

```toml
[functions.enrich-github-profile]
verify_jwt = false

[functions.enrich-public-presence]
verify_jwt = false

[functions.generate-candidate-brief]
verify_jwt = false
```

The functions already use a Supabase service-role client internally and do not depend on the gateway JWT check, so this is safe.

## No Other Changes Needed

The modal component, edge function code, and CORS headers are all correct. This is purely a config issue preventing the gateway from forwarding requests to the function runtime.

