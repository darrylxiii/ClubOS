

# Fix: SLA Tracking Metric Type Mismatch

## Problem Identified

When approving a member and assigning them to a pipeline, the system creates an application record. This triggers the `trigger_create_sla_tracking()` function, which tries to insert a row with `metric_type = 'application_response_time'`.

However, the `partner_sla_tracking` table has a CHECK constraint that only allows these values:
- `response_time`
- `shortlist_delivery`
- `interview_scheduling`
- `replacement`

The value `application_response_time` is NOT in the allowed list, causing the error.

---

## Solution Options

### Option A: Update the Constraint (Recommended)
Expand the CHECK constraint to include the new metric type that the trigger is using.

```sql
ALTER TABLE partner_sla_tracking 
DROP CONSTRAINT partner_sla_tracking_metric_check;

ALTER TABLE partner_sla_tracking 
ADD CONSTRAINT partner_sla_tracking_metric_check 
CHECK (metric_type = ANY (ARRAY[
  'response_time', 
  'shortlist_delivery', 
  'interview_scheduling', 
  'replacement',
  'application_response_time'  -- Add the new type
]));
```

### Option B: Update the Trigger
Change the trigger to use an existing allowed value (`response_time` instead of `application_response_time`).

```sql
CREATE OR REPLACE FUNCTION public.trigger_create_sla_tracking()
RETURNS TRIGGER AS $$
DECLARE v_company_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  SELECT j.company_id INTO v_company_id FROM jobs j WHERE j.id = NEW.job_id;
  IF v_company_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO partner_sla_tracking (company_id, metric_type, target_value, actual_value, is_met, reference_id, reference_type, measured_at)
    VALUES (v_company_id, 'response_time', 2880, 0, false, NEW.id, 'application', now());  -- Changed from 'application_response_time'
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Recommended Approach: Option A

Option A is better because:
1. `application_response_time` is more descriptive than `response_time`
2. It preserves the intent of the trigger
3. Allows for more granular SLA tracking in the future

---

## Implementation

One database migration to update the CHECK constraint to allow the new metric type.

---

## Expected Outcome

After this fix:
1. Member approval will complete successfully
2. Pipeline assignments will work without constraint violations
3. SLA tracking entries will be created properly for applications

