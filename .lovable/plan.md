

# Elite Partner Provisioning System: 0.0001% Concierge Onboarding

## Executive Summary

This plan transforms partner account creation from a fragmented, amateur process into a white-glove concierge experience befitting The Quantum Club's ultra-luxury positioning. Admins will provision fully-verified partner accounts with pre-confirmed contact information, seamless Google OAuth linking, and intelligent domain-based organization management.

---

## Current State Problems

| Issue | Impact |
|-------|--------|
| Partners must self-signup as regular members | Destroys exclusivity perception |
| Manual role reassignment after signup | Amateurish workflow |
| No pre-verification of contact details | Partners don't trust their info is validated |
| No domain-based organization management | Can't auto-assign @company.com employees |
| Google OAuth not pre-linkable | Partners can't use SSO on first login |
| No concierge invite system | Partners feel like they're applying, not being courted |

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN PARTNER PROVISIONING                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │ Partner Modal   │───▶│ provision-partner │                   │
│  │ (Admin UI)      │    │ Edge Function     │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│         ┌────────────────────────┼────────────────────────┐     │
│         ▼                        ▼                        ▼     │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────┐│
│  │ Create Auth  │    │ Pre-verify Email │    │ Setup Company  ││
│  │ User Account │    │ & Phone          │    │ Domain SSO     ││
│  └──────────────┘    └──────────────────┘    └────────────────┘│
│         │                        │                        │     │
│         ▼                        ▼                        ▼     │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────┐│
│  │ Assign Role  │    │ Generate Magic   │    │ Send Welcome   ││
│  │ + Company    │    │ Link / Password  │    │ Email          ││
│  └──────────────┘    └──────────────────┘    └────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Partner Provisioning Modal (Admin UI)

### Create `src/components/admin/PartnerProvisioningModal.tsx`

A comprehensive modal with:

**Contact Information Section**
- Full Name (required)
- Email Address (required) - with domain extraction
- Phone Number (optional) - with international format
- Pre-verify toggles: "Mark email as verified" / "Mark phone as verified"

**Company Configuration Section**
- Company Name (auto-suggest from existing or create new)
- Company Domain (e.g., `acme.com`)
- Industry selector
- Company size selector
- Company role: Owner / Admin / Recruiter

**Authentication Options Section**
- Access Method radio group:
  - "Send Magic Link" (default, one-click login)
  - "Set Temporary Password" (manual entry)
  - "Allow Google OAuth Only" (for G Suite companies)
- Auto-create invite code toggle
- Welcome message customization

**Domain Management Section**
- Enable auto-provisioning for `@domain.com`
- Default role for domain members
- Require admin approval toggle

**Design**: Dark luxury UI with gold accent, multi-step wizard with progress indicator

---

## Phase 2: Edge Function - `provision-partner`

### Create `supabase/functions/provision-partner/index.ts`

**Capabilities:**
1. Create auth user with `auth.admin.createUser()`
2. Pre-confirm email and phone in profiles table
3. Assign partner role in `user_roles`
4. Create/link company in `companies` table
5. Add to `company_members` with specified role
6. Configure domain SSO in `company_sso_config`
7. Generate magic link OR set password
8. Send branded welcome email via Resend
9. Create audit log entry

