
# Intelligent Job Urgency Meter (0-10) — Implemented

## What was built

### Database
- Added `urgency_score_manual`, `urgency_score_manual_set_by`, `urgency_score_manual_set_at` columns to `jobs` table
- Validation trigger ensures 0-10 range

### Scoring Engine (`src/lib/jobUrgencyScore.ts`)
Four weighted layers compute a data-driven 0-10 score:
- **Time Pressure** (max 3): days open, deadlines, partner-stated urgency
- **Pipeline Health** (max 3): candidate count, active count, conversion rate
- **Activity Decay** (max 2): staleness of pipeline activity
- **Intelligence Boost** (max 2): CRM hiring urgency, relationship health

Manual override replaces the computed score entirely when set by an admin.

### Visual Component (`src/components/jobs/UrgencyMeter.tsx`)
- Circular arc gauge with color gradient (green → amber → red)
- Tooltip with full breakdown for non-admins
- Admin popover with slider (0-10) to set/clear manual override
- Persists override to DB with user tracking

### Integration
- **CompactJobCard**: Urgency meter in badge row (top-right, auto-aligned)
- **JobCardHeader**: Replaces old categorical UrgencyBadge
- **JobTableView**: New sortable "Urgency" column with meter
- **PartnerJobsHome**: Query expanded to fetch all urgency-related fields
