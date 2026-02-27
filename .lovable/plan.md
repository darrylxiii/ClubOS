
# Wall Street $500M Exit Audit: The 0.0001% CFO Analysis

## Current State Assessment

**Live data snapshot**: 52 invoices, 7 unique clients, EUR 387K net revenue across 2024-2026, 226 candidates, 1 hire, 18 companies, EUR 72K uninvoiced placement fees, 0 investor metric snapshots, 0 revenue_metrics rows.

**Verdict: Not Wall Street ready. Score: 38/100.**

The operational finance system (P&L, VAT, cash flow) is now mechanically correct after the previous fixes. But the investor-facing layer -- the part that makes or breaks a $500M narrative -- is a Potemkin village: hardcoded numbers, empty tables, disconnected data sources, and no auditable trail between claimed metrics and actual revenue.

---

## TIER 1: CREDIBILITY DESTROYERS (Things that end a deal in the first meeting)

### 1.1 Due Diligence Dashboard shows hardcoded fake metrics

`MetricsOverviewDashboard.tsx` lines 34-37:
```
arr: 2400000,
mrr: 200000,
growthRate: 15.2,
```

Lines 126-140 display hardcoded unit economics:
- "Customer Acquisition Cost: EUR 2,400" (fabricated)
- "Lifetime Value: EUR 48,000" (fabricated)
- "LTV:CAC Ratio: 20:1" (fabricated)
- "Net Revenue Retention: 125%" (fabricated)
- "Monthly Churn Rate: 1.2%" (fabricated)

An investor doing 5 minutes of due diligence would compare these numbers to the actual P&L (EUR 387K total revenue across 3 years). The ARR claim of EUR 2.4M is 6x actual lifetime gross revenue. This is an immediate deal-killer.

### 1.2 Investor Dashboard reads from empty `revenue_metrics` table

`InvestorDashboard.tsx` queries `revenue_metrics` (0 rows in database). Every metric -- ARR, MRR, churn, NRR, Quick Ratio, LTV, ARPU -- will render as 0 or fallback values. The CAC calculation is `arpu * 3` -- a placeholder that becomes 0 when ARPU is 0. The entire dashboard is a blank wall.

### 1.3 `investor_metrics_snapshots` table has 0 rows

`InvestorMetrics.tsx` depends on `investor_metrics_snapshots` via `useLatestInvestorMetrics()`. The "Refresh" button calls `capture_investor_metrics_snapshot` RPC. But no snapshot has ever been captured. All valuation calculations (5x ARR, 10x ARR, 15x ARR) compute to EUR 0. The "Rule of 40" shows as null.

### 1.4 Revenue Dashboard uses GROSS `total_amount` instead of NET

`useInvestorMetrics()` (line 174): `totalRevenue += Number(inv.total_amount) || 0`. This sums gross amounts (incl. 21% VAT) while the rest of the finance system now uses net. An investor comparing the Revenue Dashboard to the P&L would see a ~21% discrepancy and question all numbers.

---

## TIER 2: NARRATIVE GAPS (Things that prevent a compelling $500M story)

### 2.1 No EBITDA calculation anywhere

Wall Street cares about EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization). The P&L stops at "Net Profit" but never computes EBITDA. For a $500M sale, EBITDA margin and EBITDA multiple are the primary valuation anchors for a services/marketplace hybrid.

### 2.2 No revenue concentration / client dependency analysis

7 unique clients generate all EUR 387K. If one client represents 40%+ of revenue, that is a material concentration risk. No component surfaces this. The `TopClientsTable` shows revenue by client but does not calculate or flag concentration percentages (Herfindahl index or top-3 share).

### 2.3 No Burn Multiple (Bessemer metric)

Burn Multiple = Net Burn / Net New ARR. This is the single most important efficiency metric for growth-stage companies. Neither the Investor Dashboard nor any component computes it.

### 2.4 No Magic Number

Magic Number = QoQ Net New ARR / Prior Quarter Sales & Marketing Spend. Standard Wall Street metric for go-to-market efficiency. Missing entirely.

### 2.5 No Gross Margin computation with proper COGS definition

`gross_profit` in the edge function was changed to `totalRevenue - totalCommissions`, but COGS for a recruiting marketplace should include: recruiter commissions + referral payouts + ATS costs + any variable costs tied to placements. The P&L has "Gross Margin = Revenue - Commissions - Payouts" which is close but never explicitly called out as a percentage on the investor dashboards.

### 2.6 No revenue per placement / revenue per candidate / revenue per employee metrics

These are the core unit economics for a recruiting business. TQC has 1 hire, 5 placement fees, and 226 candidates. The system should compute: revenue per successful placement, cost per candidate sourced, and revenue per employee (headcount not tracked).

