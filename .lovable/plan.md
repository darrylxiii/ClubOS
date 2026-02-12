

# Fix: Edge Functions Failing for Deep Enrich

## Root Cause

There is a **duplicate TOML section** in `supabase/config.toml` at lines 156-159:

```toml
[functions.analytics-ai-assistant]

[functions.analytics-ai-assistant]
verify_jwt = true
```

The same section header `[functions.analytics-ai-assistant]` appears twice in a row. This causes a TOML parse error that prevents the entire configuration file from being read correctly, which blocks deployment and invocation of **all** edge functions -- including the three new enrichment functions.

## Fix

Remove the duplicate entry on line 156-157, keeping only the valid one:

**File**: `supabase/config.toml` (lines 156-159)

Before:
```toml
[functions.analytics-ai-assistant]

[functions.analytics-ai-assistant]
verify_jwt = true
```

After:
```toml
[functions.analytics-ai-assistant]
verify_jwt = true
```

## What This Resolves

Once the duplicate is removed, the config will parse correctly again and all three enrichment functions will become invocable:
- `enrich-github-profile`
- `enrich-public-presence`
- `generate-candidate-brief`

No changes needed to the edge function code or the modal -- they are all correctly implemented. This is purely a config parse issue.