**Security:**
- Requires admin role verification
- Rate limiting (10 provisions per hour)
- Input validation with Zod
- Audit trail for compliance

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "company_id": "uuid",
  "magic_link": "https://...",
  "invite_code": "PARTNER-XXXX"
}
```

---

## Phase 3: Domain-Based Organization Management

### Database Enhancements

**New table: `organization_domain_settings`**
```sql
CREATE TABLE organization_domain_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_enabled boolean DEFAULT true,
  auto_provision_users boolean DEFAULT false,
  default_role text DEFAULT 'viewer',
  require_admin_approval boolean DEFAULT true,
  allow_google_oauth boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, domain)
);
```

**Update `company_sso_config`:**
- Already has `allowed_domains` array - will leverage this
- Add `auto_provision_on_oauth` boolean column

### Self-Service Partner Invite Flow

Partners can invite their own organization members:
- Admin adds domain (e.g., `acme.com`) to company settings
- Partner clicks "Invite Team" button
- Enter email addresses (must match domain)
- System sends branded invites
- New users auto-join company on signup

---

## Phase 4: Google OAuth Pre-Linking

### How It Works

1. Admin provisions partner with email `ceo@acme.com`
2. System creates auth user with `email_confirmed: true`
3. When partner clicks Google OAuth:
   - Supabase matches Google email to existing user
   - Links Google identity to account
   - Partner is logged in seamlessly

### Database Support

Add to profiles table migration:
```sql
ALTER TABLE profiles 
ADD COLUMN oauth_providers text[] DEFAULT '{}',
ADD COLUMN preferred_auth_method text DEFAULT 'magic_link';
```

Track allowed OAuth methods per company in `company_sso_config`

---

## Phase 5: Organization Invite Portal

### Create `src/components/admin/OrganizationInviteModal.tsx`

**For TQC Admins:**
- Bulk invite partners with CSV upload
- Template selector for email content
- Schedule send time
- Track invite acceptance

**For Partners (self-service):**
- Invite team members from their domain
- Set individual roles
- View pending/accepted invites
- Revoke access

### Invite Code System Enhancement

Extend `invite_codes` table:
```sql
ALTER TABLE invite_codes
ADD COLUMN invite_type text DEFAULT 'member', -- 'member', 'partner', 'organization'
ADD COLUMN company_id uuid REFERENCES companies(id),
ADD COLUMN target_role text DEFAULT 'user',
ADD COLUMN max_uses int DEFAULT 1,
ADD COLUMN uses_count int DEFAULT 0;
```

---

## Phase 6: Concierge Welcome Experience

### Email Templates

**Partner Welcome Email:**
- Personalized greeting with admin's name
- One-click magic link button (72h expiry)
- Alternative: "Set Your Password" link
- Company logo and branding
- Direct line to assigned strategist
- Calendar link for onboarding call

### SMS Notification

Optional SMS with short magic link for mobile-first partners

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/admin/PartnerProvisioningModal.tsx` | Main provisioning modal |
| `src/components/admin/OrganizationInviteModal.tsx` | Bulk/self-service invites |
| `src/components/admin/DomainManagementPanel.tsx` | Domain SSO config UI |
| `src/hooks/usePartnerProvisioning.ts` | Hook for provisioning logic |
| `supabase/functions/provision-partner/index.ts` | Backend provisioning |
| `supabase/functions/send-partner-welcome/index.ts` | Welcome email sender |
| `src/components/partner/TeamInviteWidget.tsx` | Partner self-service invite |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Companies.tsx` | Add "Provision Partner" button |
| `src/components/crm/ConvertToPartnerDialog.tsx` | Integrate new provisioning flow |
| `src/pages/CompanyPage.tsx` | Add domain management tab |
| `src/components/partner/TeamManagement.tsx` | Add invite functionality |
| `src/pages/Auth.tsx` | Handle pre-provisioned OAuth linking |

---

## Database Migration

```sql
-- Organization domain settings
CREATE TABLE organization_domain_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_enabled boolean DEFAULT true,
  auto_provision_users boolean DEFAULT false,
  default_role text DEFAULT 'viewer',
  require_admin_approval boolean DEFAULT true,
  allow_google_oauth boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, domain)
);

-- Partner provisioning audit log
CREATE TABLE partner_provisioning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provisioned_user_id uuid REFERENCES auth.users(id),
  provisioned_by uuid REFERENCES auth.users(id),
  company_id uuid REFERENCES companies(id),
  provision_method text NOT NULL, -- 'magic_link', 'password', 'oauth_only'
  email_verified_by_admin boolean DEFAULT false,
  phone_verified_by_admin boolean DEFAULT false,
  invite_code_generated text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Extend invite_codes for organization invites
ALTER TABLE invite_codes
ADD COLUMN IF NOT EXISTS invite_type text DEFAULT 'member',
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS target_role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS max_uses int DEFAULT 1,
ADD COLUMN IF NOT EXISTS uses_count int DEFAULT 0;

-- Extend profiles for OAuth tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS oauth_providers text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_auth_method text DEFAULT 'magic_link',
ADD COLUMN IF NOT EXISTS provisioned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS provisioned_at timestamptz;

-- RLS Policies
ALTER TABLE organization_domain_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_provisioning_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage domain settings"
ON organization_domain_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Company owners can manage their domain settings"
ON organization_domain_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.company_id = organization_domain_settings.company_id
    AND company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
  )
);
```

---

## Additional 0.0001% Features (Not Requested But Elevating)

1. **Partner Dossier Auto-Generation**
   - When provisioning, auto-fetch LinkedIn data
   - Pre-populate company intel from Clearbit/similar
   - Generate relationship map with TQC network

2. **White-Label Email Domain**
   - Emails come from `invite@thequantumclub.com`
   - Branded sender name: "Your Concierge at TQC"

3. **Calendar Pre-Booking**
   - Optionally schedule onboarding call during provisioning
   - Auto-assign strategist based on industry/location

4. **Mobile App Deep Link**
   - Magic links open native app if installed
   - Fallback to web with app install prompt

5. **Two-Factor Pre-Configuration**
   - Option to require 2FA for high-value partners
   - Send authenticator setup QR in welcome email

6. **Granular Permission Templates**
   - "Executive Partner" preset (full access)
   - "HR Contact" preset (hiring only)
   - "Hiring Manager" preset (specific jobs only)

---

## Security Considerations

1. Admin provisioning requires verified admin role
2. All actions logged to audit trail
3. Magic links expire in 72 hours
4. Pre-verified status clearly indicated in UI
5. Domain settings require company ownership verification
6. Rate limiting on provisioning endpoints
7. CSRF protection on all forms

---

## Estimated Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| Phase 1 | Partner Provisioning Modal | 3 hours |
| Phase 2 | Edge Function + Email | 2 hours |
| Phase 3 | Domain Management | 2 hours |
| Phase 4 | OAuth Pre-Linking | 1 hour |
| Phase 5 | Organization Invites | 2 hours |
| Phase 6 | Welcome Experience | 1 hour |
| **Total** | | **11 hours** |

---

## Success Metrics

- Time to provision partner: < 2 minutes
- Partner first login success rate: > 95%
- Self-service invite adoption: > 60% of partners
- Support tickets for access issues: -80%
- Partner NPS improvement: +15 points

