

# Revenue and Growth Widget -- Elite Upgrade

## Current Score: 32/100

| Category | Current | Target | Gap |
|---|---|---|---|
| Period selection | 0 | 15 | No user control, hardcoded 6 months |
| Revenue depth | 5 | 15 | Only "this month" total, no breakdown |
| Chart quality | 5 | 10 | Tiny 80px sparkline, single line, no interactivity |
| Growth integration | 5 | 10 | PlatformGrowthCard exists but not shown here |
| Pipeline intelligence | 7 | 10 | Decent but no weighted stages |
| Visual polish | 5 | 15 | Generic card, no premium feel |
| Comparative analytics | 0 | 10 | No period-over-period, no targets |
| Forecasting | 5 | 10 | Basic pipeline value only |
| Data granularity | 0 | 5 | Monthly only |

---

## Plan to reach 100/100

### 1. Period Selector (0 to 15)

Add a pill-toggle strip at the top of the widget with these options:
- This Month
- Last Month
- Last 3 Months
- Last 6 Months
- YTD (Year to Date)
- Last Year
- Custom (date picker)

All data in the widget reacts to the selected period. The comparison period is automatically set to the equivalent preceding period (e.g., "Last 3 Months" compares to the 3 months before that).

### 2. Revenue Depth (5 to 15)

Replace the single "This Month" number with a rich metrics strip:

- **Total Revenue** -- sum of all placements in selected period
- **Avg. Revenue per Placement** -- total / hires count
- **Revenue per Working Day** -- total / business days in period
- **Best Month** -- highest single month in range
- **Placements Count** -- total hires in period

Each metric shows value + delta vs comparison period (green/red arrow + percentage).

### 3. Chart Quality (5 to 10)

Replace the 80px sparkline with a proper 200px interactive area chart:
- Revenue bars (primary) + placement count line (secondary axis)
- Hover tooltip showing exact values
- Previous period shown as a faded overlay line for instant comparison
- Monthly granularity for 3m+, weekly for shorter periods

### 4. Growth Integration (5 to 10)

Add a compact "Growth Indicators" strip below the chart showing 4 mini-metrics side by side:
- User growth % (period)
- Company growth % (period)
- Job growth % (period)  
- Application volume (period)

These reuse the existing `usePlatformGrowth` hook data but filtered to the selected period.

### 5. Pipeline Intelligence (7 to 10)

Upgrade the pipeline value section:
- Show weighted pipeline value per stage (applied/screening/interview/offer each with different conversion probability)
- Mini horizontal funnel visualization (reuse the KPIScorecard pattern)
- "Expected closings this month" count

### 6. Visual Polish (5 to 15)

- Animated count-up on numbers when data loads (using framer-motion)
- Subtle gradient header strip with the DollarSign icon
- Premium gold accent on the total revenue number
- Micro-sparkline next to each metric showing its trend direction
- Smooth transitions when switching periods
- Dark glass card with refined border treatment

### 7. Comparative Analytics (0 to 10)

- Auto-calculate comparison period (previous equivalent period)
- Show delta badges on every metric ("+12% vs last period")
- Optional revenue target/goal line on the chart (from platform_settings)
- "On track" / "Behind" indicator if target is set

### 8. Forecasting (5 to 10)

- Linear projection line on chart extending 1 month forward based on current trend
- "Projected month-end" value based on days elapsed + current pace
- Pipeline-weighted forecast combining trend + active pipeline

### 9. Data Granularity (0 to 5)

- Auto-select granularity based on period: daily for "This Month", weekly for 3m, monthly for 6m+
- Toggle between daily/weekly/monthly when period allows

---

## Technical approach

### Files to create
- `src/components/clubhome/RevenueGrowthWidget.tsx` -- new combined widget replacing `RevenueSparkline`
- `src/hooks/useRevenueAnalytics.ts` -- new hook that accepts a period parameter and returns all revenue + growth metrics

### Files to modify
- `src/components/clubhome/AdminHome.tsx` -- swap `RevenueSparkline` for new `RevenueGrowthWidget`

### Data fetching strategy
The new `useRevenueAnalytics` hook will:
1. Accept a period type (thisMonth, lastMonth, 3m, 6m, ytd, 1y, custom)
2. Calculate date ranges for both selected period and comparison period
3. Fetch placement counts grouped by month/week from `applications` table (status = 'hired')
4. Fetch pipeline counts by stage from `applications` table
5. Use `usePlatformSettings` for placement fee + conversion rate
6. Calculate all derived metrics (avg per placement, per working day, projections)
7. Return a structured object with all metrics, chart data, and comparison deltas

All queries use the existing `applications`, `profiles`, `companies`, and `jobs` tables. No database changes required.

### Period selector UX
Compact pill toggle (same pattern as the KPIScorecard range selector) placed in the widget header. "Custom" option opens a date range popover using the existing Calendar component.

