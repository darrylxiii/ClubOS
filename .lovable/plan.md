
# Enterprise Subscription and Cost Management Overhaul

## Current State

Your subscription tracker already exists at **Admin > Finance > Subscriptions tab**. It includes:
- A vendor subscriptions table with full CRUD (add/edit/delete)
- SaaS Stack Overview with MRC/ARC metrics, top vendors, and seat utilization warnings
- A renewal calendar showing upcoming renewals
- Integration with the Profit and Loss card (subscriptions + operating expenses feed into net profit)

The **Expenses tab** also exists with basic add/delete and category breakdown.

**Both are currently empty** (0 records), which is why they appear non-functional. The infrastructure is there but needs enterprise-grade upgrades.

---

## What Needs to Change

### 1. Dedicated Subscription Management Page (Standalone Route)

Currently buried as a tab inside the Finance Hub. Enterprise-grade means it gets its own full page at `/admin/subscriptions` with:
- **Hero metrics strip**: Total MRC, Total ARC, cost per employee, YoY change, upcoming renewal cost
- **Cost vs Revenue ratio**: Real-time comparison against Moneybird revenue (show subscription costs as % of revenue)
- **Burn rate projection**: Monthly burn trend line with 6-month forecast
- **Renewal timeline**: Gantt-style bar chart showing all contract windows and renewal dates
- **ROI tagging**: Each subscription gets an optional "revenue attribution" (e.g., Instantly generates CRM pipeline worth X, so its cost is justified)

### 2. Link Subscriptions to Operating Expenses

Currently these are two disconnected systems. Changes:
- Add an `operating_expense_category` field to `vendor_subscriptions` that auto-links each subscription to an expense category
- Auto-generate monthly operating expense entries from active subscriptions (so P&L stays accurate without manual entry)
- Show a unified "Total Cost of Operations" view: subscriptions + one-off expenses + commissions + payouts

### 3. Cost Intelligence Cards

New widgets for the dashboard:
- **Cost per Placement**: Total operating costs / number of placements (from `placement_fees`)
- **Cost per Revenue Euro**: How much it costs to generate each euro of revenue
- **Subscription Health Score**: Composite score based on utilization, criticality, and cost efficiency
- **Savings Opportunities**: Flag underutilized seats, duplicative tools in same category, approaching contract end (renegotiation window)

### 4. Budget vs Actual Tracking

Add a `subscription_budgets` table:
- Set monthly/quarterly budgets per category
- Show budget vs actual with variance alerts
- Traffic-light indicators: green (<90%), amber (90-100%), red (>100%)

### 5. Expense Auto-Import from Subscriptions

A background process (or button) that converts active vendor subscriptions into monthly `operating_expenses` entries, so the P&L card and Expense Tracking page always reflect SaaS costs without manual re-entry.

---

## Technical Details

### Database Changes (SQL Migration)

**New table: `subscription_budgets`**
- `id` (uuid, PK)
- `category` (text) -- matches vendor_subscriptions category
- `budget_amount` (numeric) -- monthly budget
- `period_type` (text) -- 'monthly' | 'quarterly' | 'annual'
- `year` (integer)
- `notes` (text, nullable)
- `created_at`, `updated_at`

**Alter `vendor_subscriptions`:**
- Add `revenue_attribution` (text, nullable) -- what revenue this tool helps generate
- Add `roi_notes` (text, nullable) -- justification notes
- Add `operating_expense_category_id` (uuid, nullable, FK to expense_categories)

### New Files

| File | Purpose |
|------|---------|
| `src/pages/admin/SubscriptionManagement.tsx` | Standalone full-page subscription management with hero metrics, burn rate chart, cost-vs-revenue, and budget tracking |
| `src/components/financial/CostIntelligenceCards.tsx` | Cost per placement, cost per revenue euro, health score, savings opportunities |
| `src/components/financial/BurnRateChart.tsx` | Monthly burn trend line with projection using recharts |
| `src/components/financial/BudgetVsActual.tsx` | Category budget vs actual spend with variance indicators |
| `src/components/financial/SubscriptionROITable.tsx` | Enhanced vendor table with ROI attribution and cost justification |
| `src/components/financial/CostBreakdownSankey.tsx` | Visual flow from revenue to costs to profit |

### Modified Files

| File | Change |
|------|--------|
| `src/routes/admin.routes.tsx` | Add route `/admin/subscriptions` |
| `src/components/admin/AdminSidePanel.tsx` | Add navigation link to Subscription Management |
| `src/components/financial/ProfitLossCard.tsx` | Add budget variance indicator |
| `src/hooks/useVendorSubscriptions.ts` | Add budget queries, ROI fields, expense auto-generation hook |
| `src/components/financial/SubscriptionsTab.tsx` | Add link to full page, add cost intelligence cards |

### Key Calculations

- **Cost per Placement** = (Total Operating Expenses + Total Subscription Costs) / Count of placement_fees
- **Cost per Revenue Euro** = Total Costs / Net Revenue from Moneybird
- **Burn Rate** = Sum of all monthly_cost from active vendor_subscriptions + average monthly operating_expenses
- **Projected Runway** = Current cash position (if tracked) / monthly burn rate
- **Subscription Health Score** = weighted average of seat utilization (30%), cost trend (20%), criticality alignment (20%), renewal proximity (15%), category concentration risk (15%)

### Route Structure

```text
/admin/subscriptions          --> Full subscription management page
/admin/finance?tab=subscriptions --> Keeps existing tab (links to full page)
/admin/finance?tab=expenses   --> Enhanced with auto-imported subscription expenses
```

---

## What You Get After Implementation

1. A dedicated command center for all SaaS and recurring costs
2. Real-time cost-to-revenue ratios showing operational efficiency
3. Budget guardrails with alerts when categories overspend
4. Auto-generated expense entries from subscriptions (no double-entry)
5. ROI justification per tool so you can evaluate what to keep/cut
6. Savings opportunities automatically flagged (unused seats, duplicate tools, renegotiation windows)
7. Everything flows into the existing P&L card for accurate net profit calculation
