# Performance Monitoring Guide

## Overview

This guide covers the performance monitoring infrastructure implemented in Phase 4, including metric collection, SLA thresholds, and the admin dashboard.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────────┐ │
│  │ Core Web    │  │ Custom Timings │  │ API Response Times   │ │
│  │ Vitals      │  │                │  │                      │ │
│  └──────┬──────┘  └───────┬────────┘  └──────────┬───────────┘ │
│         │                 │                       │             │
│         └─────────────────┼───────────────────────┘             │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              performanceMonitorService.ts                  │ │
│  │  - queueMetric()     - Buffers up to 10 metrics           │ │
│  │  - flushMetrics()    - Batch uploads every 5s             │ │
│  │  - checkForViolation()  - Real-time SLA checking          │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                  │
│  ┌────────────────────┐  ┌─────────────────────────────────────┐│
│  │ performance_metrics │  │ sla_violations                     ││
│  │ - metric_type      │  │ - metric_type                      ││
│  │ - value            │  │ - threshold_value                  ││
│  │ - unit             │  │ - actual_value                     ││
│  │ - page_path        │  │ - severity (warning/critical)      ││
│  │ - user_agent       │  │ - detected_at                      ││
│  │ - connection_type  │  │ - acknowledged_at                  ││
│  │ - recorded_at      │  │                                    ││
│  └────────────────────┘  └─────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

### Performance Thresholds

Thresholds are defined in `src/utils/performanceBaselines.ts`:

```typescript
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, warning: 4000, critical: 6000, unit: 'ms' },
  FID: { good: 100, warning: 300, critical: 500, unit: 'ms' },
  CLS: { good: 0.1, warning: 0.25, critical: 0.5, unit: 'score' },
  TTFB: { good: 200, warning: 500, critical: 1000, unit: 'ms' },
  INP: { good: 200, warning: 500, critical: 1000, unit: 'ms' },
  API_RESPONSE: { good: 500, warning: 2000, critical: 5000, unit: 'ms' },
  PAGE_LOAD: { good: 3000, warning: 5000, critical: 10000, unit: 'ms' },
  ERROR_RATE: { good: 0.01, warning: 0.05, critical: 0.1, unit: '%' },
};
```

### Alignment with Google Core Web Vitals

| Metric | Good (Green) | Needs Improvement (Yellow) | Poor (Red) |
|--------|--------------|---------------------------|------------|
| LCP    | ≤ 2.5s       | ≤ 4.0s                    | > 4.0s     |
| FID    | ≤ 100ms      | ≤ 300ms                   | > 300ms    |
| CLS    | ≤ 0.1        | ≤ 0.25                    | > 0.25     |

## Usage

### Tracking Core Web Vitals

```typescript
import { trackCoreWebVital } from '@/services/performanceMonitorService';

// Track LCP
trackCoreWebVital('LCP', 2100);

// Track CLS
trackCoreWebVital('CLS', 0.05);

// Track TTFB
trackCoreWebVital('TTFB', 180);
```

### Tracking Custom Timings

```typescript
import { trackTiming, measureAsync } from '@/services/performanceMonitorService';

// Manual timing
const start = performance.now();
await someOperation();
trackTiming('custom_operation', performance.now() - start, { operation: 'data_fetch' });

// Automatic timing with measureAsync
const result = await measureAsync('api_call', async () => {
  return await fetch('/api/data').then(r => r.json());
}, { endpoint: '/api/data' });
```

### Automatic Metric Flushing

Metrics are automatically flushed:
1. When the buffer reaches 10 metrics
2. Every 5 seconds if there are pending metrics
3. Before page unload
4. When the page becomes hidden (mobile background)

## Admin Dashboard

Access the Performance Dashboard at `/admin/performance` (admin role required).

### Features

1. **Summary Cards**
   - Total metrics collected
   - Warning count
   - Critical violations
   - SLA compliance percentage

2. **Core Web Vitals Trend Chart**
   - Time-series visualization of LCP, FID, CLS, TTFB
   - Configurable time ranges (1h, 24h, 7d)

3. **Metric Details Table**
   - Average, P95, Min, Max values
   - Sample count
   - Status badge (Good/Warning/Critical)

## Database Schema

### performance_metrics

```sql
CREATE TABLE public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ms',
  page_path TEXT,
  user_agent TEXT,
  connection_type TEXT,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### sla_violations

```sql
CREATE TABLE public.sla_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  page_path TEXT,
  user_agent TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## RLS Policies

| Operation | performance_metrics | sla_violations |
|-----------|---------------------|----------------|
| INSERT    | anon, authenticated | anon, authenticated |
| SELECT    | admin only          | admin only |
| UPDATE    | -                   | admin only (acknowledge) |
| DELETE    | -                   | - |

## Best Practices

### 1. Metric Collection

- Use `trackCoreWebVital()` for standard web vitals
- Use `trackTiming()` for custom operations
- Use `measureAsync()` for async operations (auto-captures success/failure)

### 2. Threshold Tuning

Start with Google's recommended thresholds and adjust based on:
- Your user base (connection speeds, devices)
- Application complexity
- Business requirements

### 3. Monitoring

- Set up alerts for critical violations
- Review weekly trends
- Investigate P95 regressions

### 4. Data Retention

Implement cleanup for old metrics:

```sql
-- Delete metrics older than 90 days
DELETE FROM performance_metrics 
WHERE recorded_at < NOW() - INTERVAL '90 days';

-- Keep last 30 days of violations
DELETE FROM sla_violations 
WHERE detected_at < NOW() - INTERVAL '30 days'
AND acknowledged_at IS NOT NULL;
```

## Troubleshooting

### Metrics Not Appearing

1. Check browser console for errors
2. Verify RLS policies allow insert
3. Check network tab for failed Supabase requests

### High Violation Count

1. Check network conditions (slow 3G users)
2. Review recent deployments for regressions
3. Analyze by page_path to find problematic pages

### Dashboard Not Loading

1. Verify admin role assignment
2. Check browser console for auth errors
3. Verify database tables exist
