
# Approval Workflow & System Audit

## Current Score: 45/100

The member approval workflow and related database triggers have critical bugs that prevent core functionality from working correctly.

---

## Critical Issue Found

### Root Cause: `activity_feed` Foreign Key Violation

**Error:** `insert or update on table "activity_feed" violates foreign key constraint "activity_feed_user_id_fkey"`

**Technical Explanation:**
When you approve a candidate and add them to a job pipeline, the system creates an application record. This triggers the `log_application_to_activity_feed()` function which attempts to insert into `activity_feed`:

```sql
INSERT INTO public.activity_feed (user_id, event_type, ...)
VALUES (NEW.candidate_id, 'application_submitted', ...);
```

**The Problem:**
- `activity_feed.user_id` has a **foreign key to `auth.users(id)`**
- `applications.candidate_id` references **`candidate_profiles.id`** (NOT auth.users)
- These are completely different IDs
- Standalone candidates (80 of 108 in your database) have **no linked auth.users record**

**Data Evidence:**
- 80 standalone candidates (no auth user)
- 28 linked candidates (have auth user)
- 87 existing applications would fail this trigger

---

## All Issues Found

### Issue 1: Activity Feed Trigger Uses Wrong ID (CRITICAL)
**Score Impact:** -25 points
**File:** `log_application_to_activity_feed()` database function
**Problem:** Uses `candidate_id` (candidate_profiles.id) instead of looking up the actual `user_id` from candidate_profiles
**Fix:** Modify trigger to:
1. Look up `user_id` from `candidate_profiles` where `id = NEW.candidate_id`
2. Skip insert if `user_id` is NULL (standalone candidate)

### Issue 2: Duplicate Activity Feed Triggers (CRITICAL)
**Score Impact:** -10 points
**Problem:** Two triggers on applications table call the same function:
- `application_submitted_activity_trigger`
- `application_activity_trigger`

Both call `log_application_to_activity_feed()`, causing duplicate inserts and double failures.

### Issue 3: KPI Function Column Name Mismatch (HIGH)
**Score Impact:** -10 points
**File:** `get_realtime_system_health()` function
**Problem:** References `km.metric_name` but table column is `kpi_name`
**Evidence:** 20 consecutive errors in logs: `column km.metric_name does not exist`

### Issue 4: No Fallback for Standalone Candidates
**Score Impact:** -5 points
**Location:** `memberApprovalService.ts` lines 330-352
**Problem:** When creating applications for standalone candidates, the code doesn't handle the trigger failure gracefully

### Issue 5: Security Linter Warnings
**Score Impact:** -5 points
**Problem:** 77 linter issues including:
- 1 ERROR: Security Definer View
- Multiple WARN: Function Search Path Mutable
- Multiple WARN: RLS Policy Always True

---

## Scoring Breakdown

| Category | Current | Max | Notes |
|----------|---------|-----|-------|
| Activity Feed Triggers | 0/25 | 25 | Broken for standalone candidates |
| Duplicate Trigger Prevention | 0/10 | 10 | Two triggers doing same thing |
| KPI Functions | 0/10 | 10 | Column name mismatch |
| Error Handling | 5/10 | 10 | Partial graceful degradation |
| Data Model Correctness | 20/25 | 25 | FKs properly defined but misused |
| Security Posture | 20/20 | 20 | RLS enabled, policies exist |
| **TOTAL** | **45/100** | 100 | |

---

## Roadmap to 100/100

### Phase 1: Fix Critical Blocking Issue (+35 points)

#### 1.1 Fix `log_application_to_activity_feed()` Function
```sql
CREATE OR REPLACE FUNCTION public.log_application_to_activity_feed()
RETURNS TRIGGER AS $$
DECLARE
  actual_user_id UUID;
BEGIN
  -- Look up the actual auth user_id from candidate_profiles
  SELECT cp.user_id INTO actual_user_id
  FROM candidate_profiles cp
  WHERE cp.id = NEW.candidate_id;
  
  -- Only log if candidate has a linked auth user
  IF actual_user_id IS NOT NULL THEN
    INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
    VALUES (
      actual_user_id,  -- Use the ACTUAL auth user id
      'application_submitted',
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'status', NEW.status,
        'candidate_id', NEW.candidate_id
      ),
      'private',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

#### 1.2 Drop Duplicate Trigger
```sql
DROP TRIGGER IF EXISTS application_activity_trigger ON public.applications;
```

#### 1.3 Fix Status Change Trigger Similarly
Apply the same lookup pattern to `log_application_status_change_to_activity_feed()`.

### Phase 2: Fix KPI Function (+10 points)

```sql
CREATE OR REPLACE FUNCTION public.get_realtime_system_health()
RETURNS TABLE (
  metric_name text,
  value numeric,
  status text,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    km.kpi_name::text,    -- Fixed: was metric_name
    km.value::numeric,
    COALESCE(km.trend_direction, 'stable')::text,  -- status column doesn't exist
    km.updated_at::timestamptz
  FROM kpi_metrics km
  WHERE km.category = 'system_health'
  ORDER BY km.kpi_name;
END;
$$;
```

### Phase 3: Security Hardening (+10 points)

1. Add `SET search_path = public` to all functions missing it
2. Review SECURITY DEFINER views
3. Tighten RLS policies that use `USING (true)`

---

## Files to Modify

| File/Object | Type | Change |
|-------------|------|--------|
| `log_application_to_activity_feed()` | DB Function | Look up user_id from candidate_profiles |
| `log_application_status_change_to_activity_feed()` | DB Function | Same fix |
| `application_activity_trigger` | DB Trigger | Drop (duplicate) |
| `get_realtime_system_health()` | DB Function | Fix column name kpi_name |
| Functions with missing search_path | DB Functions | Add SET search_path |

---

## Implementation Priority

1. **Immediate (Blocking):** Fix activity feed triggers - this unblocks the approval workflow
2. **High:** Fix KPI function - this is causing console spam every 30 seconds
3. **Medium:** Drop duplicate triggers - prevents future duplicate data
4. **Low:** Security hardening - important but not blocking functionality

---

## Summary

The approval workflow is failing because database triggers incorrectly assume `candidate_id` equals `user_id`, but they reference different tables:
- `candidate_id` → `candidate_profiles.id`
- `user_id` → `auth.users.id`

For standalone candidates (74% of your candidates), there is no auth user, so the FK constraint fails. The fix is to look up the actual `user_id` from the candidate_profiles table and skip logging for standalone candidates.
