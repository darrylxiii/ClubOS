

# Email Notification Management System - Admin Dashboard

## Overview

This plan creates a centralized Email Notification Management page for admins to configure who receives which email notifications. The system will allow role-based, user-specific, and event-based notification assignment with full audit logging.

---

## Current State Analysis

### Existing Infrastructure

**Database Tables:**
- `notification_preferences` - Per-user preferences (email_enabled, email_applications, email_messages, etc.)
- `approval_notification_logs` - Logs for approval emails sent
- `email_templates` - Template definitions for emails (3 templates: booking_confirmation, approval_approved, approval_declined)

**Email Edge Functions (32+ functions):**
- `send-notification-email` - Generic notification email sender
- `send-approval-notification` - Member approval emails
- `send-booking-confirmation` - Booking confirmations
- `send-booking-reminder-email` - Booking reminders
- `send-meeting-invitation-email` - Meeting invites
- `send-meeting-summary-email` - Meeting summaries
- `send-application-submitted-email` - Application confirmations
- `send-password-reset-email` - Password resets
- `send-security-alert` - Security notifications
- Plus 20+ more specialized email functions

**User Roles:**
- `admin` (11 users)
- `partner` (27 users)
- `strategist` (1 user)
- `user` (81 users)

### Current Gaps

1. **No centralized notification management** - Notifications are hardcoded per function
2. **No role-based notification routing** - Can't say "all strategists get X notification"
3. **No admin visibility** - Admins can't see who gets what or override defaults
4. **Limited audit trail** - Only approval_notification_logs exists
5. **No notification type registry** - Email types are scattered across 30+ functions

---

## Solution Architecture

### New Database Tables

**1. `email_notification_types`** - Registry of all notification types

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | text | Unique key (e.g., "booking_reminder", "application_status") |
| name | text | Display name |
| description | text | What this notification is for |
| category | text | Category (bookings, applications, system, security, meetings) |
| default_enabled | boolean | Default on/off for new users |
| allow_user_override | boolean | Can users disable this? |
| priority | text | low, normal, high, critical |
| edge_function | text | Edge function that sends this |
| is_active | boolean | Is this notification type active? |
| created_at | timestamptz | Created timestamp |

**2. `email_notification_assignments`** - Who gets what notifications

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| notification_type_id | uuid | FK to email_notification_types |
| assignment_type | text | 'role', 'user', 'all' |
| role | text | Role if assignment_type='role' |
| user_id | uuid | User ID if assignment_type='user' |
| is_enabled | boolean | Enable/disable this assignment |
| channel | text | 'email', 'push', 'both' |
| assigned_by | uuid | Admin who made assignment |
| created_at | timestamptz | Created timestamp |

**3. `email_notification_audit_log`** - Comprehensive audit trail

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| action | text | 'assigned', 'unassigned', 'enabled', 'disabled', 'sent' |
| notification_type_id | uuid | FK to notification type |
| target_user_id | uuid | User affected |
| performed_by | uuid | Admin who performed action |
| details | jsonb | Additional context |
| created_at | timestamptz | Timestamp |

---

### Visual Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    EMAIL NOTIFICATION MANAGEMENT                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  NOTIFICATION   │  │   RECIPIENTS    │  │     AUDIT       │          │
│  │    TYPES        │  │   MANAGEMENT    │  │      LOG        │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
│  Tab 1: Browse/manage           Tab 2: Assign by role     Tab 3: View   │
│  all notification types         or individual user         all events   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  NOTIFICATION TYPES                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  📋 Application Submitted                          [Active ✓]     │ │
│  │  Category: Applications  |  Function: send-application-submitted  │ │
│  │  Recipients: All users (default)                                  │ │
│  │                                       [Edit] [Assign Recipients]  │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │  🔔 Booking Reminder                               [Active ✓]     │ │
│  │  Category: Bookings  |  Function: send-booking-reminder-email     │ │
│  │  Recipients: All users + Partners (additional)                    │ │
│  │                                       [Edit] [Assign Recipients]  │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │  🔒 Security Alert                                 [Active ✓]     │ │
│  │  Category: Security  |  Function: send-security-alert             │ │
│  │  Recipients: Admins only                                          │ │
│  │                                       [Edit] [Assign Recipients]  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Page Components

### 1. Main Page: `EmailNotificationManagement.tsx`

**Features:**
- Three-tab layout: Notification Types | Recipients | Audit Log
- Overview statistics (total types, active assignments, emails sent today)
- Search and filter by category

### 2. Notification Types Tab

**Features:**
- List all registered notification types
- Show recipient count per type
- Toggle active/inactive status
- Quick-assign to roles
- Link to edge function documentation

### 3. Recipients Tab

**Features:**
- View by Role or by User
- Role-based bulk assignment (e.g., "All partners get X, Y, Z")
- Individual user assignment with override
- Channel selection (email/push/both)
- Preview notification for user

### 4. Audit Log Tab

**Features:**
- Filterable timeline of all actions
- Who assigned what to whom, when
- Email send history with status
- Export capability

---

## UI Components to Create

| Component | Purpose |
|-----------|---------|
| `EmailNotificationManagement.tsx` | Main page container |
| `NotificationTypeCard.tsx` | Card for each notification type |
| `NotificationTypeDialog.tsx` | Edit notification type details |
| `RecipientAssignmentPanel.tsx` | Manage role/user assignments |
| `RoleAssignmentCard.tsx` | Quick-assign by role |
| `UserAssignmentDialog.tsx` | Individual user assignment |
| `NotificationAuditLog.tsx` | Audit log viewer |
| `NotificationStatsCards.tsx` | Overview statistics |

