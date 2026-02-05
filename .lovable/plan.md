

## CRM Enhancements: Comprehensive Implementation Plan

Based on my deep audit of the CRM system at `/crm/focus` and supporting components, I've identified several gaps and enhancement opportunities that will transform the CRM into an enterprise-grade sales pipeline tool.

---

### Current State Assessment

| Component | Status | Score |
|-----------|--------|-------|
| `useCRMActivities` hook | Complete | 95/100 |
| `ActivityItem` component | Complete | 90/100 |
| `ActivityQuickAdd` dialog | Complete | 88/100 |
| `FocusView` page | Functional | 82/100 |
| `ProspectActivityLog` | **Mock data only** | 45/100 |
| Bulk activity operations | Missing | 0/100 |
| Activity reminders | Partial | 60/100 |
| Activity analytics | Missing | 0/100 |

---

### Enhancement Areas

#### 1. Live Prospect Activity Logging (Priority: High)

**Problem:** `ProspectActivityLog.tsx` currently uses **hardcoded mock data** (lines 36-82) instead of fetching real activity data from the database.

**Solution:**
- Create new hook `useProspectActivityLog` to fetch real activity data from `crm_activities` table
- Subscribe to realtime updates for live activity feed
- Support filtering by activity type
- Log all prospect interactions automatically (email opens, stage changes, notes, field updates)

**Files to modify:**
- `src/components/crm/ProspectActivityLog.tsx` - Replace mock data with live database queries
- Create `src/hooks/useProspectActivityLog.ts` - New hook for activity logging

---

#### 2. Bulk Activity Operations (Priority: High)

**Problem:** No way to bulk complete, reschedule, or reassign activities.

**Solution:**
- Add multi-select capability to `ActivityItem` component
- Create `BulkActivityActions` component for mass operations
- Support bulk complete, bulk reassign, bulk reschedule, bulk delete

**Files to create:**
- `src/components/crm/BulkActivityActions.tsx` - Bulk action toolbar
- Update `src/pages/crm/FocusView.tsx` - Add selection state and bulk actions bar

---

#### 3. Activity Edit Functionality (Priority: Medium)

**Problem:** `ActivityItem` has an `onEdit` prop but no actual edit dialog/modal implemented.

**Solution:**
- Create `ActivityEditDialog` component for editing existing activities
- Wire up to the `onEdit` handler in `ActivityItem`
- Support editing subject, description, due date, time, priority, type

**Files to create:**
- `src/components/crm/ActivityEditDialog.tsx` - Edit modal for activities

---

#### 4. Activity Recurring/Templates (Priority: Medium)

**Problem:** No way to create recurring activities or use templates.

**Solution:**
- Add "repeat" option to `ActivityQuickAdd`
- Create activity templates for common tasks (e.g., "Weekly check-in call", "Monthly review")
- Database: Add `recurrence_rule` column to `crm_activities` table

**Files to modify:**
- `src/components/crm/ActivityQuickAdd.tsx` - Add recurrence options
- Database migration for `recurrence_rule` column

---

#### 5. Activity Analytics Dashboard (Priority: Medium)

**Problem:** No visibility into activity completion rates, team performance, or activity trends.

**Solution:**
- Create `ActivityAnalyticsDashboard` component with:
  - Completion rate over time
  - Activities by type distribution
  - Team member leaderboard
  - Overdue trend analysis
- Add to CRM Dashboard as a new tab

**Files to create:**
- `src/components/crm/ActivityAnalyticsDashboard.tsx` - Analytics dashboard

---

#### 6. Smart Activity Suggestions (Priority: Low)

**Problem:** No AI-powered suggestions for next best activities.

**Solution:**
- Create `SmartActivitySuggestions` component
- Analyze prospect engagement to suggest optimal follow-up timing
- Recommend activity types based on prospect stage

**Files to create:**
- `src/components/crm/SmartActivitySuggestions.tsx` - AI suggestions widget

---

### Implementation Phases

#### Phase 1: Core Fixes (~2 hours)
1. Replace mock data in `ProspectActivityLog` with real database queries
2. Create `useProspectActivityLog` hook
3. Wire up realtime subscriptions

#### Phase 2: Activity Management (~1.5 hours)
1. Create `ActivityEditDialog` component
2. Implement bulk activity operations
3. Add selection state to FocusView

#### Phase 3: Analytics & Templates (~1 hour)
1. Create activity analytics dashboard
2. Add recurring activity support
3. Implement activity templates

---

### Database Changes Required

```sql
-- Add recurrence support
ALTER TABLE crm_activities 
ADD COLUMN IF NOT EXISTS recurrence_rule text,
ADD COLUMN IF NOT EXISTS recurrence_end_date date,
ADD COLUMN IF NOT EXISTS parent_activity_id uuid REFERENCES crm_activities(id);

-- Create activity templates table
CREATE TABLE IF NOT EXISTS crm_activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  activity_type text NOT NULL,
  subject_template text,
  description_template text,
  default_priority int DEFAULT 0,
  default_duration_minutes int,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_activity_templates ENABLE ROW LEVEL SECURITY;
```

---

### Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `src/hooks/useProspectActivityLog.ts` | Create | P0 |
| `src/components/crm/ProspectActivityLog.tsx` | Modify | P0 |
| `src/components/crm/ActivityEditDialog.tsx` | Create | P1 |
| `src/components/crm/BulkActivityActions.tsx` | Create | P1 |
| `src/pages/crm/FocusView.tsx` | Modify | P1 |
| `src/components/crm/ActivityAnalyticsDashboard.tsx` | Create | P2 |
| `src/components/crm/ActivityQuickAdd.tsx` | Modify | P2 |
| Database migration | Create | P2 |

---

### Estimated Timeline

| Phase | Description | Time |
|-------|-------------|------|
| Phase 1 | Core Fixes - Live activity logging | 2 hours |
| Phase 2 | Activity Management - Edit/Bulk ops | 1.5 hours |
| Phase 3 | Analytics & Templates | 1 hour |
| **Total** | | **4.5 hours** |

---

### Acceptance Criteria

1. ProspectActivityLog displays real activity data from database
2. Activities can be edited via dialog
3. Multiple activities can be bulk completed/reassigned
4. Activity analytics show completion rates and trends
5. Recurring activities can be created
6. All components use realtime subscriptions for live updates
7. Proper RLS policies protect activity data
8. Activity changes are logged to audit trail

---

### Technical Notes

- Use existing `useCRMActivities` hook pattern for consistency
- Leverage existing realtime infrastructure in `CRMRealtimeProvider`
- Follow TQC design system: dark UI, gold accent, generous whitespace
- All new components should support keyboard navigation
- Maintain AA accessibility standards

