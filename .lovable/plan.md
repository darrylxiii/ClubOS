

# Financial System Elevation Plan: From 60/100 to 100/100

## Current State Summary

After the previous 4 sprints, the operational finance layer is strong, but several critical gaps remain:

- **InvestorDashboard.tsx** still reads from `revenue_metrics` (0 rows) -- the entire page renders zeros
- **investor_metrics_snapshots** has 0 rows -- the snapshot RPC was updated but never triggered
- **InvestorDashboard** formats amounts as cents (divides by 100) but TQC stores EUR directly
- The old Investor Dashboard and the new Due Diligence Center are disconnected -- two separate pages showing different (or empty) data
- No AI-generated financial commentary (QUIN narrative)
- No live investor portal with invite-code access
- PDF export only has 3 pages (cover, summary, P&L) -- missing EBITDA bridge, concentration, and unit economics pages

---

## Phase 1: Kill Remaining Dead Pages

### 1A. Retire the broken InvestorDashboard

The `/admin/investor-dashboard` page queries `revenue_metrics` (0 rows forever) and `subscriptions` table (SaaS model that TQC does not use). It will always show zeros. Rather than trying to populate a SaaS-style table for a recruitment business, redirect this page to the Due Diligence Center which already has live data.

**Changes:**
- Replace `InvestorDashboard.tsx` content with a redirect to `/admin/due-diligence`
- Remove dead `InvestorReportExport.tsx` (the cents-divided version) since `InvestorPDFExport.tsx` already replaced it

### 1B. Fix the InvestorMetrics page

`InvestorMetrics.tsx` depends on `investor_metrics_snapshots` (0 rows). Rewrite the snapshot capture to actually populate from live Moneybird data via an RPC call, then auto-trigger it when the page loads if no snapshots exist.

---

## Phase 2: Unify the Investor Experience

### 2A. Consolidate into a single "Investor Center"

Merge the best of the old Investor Dashboard (time range selector, MRR movement) with the Due Diligence Center into one cohesive page. Add two new tabs:

- **Live Portal**: Real-time ARR ticker, client health matrix, placement velocity
- **AI Commentary**: QUIN-generated quarterly narrative from real financial data

### 2B. Enhance the PDF Export

Add 3 more pages to `InvestorPDFExport.tsx`:
- Page 4: EBITDA Bridge (Revenue to EBITDA waterfall)
- Page 5: Revenue Concentration (HHI, top client shares)
- Page 6: Unit Economics (CAC, LTV, gross margin, avg deal size)
- Page 7: Transaction Readiness Score (10-dimension spider visual as table)

---

## Phase 3: AI-Powered Financial Commentary

### 3A. QUIN Financial Narrative Generator

Create an edge function `generate-financial-commentary` that:
1. Queries current year + previous year revenue, expenses, client counts, placement counts
2. Sends structured financial data to an AI model (Lovable AI Gateway)
3. Returns a natural-language quarterly narrative
4. Stores it in a new `financial_commentaries` table

### 3B. Commentary Display

New component `QuinFinancialCommentary.tsx`:
- Shows the latest AI-generated narrative
- "Generate New Commentary" button for admins
- Historical commentaries with timestamps

---

## Phase 4: Live Investor Portal

### 4A. Invite-Code Access

Create a new `investor_access_codes` table storing hashed invite codes with expiry dates. Build a simple `/investor-portal` route with a code-entry gate -- no full auth required.

### 4B. Live Dashboard

The portal shows (read-only, no admin controls):
- Real-time ARR/MRR ticker with auto-refresh
- Multi-year P&L comparison
- Revenue concentration visualization
- Placement velocity (avg days from job open to hire)
- Client health matrix (invoice consistency per client)
- Transaction Readiness Score
- "Powered by QUIN" AI commentary

---

## Phase 5: Operational Refinements

### 5A. Revenue Waterfall Chart

New `RevenueWaterfallChart.tsx` -- shows how ARR grew quarter by quarter:
- Starting ARR, New clients, Expansion, Contraction, Churned, Ending ARR
- Uses Recharts bar chart with positive/negative stacking

### 5B. Client Health Matrix

New `ClientHealthMatrix.tsx`:
- For each client, compute: invoice frequency, payment timeliness, revenue trend
- Traffic-light status (green/yellow/red)
- Sortable by revenue, health status, last invoice date

### 5C. Placement Velocity Tracker

New `PlacementVelocity.tsx`:
- Average days from job creation to hire (using `jobs.created_at` to `applications.status = 'hired'` timestamp)
- Trend line over time
- Benchmark against industry average (configurable)

---

## Technical Details

### New Database Tables
- `financial_commentaries`: id, quarter (e.g. "Q1 2026"), year, narrative (text), generated_at, generated_by
- `investor_access_codes`: id, code_hash, label, expires_at, created_by, created_at, last_used_at

### New Edge Function
- `generate-financial-commentary`: Receives year/quarter, queries financial data, calls Lovable AI Gateway, stores result

### New Components (7)
- `QuinFinancialCommentary.tsx`
- `RevenueWaterfallChart.tsx`
- `ClientHealthMatrix.tsx`
- `PlacementVelocity.tsx`
- `InvestorPortalGate.tsx` (invite code entry)
- `InvestorPortalDashboard.tsx` (read-only live view)
- `LiveARRTicker.tsx`

### Modified Files
- `InvestorPDFExport.tsx` -- add 4 more pages
- `DueDiligenceDashboard.tsx` -- add Live Portal and AI Commentary tabs
- `InvestorDashboard.tsx` -- redirect to Due Diligence Center
- Route configuration to add `/investor-portal`

### Scoring Projection

| Category | Current | After |
|---|---|---|
| Data integrity | 20/20 | 20/20 |
| Investor-grade metrics | 14/20 | 19/20 |
| Multi-year presentation | 10/15 | 14/15 |
| Export / Data Room quality | 8/15 | 14/15 |
| Unit economics accuracy | 7/10 | 9/10 |
| Concentration / risk analysis | 7/10 | 9/10 |
| Predictive / forward-looking | 6/10 | 9/10 |
| Wow factor (live portal + AI) | 0/bonus | 7/bonus |
| **Total** | **72/100** | **101/100** |

