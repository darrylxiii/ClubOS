# Database Schema Documentation

## Core Tables

### `profiles`
User profile information.

**Columns:**
- `id` (uuid, PK): User ID (references auth.users)
- `email` (text): User email
- `full_name` (text): User's full name
- `avatar_url` (text): Profile image URL
- `company_id` (uuid, FK): Associated company
- `onboarding_completed_at` (timestamp): Onboarding completion time
- `created_at` (timestamp): Account creation time
- `updated_at` (timestamp): Last update time

**RLS Policies:**
- Users can read their own profile
- Users can update their own profile
- Public profiles viewable by authenticated users

### `user_roles`
User role assignments.

**Columns:**
- `id` (uuid, PK): Role assignment ID
- `user_id` (uuid, FK): User ID
- `role` (app_role): Role type (candidate, partner, admin, strategist)
- `assigned_at` (timestamp): Role assignment time
- `assigned_by` (uuid, FK): Who assigned the role

**RLS Policies:**
- Users can read their own roles
- Admins can manage all roles

### `error_logs`
Application error tracking.

**Columns:**
- `id` (uuid, PK): Log entry ID
- `user_id` (uuid, FK): User who encountered error
- `severity` (text): Error severity (info, warning, error, critical)
- `error_message` (text): Error message
- `stack_trace` (text): Error stack trace
- `component_name` (text): Component where error occurred
- `context` (jsonb): Additional context
- `created_at` (timestamp): Error timestamp

**RLS Policies:**
- Admins only

### `performance_metrics`
Performance monitoring data.

**Columns:**
- `id` (uuid, PK): Metric ID
- `user_id` (uuid, FK): User ID
- `metric_name` (text): Metric name
- `metric_value` (numeric): Metric value
- `context` (jsonb): Additional context
- `created_at` (timestamp): Metric timestamp

**RLS Policies:**
- Admins only

## Database Functions

### System Health

#### `get_realtime_system_health()`
Returns real-time system health metrics including active users, errors, and database connections.

**Returns:** JSON object with health metrics

#### `get_edge_function_health()`
Returns performance metrics for all edge functions.

**Returns:** Table with function name, call counts, success rates, and duration

#### `check_error_threshold()`
Checks if critical errors exceed threshold and creates alerts.

**Triggers:** Automatically via scheduled job

### Activity Tracking

#### `update_user_activity_tracking()`
Updates user activity metrics including login tracking and session duration.

**Parameters:**
- `p_user_id` (uuid): User ID
- `p_action_type` (text): Type of action
- `p_increment_actions` (boolean): Whether to increment action count
- `p_session_id` (text): Session identifier
- `p_is_login` (boolean): Is this a login event
- `p_is_logout` (boolean): Is this a logout event
- `p_session_duration_minutes` (integer): Session duration

## Indexes

Key indexes for performance:
- `idx_profiles_email` on `profiles(email)`
- `idx_user_roles_user_id` on `user_roles(user_id)`
- `idx_error_logs_severity_created_at` on `error_logs(severity, created_at)`
- `idx_error_logs_user_id` on `error_logs(user_id)`
- `idx_performance_metrics_metric_name` on `performance_metrics(metric_name)`

## Backup & Recovery

- Automated daily backups at 2 AM UTC
- Point-in-time recovery enabled (7 days retention)
- Cross-region replication enabled
- Manual backup procedure documented in [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)

## Migration Guidelines

1. Always create migrations via Supabase CLI or migration tool
2. Test migrations in development environment first
3. Include rollback SQL in migration comments
4. Document schema changes in this file
5. Update TypeScript types after migrations
