
# Fix "Generate Transcript" Button for All Recordings

## Current Status
All 5 recordings have been **successfully transcribed and analyzed** via backend processing:

| Recording ID | Status | Transcript Length | Has AI Summary |
|-------------|--------|------------------|----------------|
| 43cecc37... | ✅ completed | 12 chars | ✅ Yes |
| 0ea3735f... | ✅ completed | 118 chars | ✅ Yes |
| d236a0cc... | ✅ completed | 895 chars | ✅ Yes |
| 4a2867b7... | ✅ completed | 643 chars | ✅ Yes |
| bb27bf59... | ✅ completed | 59 chars | ✅ Yes |

**Simply refresh the recordings history page to see all completed transcriptions with AI analysis.**

---

## Root Cause of "Generate Transcript" Button Failure

The frontend "Generate Transcript" button fails with `FunctionsFetchError: Failed to send a request to the Edge Function` because:

**Missing Configuration**: The `transcribe-recording` function is NOT listed in `supabase/config.toml`. Without explicit configuration, Edge Functions default to `verify_jwt = true`, which rejects requests without a valid JWT token.

The frontend `supabase.functions.invoke()` call does include the user's session token, but the CORS preflight or network timing is causing the rejection to manifest as "Failed to fetch" rather than a proper 401 error.

---

## Fix Required

Add the `transcribe-recording` function to `config.toml` to explicitly allow authenticated access:

**File**: `supabase/config.toml`

**Location**: Add after line 812 (in the "Meeting Recordings & Transcription" section)

**Change**:
```toml
# =============================================================================
# Meeting Recordings & Transcription
# =============================================================================
[functions.compile-meeting-transcript]
verify_jwt = true

[functions.transcribe-recording]
verify_jwt = true
```

---

## Why This Fixes It

1. **Explicit JWT Requirement**: Adding `verify_jwt = true` explicitly registers the function with proper authentication handling
2. **Better Error Messages**: Once registered, auth failures return proper 401 errors instead of network failures
3. **CORS Configuration**: The deployment process ensures CORS headers are correctly applied
4. **Consistent Behavior**: Matches the configuration pattern used by `analyze-meeting-recording-advanced` and `compile-meeting-transcript`

---

## Future Recordings

After this fix:

1. **New recordings** will auto-transcribe via `useLiveHubAutoRecording` or `useMeetingAutoRecording` hooks (already fixed to call `transcribe-recording`)
2. **Generate Transcript button** will work for any recording that needs manual retry
3. **Real-time updates** (already implemented) will show progress without page refresh

---

## Technical Details

### Files to Modify
| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.transcribe-recording]` with `verify_jwt = true` after line 812 |

### Deployment Steps
1. Add the configuration entry
2. The config.toml update will trigger automatic redeployment of the function
3. Test by clicking "Generate Transcript" on any recording

### Expected Outcome
- Button click → Edge function receives request with auth token → Transcription starts → Real-time UI updates → Success toast
