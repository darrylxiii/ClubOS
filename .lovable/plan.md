

# MRR / Pipeline / Placements / Active Jobs — Full Audit

## Score: 35/100

The four headline metrics on the admin home (`RevenueTickerStrip`) are fundamentally broken. Three of the four display fabricated or mislabeled data. The root cause is not RLS or auth — it's that the data sources are wrong.

---

## Bug-by-Bug Breakdown

### 1. **MRR is fictional** (Critical — data integrity)

`RevenueTickerStrip` line 59-62:
```
label: "MRR",
value: formatCompact(revenue?.totalRevenue ?? 0),
```

`useRevenueAnalytics` line 222: `totalRevenue = totalHires * fee` where `fee = settings.estimated_placement_fee` (default €15,000).

This counts `applications` with `status='hired'` in the current month and multiplies by a **flat estimated fee**. It ignores:
- **Actual placement fees** from `placement_fees` table (with real `fee_amount` values)
- **Moneybird invoices** from `moneybird_sales_invoices` (the accounting source of truth)
- **Variable fees** — each company has different `placement_fee_percentage` values

A company paying 25% on a €120k salary (€30k fee) is counted as €15k. A company paying 15% on a €50k salary (€7.5k fee) is also counted as €15k. The number is meaningless.

**Fix**: Use `placement_fees` table for realized revenue (sum of `fee_amount` where `hired_date` is in the current month and `status != 'cancelled'`). The `moneybird_sales_invoices` table is the gold standard but may lag; `placement_fees` is the best real-time proxy.

### 2. **Pipeline value uses application stages, not deal pipeline** (Critical — wrong data source)

`RevenueTickerStrip` line 65-68:
```
label: "Pipeline",
value: formatCompact(revenue?.totalPipelineValue ?? 0),
```

`useRevenueAnalytics` lines 242-260: counts applications in stages `applied`, `screening`, `interview`, `offer`, multiplies each by the flat €15k fee × a hardcoded probability weight.

The app already has a proper CRM deal pipeline (`usePipelineMetrics` → `calculate_weighted_pipeline` RPC, `useCRMPipelineMetrics` → `calculate_crm_weighted_pipeline` RPC) that uses actual deal values and stage probabilities from the `deal_stages` / `crm_stage_probabilities` tables.

**Fix**: Use `usePipelineMetrics()` or `useCRMPipelineMetrics()` which already exist and return real weighted pipeline values.

### 3. **Placements uses unreliable `updated_at` filter** (Medium — wrong timestamps)

`useRevenueAnalytics` line 170-177:
```typescript
const { count } = await supabase
  .from('applications')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'hired')
  .gte('updated_at', start.toISOString())
  .lte('updated_at', end.toISOString());
```

`updated_at` changes on **any** edit to the application (notes, tags, reviewer assignment). A candidate hired 6 months ago whose application was edited today shows up as a "this month" placement. Conversely, a hire made this month whose record hasn't been touched since the status change may have an `updated_at` from before the month boundary.

**Fix**: Use `placement_fees.hired_date` for placement counts — it's the canonical hire date. Or use `stage_updated_at` from applications if `placement_fees` doesn't have the record yet.

### 4. **"Active Jobs" actually shows total applications in pipeline** (Critical — wrong metric entirely)

`RevenueTickerStrip` line 77-78:
```typescript
label: "Active Jobs",
value: `${Object.values(kpi?.pipeline?.stageCounts ?? {}).reduce((a, b) => a + b, 0) || 0}`,
```

`useAdminKPIScorecard` lines 77-83 counts **applications** per stage (`applied`, `screening`, `interview`, `offer`, `hired`). The sum is total applications across all stages — NOT active jobs.

If there are 5 active jobs with 200 total applications, this shows "200" under "Active Jobs". Completely misleading.

**Fix**: Count jobs with `status = 'published'`:
```typescript
const { count } = await supabase
  .from('jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'published');
```

### 5. **`useRevenueAnalytics` makes 15+ sequential DB queries per load** (Performance)

The hook fires: 1 query per month in current period + 1 per month in comparison period + 4 stage count queries + 8 growth queries = ~15-20 queries every time the admin home loads. With a 5-minute stale time, this fires frequently. Most of these could be consolidated or replaced with the existing RPC functions.

### 6. **`console.log` in production** (Code quality)

`useDealPipeline` lines 80, 102, 153, 163, 173: `console.log('[DealPipeline]...')` and `console.error` statements left in production code.

---

## Implementation Plan

### Approach

Replace the data sources in `RevenueTickerStrip` to use real data:

| Metric | Current (broken) | Fix |
|--------|-----------------|-----|
| **MRR** | `applications.status='hired'` count × flat €15k | `placement_fees` sum of `fee_amount` for current month by `hired_date` |
| **Pipeline** | Application stage counts × flat fee × hardcoded probability | `usePipelineMetrics()` (existing hook, uses `calculate_weighted_pipeline` RPC) |
| **Placements** | `applications.status='hired'` filtered by `updated_at` | `placement_fees` count where `hired_date` in current month |
| **Active Jobs** | Sum of application stage counts | `jobs` count where `status='published'` |

### Files to Edit

| File | Changes |
|------|---------|
| `src/components/clubhome/RevenueTickerStrip.tsx` | Replace `useRevenueAnalytics` with a new lightweight hook; use `usePipelineMetrics` for pipeline value; add direct job count query |
| `src/hooks/useRevenueTickerData.ts` **(new)** | New focused hook that queries `placement_fees` for MRR + placement count, `jobs` for active count. ~3 queries total instead of 15+ |
| `src/hooks/useDealPipeline.ts` | Remove `console.log` statements (lines 80, 102, 153, 163, 173) |

### Hook Design (`useRevenueTickerData`)

```text
Query 1: placement_fees → SUM(fee_amount), COUNT(*) 
         WHERE hired_date >= month_start AND status != 'cancelled'
         + same for previous month (comparison delta)

Query 2: jobs → COUNT(*) WHERE status = 'published'

Query 3: reuse existing usePipelineMetrics() for weighted pipeline
```

This replaces 15+ queries with 2 new ones + 1 existing hook reuse.

### Delta Calculations

- **MRR delta**: current month placement fee sum vs previous month
- **Placements delta**: current month hire count vs previous month
- **Pipeline & Active Jobs**: no delta (same as current)

### No database changes needed.

The existing `placement_fees` table, `calculate_weighted_pipeline` RPC, and `jobs` table already have the correct data. The problem is purely that the ticker strip queries the wrong sources.

