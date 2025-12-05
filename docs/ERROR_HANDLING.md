# Error Handling Guide

## Overview

This document outlines the error handling patterns, utilities, and best practices for The Quantum Club platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Error Capture Layer                         │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Global Handlers │ Error Boundaries │ Component-Level Handlers   │
│ (window.onerror)│ (React)         │ (try/catch, useErrorLogger)│
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Error Processing Layer                        │
├─────────────────────────────────────────────────────────────────┤
│ • Fingerprinting (deduplication)                                │
│ • Context enrichment (userId, sessionId, pageUrl)               │
│ • Severity classification                                        │
│ • Rate monitoring                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Error Storage Layer                           │
├─────────────────────────────────────────────────────────────────┤
│ • Database logging (error_logs table)                           │
│ • Batched writes for performance                                 │
│ • Console output for development                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Error Alerting Layer                          │
├─────────────────────────────────────────────────────────────────┤
│ • Critical error notifications                                   │
│ • Spike detection alerts                                         │
│ • Admin dashboard visibility                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Utilities Reference

### 1. useErrorLogger Hook

Use this hook in React components for consistent error logging with automatic context.

```typescript
import { useErrorLogger } from '@/hooks/useErrorLogger';

function MyComponent() {
  const { logError, logApiError, logCritical } = useErrorLogger({
    componentName: 'MyComponent',
  });

  const fetchData = async () => {
    try {
      await api.getData();
    } catch (error) {
      logApiError('Failed to fetch data', error, { endpoint: '/api/data' });
    }
  };
}
```

**Available methods:**
- `logError(message, error?, context?)` - General errors
- `logWarning(message, context?)` - Non-critical issues
- `logCritical(message, error?, context?)` - Requires immediate attention
- `logApiError(message, error?, context?)` - API/edge function errors
- `logDatabaseError(message, error?, context?)` - Database errors
- `logNetworkError(message, error?, context?)` - Network errors

### 2. Standalone Error Logger

For non-React code (services, utilities):

```typescript
import { standaloneErrorLogger } from '@/hooks/useErrorLogger';

standaloneErrorLogger.error('Service failed', error, {
  componentName: 'AuthService',
  errorType: 'api',
});
```

### 3. Supabase Error Mapper

Transform database errors into user-friendly messages:

```typescript
import { mapSupabaseError, handleSupabaseError } from '@/utils/supabaseErrorMapper';

// Get user-friendly message
const { data, error } = await supabase.from('users').insert(userData);
if (error) {
  const userMessage = mapSupabaseError(error);
  toast.error(userMessage);
}

// Automatic handling with retry
const result = await handleSupabaseError(
  () => supabase.from('users').insert(userData),
  {
    maxRetries: 3,
    onRetry: (attempt) => console.log(`Retry ${attempt}`),
    shouldRetry: (error) => error.code !== '23505', // Don't retry duplicates
  }
);
```

### 4. Error Boundaries

Wrap critical sections with specialized boundaries:

```tsx
import { MeetingErrorBoundary } from '@/components/ui/MeetingErrorBoundary';
import { PaymentErrorBoundary } from '@/components/ui/PaymentErrorBoundary';
import { UploadErrorBoundary } from '@/components/ui/UploadErrorBoundary';

// Video calls
<MeetingErrorBoundary meetingId={id}>
  <VideoConference />
</MeetingErrorBoundary>

// Payment flows
<PaymentErrorBoundary>
  <CheckoutForm />
</PaymentErrorBoundary>

// File uploads
<UploadErrorBoundary>
  <FileUploader />
</UploadErrorBoundary>
```

### 5. Network Error Recovery

Handle offline states and retry logic:

```tsx
import { NetworkErrorRecovery, useNetworkRecovery } from '@/components/ui/NetworkErrorRecovery';

function DataFetcher() {
  const [error, setError] = useState(null);
  const { isOnline } = useNetworkRecovery();

  const retry = async () => {
    try {
      await fetchData();
      setError(null);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <NetworkErrorRecovery 
      error={error} 
      onRetry={retry}
      showOfflineBanner 
    />
  );
}
```

