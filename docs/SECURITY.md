# Security Documentation

## Overview
This document outlines the security measures, policies, and best practices implemented in The Quantum Club platform.

## Authentication & Authorization

### Multi-Factor Authentication (MFA)
- **Implementation**: TOTP-based (Time-based One-Time Password)
- **Setup Flow**: 
  1. User navigates to Settings → Security
  2. Scans QR code with authenticator app
  3. Enters verification code
  4. Downloads recovery codes
- **Enforcement**: Admins can require MFA for all users
- **Recovery**: 10 single-use recovery codes provided

### OAuth Providers
- **Google OAuth**: Fully integrated
- **Apple Sign-in**: Configured with Apple Developer account
- **LinkedIn OAuth**: Available for professional networking
- **Security**: All OAuth flows use PKCE (Proof Key for Code Exchange)

### Password Security
- **Minimum Requirements**:
  - 8+ characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Storage**: Passwords hashed with bcrypt
- **Reset Flow**: Time-limited OTP via email (valid 15 minutes)

## Row Level Security (RLS)

### Critical Tables with RLS
All sensitive tables have RLS policies enforced:

```sql
-- Example: profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### RLS Coverage
- ✅ profiles: User can only access their own profile
- ✅ candidate_profiles: Candidates see own data, strategists see assigned
- ✅ jobs: Public view, company-restricted edit
- ✅ applications: Candidate + assigned strategist access
- ✅ social_posts: Author + connections based on privacy settings
- ✅ messages: Sender + recipient only
- ✅ blocked_domains: User-specific employer protection

### Sensitive Data Protection
**PII Fields with Extra Protection:**
- Current employer (blocked_domains)
- Salary expectations (visibility toggle)
- Phone numbers (visibility toggle)
- Resume/CV documents (signed URLs only)

## API Security

### Edge Function Authentication
All edge functions require authentication by default:
```typescript
// supabase/config.toml
[functions.my-function]
verify_jwt = true  # Default: requires auth token
```

**Public Endpoints:**
Only explicitly whitelisted functions allow unauthenticated access:
```toml
[functions.public-job-listings]
verify_jwt = false
```

### Rate Limiting
- **API Keys**: 1000 requests/hour per key
- **Edge Functions**: 100 requests/minute per user
- **OAuth**: 10 attempts/hour per IP
- **Password Reset**: 5 attempts/hour per email

### CORS Policy
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Data Privacy

### GDPR Compliance
- **Right to Access**: Users can export all their data
- **Right to Erasure**: Users can delete their account + all data
- **Right to Portability**: Data exported in JSON format
- **Consent Management**: Granular privacy settings

### Data Retention
- **Active Users**: Data retained indefinitely
- **Inactive Users**: Profile archived after 18 months
- **Deleted Accounts**: 30-day soft delete, then permanent deletion
- **Audit Logs**: Retained for 90 days
- **Error Logs**: Retained for 30 days

### Employer Shield
**Purpose**: Prevent current employer from seeing candidate profile
**Implementation**:
```sql
-- Block by domain
INSERT INTO blocked_domains (user_id, domain, company_name)
VALUES (auth.uid(), 'currentcompany.com', 'Current Company Inc');

-- RLS policy prevents exposure
CREATE POLICY "Hide from blocked domains"
  ON candidate_profiles FOR SELECT
  USING (NOT EXISTS (
    SELECT 1 FROM blocked_domains bd
    WHERE bd.user_id = candidate_profiles.user_id
    AND current_user_email LIKE '%' || bd.domain
  ));
```

## File Storage Security

### Storage Buckets
- **avatars**: Public read, authenticated write (own files only)
- **resumes**: Private, signed URLs only, 1-hour expiry
- **documents**: Private, RLS-protected
- **company-logos**: Public read, company admin write

### File Upload Restrictions
- **Max Size**: 5MB per file
- **Allowed Types**:
  - Images: jpg, png, gif, webp
  - Documents: pdf, docx, txt
- **Virus Scanning**: All uploads scanned before storage
- **Signed URLs**: All private files use time-limited signed URLs

```typescript
const { data: signedUrl } = await supabase.storage
  .from('resumes')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

## Audit Logging

### Events Logged
- Authentication events (login, logout, failed attempts)
- Profile changes (email, phone, password)
- Application submissions
- Dossier sharing
- Admin actions (user role changes, system config)
- Data exports/deletions

### Audit Table Structure
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Audit Retention
- Security events: 1 year
- User actions: 90 days
- System events: 30 days

## Security Monitoring

### Real-time Alerts
Alerts triggered for:
- ✅ 5+ failed login attempts from same IP
- ✅ 10+ critical errors in 1 hour
- ✅ Unusual data access patterns
- ✅ Unauthorized API access attempts
- ✅ Storage quota exceeded

### Alert Channels
1. **Dashboard**: System Health page
2. **Email**: Security team notified immediately
3. **Slack**: Critical alerts posted to #security channel

## Penetration Testing

### Testing Schedule
- **Full Audit**: Quarterly
- **Targeted Tests**: After major features
- **Continuous**: Automated security scanning

### Common Attack Vectors Tested
1. **SQL Injection**: All database queries use parameterized queries
2. **XSS**: React automatically escapes output
3. **CSRF**: SameSite cookies, CSRF tokens on forms
4. **Authentication Bypass**: Tested all protected routes
5. **Data Exposure**: Verified RLS policies on all tables

### Security Checklist
- [ ] All database tables have RLS enabled
- [ ] All edge functions verify JWT (unless explicitly public)
- [ ] All file uploads validated and scanned
- [ ] All passwords hashed with bcrypt
- [ ] All API keys rotated quarterly
- [ ] All OAuth credentials secured
- [ ] All sensitive data encrypted at rest
- [ ] All error messages sanitized (no stack traces in production)

## Incident Response

### Response Plan
1. **Detection**: Automated monitoring + manual reports
2. **Containment**: 
   - Revoke compromised API keys
   - Block malicious IPs
   - Disable affected user accounts
3. **Investigation**: Review audit logs
4. **Remediation**: Patch vulnerabilities
5. **Communication**: Notify affected users within 72 hours
6. **Post-mortem**: Document lessons learned

### Contact
- **Security Team**: security@thequantumclub.com
- **Emergency**: security-emergency@thequantumclub.com (24/7)

## Best Practices for Developers

### Secure Coding Guidelines
1. **Never** log sensitive data (passwords, tokens, PII)
2. **Always** use parameterized queries
3. **Always** validate user input
4. **Never** trust client-side data
5. **Always** use HTTPS
6. **Always** implement rate limiting
7. **Always** sanitize error messages
8. **Never** expose stack traces to users

### Code Review Checklist
- [ ] No hardcoded secrets or credentials
- [ ] All database queries use RLS
- [ ] All user input validated
- [ ] All file uploads restricted by type/size
- [ ] All sensitive data encrypted
- [ ] All errors logged (not exposed)
- [ ] All API endpoints authenticated (unless explicitly public)

---

**Last Updated**: 2024-11-22
**Version**: 1.0
**Maintained By**: Security Team