---

## Implementation Steps

### Phase 1: Database Setup

1. Create `email_notification_types` table
2. Create `email_notification_assignments` table
3. Create `email_notification_audit_log` table
4. Add RLS policies (admin-only management, users can read their own)
5. Seed initial notification types from existing edge functions

### Phase 2: Admin UI

1. Create main page with tabs
2. Build notification types list with cards
3. Build role-based assignment panel
4. Build user-specific assignment dialog
5. Build audit log viewer
6. Add to admin routes

### Phase 3: Integration

1. Create `check-notification-recipient` edge function
2. Update existing email edge functions to check assignments
3. Add logging to `email_notification_audit_log`

---

## Technical Details

### Notification Type Categories

```typescript
const NOTIFICATION_CATEGORIES = [
  { key: 'applications', label: 'Applications', icon: FileText },
  { key: 'bookings', label: 'Bookings & Meetings', icon: Calendar },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'system', label: 'System', icon: Settings },
  { key: 'communications', label: 'Communications', icon: MessageSquare },
  { key: 'approvals', label: 'Approvals', icon: CheckCircle },
];
```

### Default Notification Types to Seed

```typescript
const DEFAULT_NOTIFICATION_TYPES = [
  // Applications
  { key: 'application_submitted', name: 'Application Submitted', category: 'applications', edge_function: 'send-application-submitted-email' },
  { key: 'application_status_change', name: 'Application Status Changed', category: 'applications', edge_function: 'send-notification-email' },
  
  // Bookings
  { key: 'booking_confirmation', name: 'Booking Confirmation', category: 'bookings', edge_function: 'send-booking-confirmation' },
  { key: 'booking_reminder', name: 'Booking Reminder', category: 'bookings', edge_function: 'send-booking-reminder-email' },
  { key: 'booking_cancelled', name: 'Booking Cancelled', category: 'bookings', edge_function: 'send-booking-confirmation' },
  
  // Meetings
  { key: 'meeting_invitation', name: 'Meeting Invitation', category: 'bookings', edge_function: 'send-meeting-invitation-email' },
  { key: 'meeting_summary', name: 'Meeting Summary', category: 'bookings', edge_function: 'send-meeting-summary-email' },
  
  // Security
  { key: 'security_alert', name: 'Security Alert', category: 'security', edge_function: 'send-security-alert', priority: 'critical' },
  { key: 'password_reset', name: 'Password Reset', category: 'security', edge_function: 'send-password-reset-email' },
  { key: 'password_changed', name: 'Password Changed', category: 'security', edge_function: 'send-password-changed-email' },
  
  // Approvals
  { key: 'member_approved', name: 'Member Approved', category: 'approvals', edge_function: 'send-approval-notification' },
  { key: 'member_declined', name: 'Member Declined', category: 'approvals', edge_function: 'send-approval-notification' },
  
  // System
  { key: 'system_notification', name: 'System Notification', category: 'system', edge_function: 'send-notification-email' },
  { key: 'weekly_digest', name: 'Weekly Digest', category: 'system', edge_function: 'send-notification-email' },
];
```

### Role-Based Default Assignments

| Notification Type | Admin | Strategist | Partner | User |
|-------------------|-------|------------|---------|------|
| Security Alert | ✓ | ✓ | ✗ | ✗ |
| Member Approved | ✓ | ✓ | ✓ | ✓ |
| Booking Confirmation | ✓ | ✓ | ✓ | ✓ |
| Meeting Summary | ✓ | ✓ | ✓ | ✗ |
| Weekly Digest | ✓ | ✓ | ✓ | ✓ |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/admin/EmailNotificationManagement.tsx` | Main admin page |
| `src/components/admin/notifications/NotificationTypesList.tsx` | List of notification types |
| `src/components/admin/notifications/NotificationTypeCard.tsx` | Individual type card |
| `src/components/admin/notifications/RecipientAssignmentDialog.tsx` | Assignment dialog |
| `src/components/admin/notifications/RoleAssignmentPanel.tsx` | Role-based assignment |
| `src/components/admin/notifications/NotificationAuditLog.tsx` | Audit log viewer |
| `src/components/admin/notifications/NotificationStatsCards.tsx` | Stats overview |
| `src/hooks/useNotificationTypes.ts` | Data fetching hook |
| `src/hooks/useNotificationAssignments.ts` | Assignment management hook |
| `supabase/functions/check-notification-recipient/index.ts` | Recipient check function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/routes/admin.routes.tsx` | Add route for `/admin/email-notifications` |
| `supabase/functions/send-notification-email/index.ts` | Integrate assignment check |

---

## Expected Outcome

After implementation, admins will be able to:

1. **View all notification types** - See every email the system can send
2. **Assign by role** - "All partners receive booking confirmations"
3. **Assign by user** - "John specifically gets security alerts"
4. **Override defaults** - Turn off notifications for specific users/roles
5. **Audit everything** - Full history of who changed what and when
6. **Monitor delivery** - See email send status and failures

This creates a robust, enterprise-grade notification management system with full GDPR compliance through the audit trail.