## Error Severity Guidelines

| Severity | When to Use | Example |
|----------|-------------|---------|
| **Critical** | System down, data loss risk, security breach | Auth system failure, payment processing error |
| **Error** | Feature broken, user blocked | Form submission failed, API timeout |
| **Warning** | Degraded experience, potential issue | Slow load time, deprecated API usage |
| **Info** | Tracked events, debugging | User action logged, feature flag state |

## Error Context Requirements

Always include relevant context for debugging:

```typescript
logError('Failed to update profile', error, {
  userId: user.id,           // WHO
  action: 'profile_update',  // WHAT
  field: 'avatar',           // WHERE
  previousValue: oldAvatar,  // CONTEXT
  attemptedValue: newAvatar, // CONTEXT
});
```

### Required Context by Error Type:

| Error Type | Required Context |
|------------|------------------|
| **API** | endpoint, method, statusCode, requestId |
| **Database** | table, operation, query (sanitized) |
| **Auth** | authProvider, attemptType |
| **WebRTC** | participantCount, connectionState |
| **Payment** | customerId, amount, currency |

## Error Resolution Workflow

1. **Detection**: Error captured via global handlers, boundaries, or try/catch
2. **Logging**: Persisted to `error_logs` table with full context
3. **Alerting**: Critical errors trigger immediate notification
4. **Investigation**: View in Admin Dashboard → System → Error Analytics
5. **Resolution**: Mark as resolved with notes
6. **Verification**: Monitor for recurrence

## Database Schema

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(20) NOT NULL,              -- 'info', 'warning', 'error', 'critical'
  error_type VARCHAR(50),                     -- 'react', 'api', 'database', 'network', etc.
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  component_name VARCHAR(100),
  user_id UUID REFERENCES auth.users,
  context JSONB,                              -- Additional context
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  fingerprint VARCHAR(50),                    -- For deduplication
  occurrence_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Best Practices

### DO ✅

```typescript
// Use structured logging
logApiError('Failed to fetch user', error, {
  userId,
  endpoint: '/api/users',
  statusCode: error.status,
});

// Use error boundaries for UI isolation
<MeetingErrorBoundary>
  <VideoCall />
</MeetingErrorBoundary>

// Handle errors at appropriate level
const { data, error } = await supabase.from('users').select();
if (error) {
  logDatabaseError('User fetch failed', error);
  return <ErrorState message="Could not load users" />;
}
```

### DON'T ❌

```typescript
// Empty catch blocks
try { await riskyOperation(); } catch {} // 🚫

// Console.error without logging
console.error('Something failed'); // 🚫

// Generic error messages
toast.error('An error occurred'); // 🚫

// Swallowing errors silently
.catch(() => {}); // 🚫
```

## Monitoring & Analytics

Access error analytics at:
- **Admin Dashboard**: `/admin/system` → Error Analytics
- **Real-time**: Error rate monitoring with spike detection
- **Trends**: 7-day error trends by severity
- **Components**: Top error-producing components
- **Resolution**: Resolution rate and average time

## Edge Function Error Handling

```typescript
// Use standardized responses
import { createErrorResponse, CommonErrors } from '../_shared/error-responses.ts';

if (!userId) {
  return CommonErrors.unauthorized();
}

try {
  // ... operation
} catch (error) {
  return createErrorResponse('Operation failed', 500, { 
    code: 'OPERATION_FAILED',
    details: error.message 
  });
}
```

## Emergency Procedures

### Critical Error Spike

1. Check Admin Dashboard for error patterns
2. Review recent deployments
3. Check external service status (Supabase, Stripe, etc.)
4. Roll back if deployment-related
5. Enable maintenance mode if needed

### Data Corruption Risk

1. Immediately halt affected operations
2. Document the error state
3. Check database consistency
4. Restore from backup if needed
5. Post-mortem analysis

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial documentation |
| 1.1 | 2024-02-01 | Added error fingerprinting |
| 1.2 | 2024-02-15 | Added performance monitoring |
