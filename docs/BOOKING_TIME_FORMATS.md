# Booking System Time Format Standards

## Edge Function Output Format
- **Format**: `"HH:MM - YYYY-MM-DD"` (24-hour time)
- **Example**: `"09:00 - 2025-11-13"`, `"14:30 - 2025-11-25"`
- **Used by**: `get-available-slots` edge function response

## Frontend Display Format
- **Format**: `"H:MM AM/PM"` (12-hour time)
- **Example**: `"9:00 AM"`, `"2:30 PM"`
- **Used by**: All UI components displaying times to users

## Conversion Rules
1. Always use `normalizeTimeFormat()` when converting 24-hour → 12-hour
2. Always use `parseUserTimeSelection()` when converting user input → ISO timestamps
3. Extract time from slot strings using: `slot.split(" - ")[0]`
4. Compare times ONLY after normalizing to same format

## Common Bugs to Avoid

### ❌ WRONG - Comparing Different Formats
```typescript
const match = "09:00 - 2025-11-13".startsWith("9:00 AM"); // false - format mismatch!
```

### ✅ CORRECT - Normalize First
```typescript
const slotTime = "09:00 - 2025-11-13".split(" - ")[0]; // "09:00"
const normalized = normalizeTimeFormat(slotTime); // "9:00 AM"
const match = normalized === "9:00 AM"; // true - same format!
```

## Type Safety
Use type aliases for clarity:
- `SlotString` for edge function responses (`"09:00 - 2025-11-13"`)
- `TimeString` for display times (`"9:00 AM"`)

## Data Flow
```
Edge Function (24-hour)
    ↓
"09:00 - 2025-11-13"
    ↓
normalizeTimeFormat("09:00")
    ↓
"9:00 AM" (displayed to user)
    ↓
parseUserTimeSelection(date, "9:00 AM", timezone)
    ↓
ISO timestamp for booking creation
```

## Testing Checklist
- [ ] Morning slot (9:00 AM) → should succeed
- [ ] Afternoon slot (2:30 PM) → should succeed
- [ ] Noon (12:00 PM) → should succeed
- [ ] Midnight (12:00 AM) → should succeed
- [ ] Console logs show normalized time comparisons
- [ ] Booking same slot twice → second fails with proper error
