

# Remove the QuantumPulse / Sentinel Widget

## What will be done

Remove the floating "SENTINEL ACTIVE / SCANNING" bar that appears at the bottom of every admin page. It maintains a realtime subscription and runs a polling interval that are unnecessary overhead.

## Changes

### 1. `src/components/AppLayout.tsx`
- Remove the `import { QuantumPulse }` line
- Remove the `<QuantumPulse />` usage (~line 220)

### 2. `src/components/admin/QuantumPulse.tsx`
- Delete the entire file

### 3. `src/hooks/useRadialMenu.ts`
- Remove the `"quantum-pulse"` case (~line 61-64) that dispatches a focus event to the now-deleted widget

Three files touched, one deleted. No database changes.

