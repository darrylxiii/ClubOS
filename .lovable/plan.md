

# Fix: Estimated Placement Fee Not Updating When Salary Range is Entered

## Problem Identified

The "Estimated Placement Fee" in the **Create Job Dialog** does NOT update when you enter a salary range because the `salaryMax` prop is **not being passed** to the `JobFeeConfiguration` component.

### Current Code (CreateJobDialog.tsx line 849-854):
```tsx
<JobFeeConfiguration
  companyId={formData.company_id}
  feeConfig={feeConfig}
  onFeeConfigChange={setFeeConfig}
  disabled={isSubmitting}
/>  // ← Missing salaryMax prop!
```

### EditJobSheet.tsx (already correct):
```tsx
<JobFeeConfiguration
  companyId={formData.company_id}
  feeConfig={feeConfig}
  onFeeConfigChange={(config) => {...}}
  salaryMax={formData.salary_max ? parseInt(formData.salary_max) : null}  // ✓ Correct!
/>
```

### How Fee Calculation Works

In `JobFeeConfiguration.tsx`, line 107-108:
```tsx
const getPreviewFee = () => {
  const baseSalary = salaryMax || 75000;  // Falls back to €75,000 if salaryMax not provided
  // ... calculates fee based on baseSalary
};
```

So when `salaryMax` is not passed, it always uses €75,000 regardless of what the user enters in the salary fields.

---

## Solution

Pass the `salaryMax` prop from the form data to the `JobFeeConfiguration` component in `CreateJobDialog.tsx`.

### File to Modify

| File | Change |
|------|--------|
| `src/components/partner/CreateJobDialog.tsx` | Add `salaryMax` prop to `JobFeeConfiguration` |

### Code Change

**Line 849-854 - Add the missing prop:**

```tsx
<JobFeeConfiguration
  companyId={formData.company_id}
  feeConfig={feeConfig}
  onFeeConfigChange={setFeeConfig}
  disabled={isSubmitting}
  salaryMax={formData.salary_max ? parseInt(formData.salary_max) : null}
/>
```

---

## Expected Behavior After Fix

1. User opens "Create New Job" dialog
2. User selects a company
3. Fee Configuration section appears showing estimated fee based on €75,000 default
4. User enters salary range (e.g., Min: €80,000, Max: €120,000)
5. **Estimated Placement Fee immediately updates** to reflect the new salary:
   - With 20% fee: €120,000 × 20% = **€24,000**
   - Label changes to: "Based on €120,000 salary"

---

## Technical Note

The component uses `salary_max` (the higher end of the range) for the fee calculation because:
- It's a conservative estimate for revenue planning
- Candidates often negotiate toward the higher end of posted ranges
- It matches how deal pipeline revenue calculations work elsewhere in the app

