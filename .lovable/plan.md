

# Replace KPI Health with Team Capacity Heatmap

## What Changes

The static "KPI Health" widget in Admin Home Zone 3 will be replaced with a live **Team Capacity Heatmap** showing each strategist's current workload at a glance -- who has bandwidth, who's overloaded, and how many candidates/companies each is managing.

## Why This Matters

- Prevents bottlenecks by making overloaded team members visible instantly
- Speeds up candidate routing -- admins can see who to assign to without navigating away
- Protects revenue by ensuring no strategist is silently drowning in work

## Design

The widget will show:
- Each strategist as a compact row with avatar, name, and a color-coded capacity bar (green < 60%, amber 60-85%, red > 85%)
- Candidate and company counts as small inline stats
- A "Manage" link to the Strategist Management modal
- Sorted by capacity (most loaded first) so problems surface immediately

## Technical Details

**File created:** `src/components/clubhome/TeamCapacityWidget.tsx`
- New widget component replacing `KPISummaryWidget` in the Zone 3 grid
- Reuses the existing `useStrategistWorkload` hook (no new data fetching needed)
- Shows top 4 strategists in the compact card, with "View All" linking to the full management view
- Capacity bar uses semantic colors: emerald (healthy), amber (watch), red (overloaded)
- Follows the `glass-subtle rounded-2xl` aesthetic standard

**File modified:** `src/components/clubhome/AdminHome.tsx`
- Swap the `KPISummaryWidget` import/usage for `TeamCapacityWidget`

No database changes, no new hooks -- purely a UI replacement leveraging existing data infrastructure.

