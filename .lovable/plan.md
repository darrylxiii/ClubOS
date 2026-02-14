

# Fix: "Failed to create asset" -- Generated Column Conflict

## Root Cause

The database column `total_purchase_value` on the `inventory_assets` table is a **generated (computed) column**. PostgreSQL does not allow inserting explicit values into generated columns -- only `DEFAULT` is permitted.

The `createAsset` function in `src/hooks/useInventoryAssets.ts` (line 150) explicitly sets `total_purchase_value`, `annual_depreciation`, `monthly_depreciation`, `accumulated_depreciation`, and `current_book_value`, which triggers the Postgres error:

```
cannot insert a non-DEFAULT value into column "total_purchase_value"
```

## Fix

Remove all generated/computed columns from the insert payload in `useInventoryAssets.ts`. The database will calculate these automatically.

### File: `src/hooks/useInventoryAssets.ts`

**In `createAsset` (lines ~139-168):** Remove these fields from the `.insert()` call:
- `total_purchase_value`
- `annual_depreciation`
- `monthly_depreciation`
- `accumulated_depreciation`
- `current_book_value`

Also remove the now-unnecessary pre-calculation logic (lines 123-128) since the DB handles it.

**In `updateAsset` (lines ~182-206):** Remove the same computed fields from the update payload to prevent the same error on edits.

### No other files need changes.

The edge function and the form dialog are working correctly -- the failure happens at the final database insert step.

