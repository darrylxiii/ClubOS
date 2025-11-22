# API Documentation

## Edge Functions

### Authentication Functions

#### `validate-invite-code`
Validates an invite code for new user registration.

**Request:**
```json
{
  "code": "string"
}
```

**Response:**
```json
{
  "valid": boolean,
  "message": "string",
  "referrerName": "string"
}
```

#### `verify-email-code`
Verifies a 6-digit email verification code.

**Request:**
```json
{
  "email": "string",
  "code": "string"
}
```

**Response:**
```json
{
  "success": boolean,
  "error": "string"
}
```

### System Health Functions

#### `get_realtime_system_health()`
Returns real-time system health metrics.

**Response:**
```json
{
  "platform_status": "online|degraded|offline",
  "active_users_1h": number,
  "total_errors_1h": number,
  "critical_errors_1h": number,
  "avg_response_time_ms": number,
  "db_connections": number
}
```

#### `get_edge_function_health()`
Returns health metrics for all edge functions.

**Response:**
```json
[
  {
    "function_name": "string",
    "total_calls": number,
    "success_count": number,
    "error_count": number,
    "success_rate": number,
    "avg_duration_ms": number
  }
]
```

## Rate Limits

All API endpoints are rate-limited to prevent abuse:
- Authentication endpoints: 10 requests per minute
- Data endpoints: 100 requests per minute
- Search endpoints: 50 requests per minute

## Authentication

All API requests (except public endpoints) require authentication via JWT token:

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  },
  body: {}
});
```

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "string",
  "message": "string",
  "statusCode": number
}
```

Common error codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side error
