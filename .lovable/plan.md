
# Fix Strategist Assignment Dropdowns

## Problem Analysis

The dropdown selects for assigning strategists are empty because:

1. **Wrong data source**: The `useStrategistList` hook queries `talent_strategists` table with filters that don't exist:
   - `.eq('is_active', true)` — column doesn't exist
   - Uses `user_id` field — column doesn't exist (only `id`)

2. **Stale table**: The `talent_strategists` table is a legacy static table with 4 entries that have no linkage to actual user accounts in `profiles`

3. **Correct data source**: Team members are identified via `profiles` + `user_roles` where `role` is `'admin'` or `'strategist'`

## Current State

| Table | Status |
|-------|--------|
| `talent_strategists` | Legacy, no `is_active`, no `user_id`, no link to profiles |
| `profiles` | Active users with real UUIDs |
| `user_roles` | Has `admin` and `strategist` roles |
| `company_strategist_assignments.strategist_id` | References `profiles.id` (e.g., Sebastiaan = `f1f446e1-...`) |

**Available TQC Team Members (from user_roles):**
- Admins: Darryl, Francis, Ivo, Jan, Jasper, Jelle, Jill, Megan, Paul, Romy, Sebastiaan (11 people)
- Strategists: Sebastiaan (1 person)

## Solution

### Hook Changes: `useStrategistWorkload.ts`

Replace the `talent_strategists` query with a proper `profiles` + `user_roles` join:

```typescript
// OLD (broken)
const { data } = await supabase
  .from('talent_strategists')
  .select('id, user_id, full_name, ...')
  .eq('is_active', true);

// NEW (correct)
const { data } = await supabase
  .from('profiles')
  .select(`
    id,
    full_name,
    email,
    avatar_url,
    current_title,
    user_roles!inner(role)
  `)
  .in('user_roles.role', ['admin', 'strategist'])
  .order('full_name');
```

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useStrategistWorkload.ts` | Query `profiles` + `user_roles` instead of `talent_strategists` |
| `src/components/admin/StrategistCompanyTab.tsx` | Update to use new data structure (use `id` not `user_id`) |
| `src/components/admin/StrategistCandidateTab.tsx` | Update to use new data structure |
| `src/components/admin/StrategistWorkloadTab.tsx` | Update to use new data structure |
| `src/components/admin/CandidateStrategistDialog.tsx` | Update to use new data structure |

### Data Structure Change

```typescript
// OLD interface expected
interface Strategist {
  user_id: string;      // ❌ doesn't exist in talent_strategists
  full_name: string;
  photo_url: string;
  // ...
}

// NEW interface
interface TeamMember {
  id: string;           // ✅ profiles.id (used as strategist_id in assignments)
  full_name: string;
  email: string;
  avatar_url: string;
  current_title: string;
}
```

### Component Updates

All components that render strategist options need to change from:

```typescript
// OLD
{strategists?.map((s) => (
  <SelectItem key={s.user_id} value={s.user_id}>
    {s.full_name}
  </SelectItem>
))}

// NEW
{teamMembers?.map((member) => (
  <SelectItem key={member.id} value={member.id}>
    {member.full_name}
  </SelectItem>
))}
```

## Technical Details

### Database Query for Team Members

```sql
SELECT p.id, p.full_name, p.email, p.avatar_url, p.current_title
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role IN ('admin', 'strategist')
ORDER BY p.full_name
```

This returns all 11 team members who can be assigned as concierges.

### Workload Calculation Update

The workload calculation will continue to work because:
- `company_strategist_assignments.strategist_id` stores `profiles.id`
- `candidate_profiles.assigned_strategist_id` stores `profiles.id`

We just need to change the source of strategist info from `talent_strategists` to `profiles`.

## Expected Outcome

After this fix:
- Dropdowns will show all 11 TQC team members (admins + strategists)
- Assigning a team member will correctly store their `profiles.id`
- Workload calculations will accurately reflect company/candidate counts per team member
