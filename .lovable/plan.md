

# Fix: Redeploy `approve-partner-request` Edge Function

## Problem
The source code was already fixed (no `domain` column reference), but the **deployed version was stale** — the old code with the `domain` insert was still running in production.

## What was done
The function has just been redeployed. No code changes needed — the fix from the previous round was correct but hadn't propagated.

## Verification
Please try approving Timo Schuringa again. The `domain` error should no longer occur.

