# Analytics Architecture Documentation

## System Overview

The analytics system provides comprehensive insights across the platform through a combination of real-time event tracking, daily aggregations, and AI-powered recommendations.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Global Analytics  │  Job Analytics  │  User Engagement  │ ...  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Client  │  Edge Functions  │  Realtime Subscriptions  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  Raw Events  │  Daily Aggregations  │  Cached Insights  │ Cron  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### conversation_analytics_daily

Aggregated daily metrics for messaging and conversation tracking.

```sql
CREATE TABLE conversation_analytics_daily (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  resolution_rate NUMERIC(5,2),
  escalation_rate NUMERIC(5,2),
  satisfaction_score NUMERIC(3,2),
  channel_breakdown JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### security_events

Real-time security event logging for monitoring and alerting.

```sql
CREATE TABLE security_events (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID,
  source_ip INET,
  user_agent TEXT,
  event_data JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ
);
```

### user_engagement_daily

Daily user activity and engagement metrics.

```sql
CREATE TABLE user_engagement_daily (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  returning_users INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  feature_usage JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### career_insights_cache

Cached AI-generated career insights with automatic expiration.

```sql
CREATE TABLE career_insights_cache (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  skill_gap_analysis JSONB,
  market_position JSONB,
  career_trends JSONB,
  next_actions JSONB,
  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Component Hierarchy

```
src/pages/
├── admin/
│   ├── GlobalAnalytics.tsx          # Platform-wide KPIs
│   ├── JobAnalyticsDashboard.tsx    # Per-job analytics
│   ├── ConversationAnalytics.tsx    # Messaging analytics
│   ├── SecurityEventDashboard.tsx   # Security monitoring
│   └── UserEngagementDashboard.tsx  # User activity
└── CareerInsightsDashboard.tsx      # AI career insights
```

## Data Flow

### Real-time Events

```
User Action → Event Logger → security_events → Dashboard
                                    ↓
                          Alert System (severity >= high)
```

### Daily Aggregations

```
Raw Data → pg_cron (3 AM UTC) → Aggregation Function → *_daily tables
                                                            ↓
                                                      Dashboard Query
```

### AI Insights

```
User Request → Edge Function → Lovable AI Gateway → Cache → Dashboard
                                    ↓
                              gemini-2.5-flash
```

## Edge Functions

### generate-career-insights

Generates personalized career recommendations using AI.

**Endpoint:** `/functions/v1/generate-career-insights`

**Request:**
```typescript
{
  userId: string;
}
```

**Response:**
```typescript
{
  skill_gap_analysis: Array<{ skill: string; current: number; required: number }>;
  market_position: { percentile: number; salaryRange: { min: number; max: number }; demandLevel: string };
  career_trends: Array<{ trend: string; impact: 'positive' | 'neutral' | 'negative'; description: string }>;
  next_actions: Array<{ action: string; priority: 'high' | 'medium' | 'low'; reason: string }>;
}
```

## Data Retention

| Table | Retention Period | Cleanup Method |
|-------|------------------|----------------|
| performance_metrics | 90 days | pg_cron daily |
| sla_violations (acknowledged) | 30 days | pg_cron daily |
| career_insights_cache | 7 days (per record) | Expiry check |
| conversation_analytics_daily | 365 days | pg_cron daily |
| user_engagement_daily | 365 days | pg_cron daily |
| security_events | Indefinite | Manual review |

## Logging Standards

All analytics components use the structured logger:

```typescript
import { logger } from '@/lib/logger';

// Debug level for routine operations
logger.debug('Loading analytics data', { componentName: 'GlobalAnalytics', dateRange });

// Info level for significant events
logger.info('Insights generated successfully', { componentName: 'CareerInsights', userId });

// Warn level for recoverable issues
logger.warn('Cache miss, generating fresh data', { componentName: 'CareerInsights' });

// Error level for failures
logger.error('Failed to load metrics', error, { componentName: 'GlobalAnalytics' });
```

## Security Considerations

1. **RLS Policies**: All analytics tables have Row Level Security enabled
2. **Admin Access**: Analytics dashboards require admin role
3. **Candidate Access**: Career insights limited to own data only
4. **Security Events**: Write access restricted to system; read access to admins
5. **IP Logging**: Security events capture source IP for audit trails

## Performance Optimizations

1. **Indexing**: Date columns indexed for time-range queries
2. **Aggregation**: Daily aggregation reduces query complexity
3. **Caching**: 7-day cache for expensive AI operations
4. **Pagination**: Large datasets paginated in dashboards
5. **Lazy Loading**: Charts loaded on demand

## Monitoring

Key metrics to monitor:

- Edge function response times (target: < 3s for AI insights)
- Daily aggregation job completion
- Cache hit rate for career insights
- Security event volume and severity distribution
- Dashboard load times (target: < 2s)