---

## TIER 3: PRESENTATION GAPS (Things that make investors squint)

### 3.1 Investor Report Export uses cents-based formatting for a EUR business

`InvestorReportExport.tsx` divides all values by 100 (line 56: `row.mrr / 100`) because the `revenue_metrics` table stores values in cents. But the actual finance system stores values in EUR (not cents). If someone ever populates `investor_metrics_snapshots` with EUR values (as the snapshot RPC would do), the export would divide EUR by 100, showing 1% of actual revenue.

### 3.2 No watermarked PDF investor deck export

The "Export" button generates CSV, JSON, or a plain-text file. For a $500M deal, investors expect a branded PDF with watermarks (viewer's email + timestamp), charts, and TQC branding. The current "Executive Summary" is a `.txt` file with ASCII art borders.

### 3.3 Data Room has no access audit trail

`DataRoomManager` tracks `view_count` and `last_viewed_at`, but does not log WHO viewed WHAT WHEN. For due diligence, you need: `data_room_access_logs(user_id, document_id, action, ip_address, timestamp)`. The "Generate Access Link" creates a fake URL that goes nowhere (line 165: `app.thequantumclub.com/data-room/inv-${Date.now()}`).

### 3.4 No consolidated multi-year financial summary

Investors want a 3-year P&L side-by-side (2024 vs 2025 vs 2026) in one view. The current P&L card shows one year at a time with a YoY badge. There is no table showing revenue, COGS, gross margin, opex, EBITDA, and net profit across all years in columns.

### 3.5 No runway calculation

With burn rate data and cash position, the system should show: "At current burn, runway is X months." No cash balance is tracked. No runway metric exists.

---

## TIER 4: MISSING WALL STREET TABLE STAKES

### 4.1 No cap table / ownership structure
### 4.2 No scenario modeling (bear/base/bull)
### 4.3 No comparable company analysis
### 4.4 No customer acquisition funnel metrics (lead to customer conversion, time-to-first-revenue)
### 4.5 No TAM/SAM/SOM visualization
### 4.6 No employee headcount and revenue-per-employee trend

---

## THE 0.0001% PLAN: What Would Actually Amaze

### Phase 1: Kill the Lies (Immediate -- fix credibility)

**1A. Replace all hardcoded metrics with live data**

Delete the fake numbers in `MetricsOverviewDashboard.tsx`. Instead:
- ARR = `moneybird_financial_metrics.total_revenue` for current year, annualized by dividing by months elapsed and multiplying by 12
- MRR = ARR / 12
- Growth Rate = (current year revenue / prior year revenue - 1) * 100
- Client count = `count(DISTINCT contact_id) FROM moneybird_sales_invoices WHERE year = current`
- Unit economics = computed from real placement fees and commissions

Replace hardcoded unit economics (EUR 2,400 CAC, EUR 48,000 LTV, etc.) with:
- CAC = total operating expenses / new clients acquired in period
- LTV = average revenue per client * average client lifetime (measured from first to last invoice)
- Gross Margin = (net revenue - commissions - payouts) / net revenue

**1B. Populate `investor_metrics_snapshots` from real data**

Rewrite or fix `capture_investor_metrics_snapshot` RPC to pull from `moneybird_sales_invoices`, `placement_fees`, `companies`, `candidate_profiles`, and `applications` -- the same tables the operational finance system uses. Run it once to seed current state.

**1C. Fix Revenue Dashboard to use NET revenue**

Change `useInvestorMetrics()` line 174 from `total_amount` to `net_amount`, falling back to `grossToNet(total_amount)`.

### Phase 2: Build the $500M Narrative (High Priority)

**2A. EBITDA Card**

New component: `EBITDACard.tsx`
- EBITDA = Net Revenue - COGS (commissions + payouts) - OpEx (operating expenses + subscriptions)
- Display: EBITDA, EBITDA margin %, EBITDA multiple at various valuations
- YoY comparison

**2B. Revenue Concentration Widget**

New component: `RevenueConcentrationCard.tsx`
- Top-1, Top-3, Top-5 client share of total revenue
- Herfindahl-Hirschman Index (HHI)
- Flag: "Concentrated" if top client >25% or HHI >2500
- Trend over time (quarterly)

**2C. Multi-Year P&L Comparison Table**

New component: `MultiYearPLTable.tsx`
- Side-by-side columns: 2024 | 2025 | 2026 YTD
- Rows: Revenue, COGS, Gross Margin, OpEx, EBITDA, Net Profit
- YoY growth percentages between each column
- Exportable as PDF

**2D. Burn Multiple and Efficiency Metrics**

Compute and display:
- Burn Multiple = Net Burn / Net New ARR
- Rule of 40 = Revenue Growth % + EBITDA Margin % (replace the current fake `+ 20` assumption)
- Gross Margin %
- Net Revenue per Placement
- Revenue per Employee (require headcount input)

### Phase 3: Investor-Grade Presentation (Medium Priority)

**3A. Branded PDF Investor Report**

Replace the plain-text executive summary with a jsPDF report that includes:
- TQC logo and branding (dark theme, gold accents)
- Viewer watermark (email + timestamp)
- Multi-year P&L table
- EBITDA bridge chart
- Revenue concentration analysis
- Unit economics summary
- Cohort retention chart
- Data generated timestamp + "Confidential" footer

**3B. Data Room Access Logging**

Create `data_room_access_logs` table. Log every document view, download, and link generation with user ID, IP, user agent, timestamp. Surface an access timeline on the admin side so you can see which documents investors spend time on.

**3C. Runway Calculator**

New component: `RunwayCalculator.tsx`
- Input: current cash balance (manual entry or bank integration)
- Monthly burn = operating expenses + subscriptions - net collections
- Runway months = cash balance / monthly net burn
- Scenarios: current burn, reduced burn (-20%), increased revenue (+20%)

### Phase 4: The 0.0001% Brilliance (What separates from every other company)

**4A. Live Investor Portal**

Instead of static exports, create a `/investor` route (behind invite code auth) that shows:
- Real-time ARR ticker
- Interactive multi-year P&L with drill-down
- Revenue waterfall chart (how ARR grew quarter by quarter)
- Client health matrix (green/yellow/red per client based on billing consistency)
- Placement velocity chart (time from job opening to hire, trending)

This is what makes Goldman Sachs analysts say "we have never seen a company this transparent."

**4B. AI-Powered Financial Commentary**

Use QUIN to auto-generate a natural-language financial narrative each quarter:
- "Revenue grew 142% YoY driven by 3 new enterprise clients. Gross margin expanded from 72% to 78% as commission rates normalized. Concentration risk decreased: top client now represents 28% of revenue, down from 41% in prior year."

This would be generated from actual data, not fabricated. Stored as quarterly investor memos.

**4C. Predictive Revenue Model**

Use historical placement data to build a forward-looking model:
- Based on current pipeline (5 fees pending), expected conversion rates, and average deal sizes
- Show projected quarterly revenue for next 4 quarters
- Include confidence intervals (P10, P50, P90)
- Automatically update as pipeline changes

**4D. Transaction Readiness Score**

A dashboard widget that scores exit-readiness on 10 dimensions:
1. Revenue quality (recurring vs one-time)
2. Revenue concentration (HHI)
3. Gross margin trend
4. EBITDA margin
5. Growth rate
6. Client retention
7. Financial controls (period close, audit trail)
8. Data room completeness
9. Legal/compliance readiness
10. Technology documentation

Each dimension: 0-10. Total: 0-100. With specific actions to improve each score.

---

## Implementation Priorities

**Sprint 1 (Phase 1): Kill the lies -- 4 changes**
- Replace hardcoded metrics in MetricsOverviewDashboard with live queries
- Fix useInvestorMetrics to use net_amount
- Fix/populate investor_metrics_snapshots from real data
- Fix InvestorReportExport cents-based formatting

**Sprint 2 (Phase 2): Build the narrative -- 4 new components**
- EBITDACard
- RevenueConcentrationCard
- MultiYearPLTable
- Burn Multiple / efficiency metrics

**Sprint 3 (Phase 3): Presentation quality -- 3 changes**
- Branded PDF investor report
- Data room access logging
- Runway calculator

**Sprint 4 (Phase 4): The brilliance -- build competitive moat**
- Live investor portal route
- AI financial commentary
- Predictive revenue model
- Transaction readiness scorecard

---

## Scoring Breakdown

| Category | Max | Current | After Plan |
|---|---|---|---|
| Data integrity (no fake numbers) | 20 | 2 | 20 |
| Investor-grade metrics (EBITDA, burn multiple, etc.) | 20 | 0 | 18 |
| Multi-year presentation quality | 15 | 3 | 14 |
| Export / Data Room quality | 15 | 5 | 14 |
| Unit economics accuracy | 10 | 1 | 9 |
| Concentration / risk analysis | 10 | 0 | 9 |
| Predictive / forward-looking | 10 | 4 | 9 |
| Overall "wow" factor | (bonus) | 0 | 7 |
| **Total** | **100** | **15** | **100** |

The current investor layer scores 15/100 primarily because 80% of displayed numbers are either hardcoded fakes or come from empty tables. The operational finance layer (which scores ~85/100 after previous fixes) is completely disconnected from the investor presentation layer.
