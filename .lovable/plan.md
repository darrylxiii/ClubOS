
# Fix: "Extract from CV" Edge Function Crash

## Problem
The `extract-skills-from-experience` edge function crashes immediately on every request, producing "Failed to send a request to the Edge Function." No error logs appear because the crash happens before any response is sent.

## Root Cause
The function uses `userClient.auth.getClaims(token)` (line 42), which does not exist on `@supabase/supabase-js@2.58.0` imported via esm.sh. Every other edge function in the project uses `supabase.auth.getUser(token)` instead. Calling a non-existent method throws an unhandled exception, crashing the Deno isolate before any Response is returned.

## Fix

### File: `supabase/functions/extract-skills-from-experience/index.ts`

Replace the `getClaims` auth block (lines 38-47) with the `getUser` pattern used by all other functions:

**Before:**
```typescript
const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: authHeader } },
});
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**After:**
```typescript
const token = authHeader.replace('Bearer ', '');
const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});
const { data: { user }, error: authError } = await userClient.auth.getUser(token);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### No other files need changes
The frontend code in `SkillMatchBreakdown.tsx` is correct. The only issue is the crashing auth call in the edge function.
