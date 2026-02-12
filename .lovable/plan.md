
# Fix Stale "Last Pipeline" Redirect

## Problem

The code change is correct, but `localStorage` still contains the old value (`/crm/prospects`) from before the update. The radial menu reads `localStorage.getItem("tqc_last_pipeline")` which returns `/crm/prospects`, so the `/jobs` fallback never kicks in.

## Fix

In `src/hooks/useLastPipeline.ts`, add a one-time cleanup on mount: if the stored value does NOT match the new job pipeline pattern, remove it so the fallback to `/jobs` takes effect.

### File: `src/hooks/useLastPipeline.ts`

```ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const JOB_PIPELINE_PATTERN = /^\/jobs\/[^/]+\/dashboard/;
const STORAGE_KEY = "tqc_last_pipeline";

export function useLastPipeline() {
  const location = useLocation();

  // Clear stale non-job-pipeline values from previous version
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && !JOB_PIPELINE_PATTERN.test(stored)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (JOB_PIPELINE_PATTERN.test(location.pathname)) {
      localStorage.setItem(STORAGE_KEY, location.pathname);
    }
  }, [location.pathname]);
}
```

This adds a single `useEffect` (runs once on mount) that checks if the stored value is a legacy CRM route and removes it. After that, clicking "Pipeline" will go to `/jobs` until you visit a real job dashboard.

### Files changed

| File | Change |
|---|---|
| `src/hooks/useLastPipeline.ts` | Add cleanup useEffect to remove stale non-job-pipeline values |
