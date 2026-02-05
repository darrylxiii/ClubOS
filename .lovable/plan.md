

# Partner Team Invite System: Domain-Restricted Implementation

## Overview

This plan implements a complete domain-based team invite system for partners, ensuring that partners can only invite team members with email addresses matching their company's authorized domain(s).

---

## Current State Analysis

### What Exists

| Component | Status | Notes |
|-----------|--------|-------|
| `TeamInviteWidget.tsx` | Created but NOT INTEGRATED | Has domain validation logic, but not connected to any page |
| `organization_domain_settings` table | Exists, empty | Stores domain configurations per company |
| `DomainManagementPanel.tsx` | Admin-only UI | Partners cannot manage their own domains |
| Domain validation in widget | Basic client-side | Checks if email ends with `@domain` |

### Gaps Identified

1. **Widget not integrated**: `TeamInviteWidget` is never rendered anywhere
2. **No domain source for partners**: Partners' companies have no domain configured
3. **Domain lookup missing**: No logic to fetch partner's authorized domain from `organization_domain_settings`
4. **Server-side validation absent**: Edge function doesn't validate domain
5. **Partners can't see domains**: Only admins can access the Domains tab
6. **No auto-detection**: Partner's email domain isn't auto-suggested when setting up company

---

## Implementation Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                  PARTNER TEAM INVITE FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Partner accesses Company Page → Team Tab                    │
│     ↓                                                           │
│  2. TeamInviteWidget renders (if canInvite=true)                │
│     ↓                                                           │
│  3. Widget fetches authorized domains from                      │
│     organization_domain_settings WHERE company_id = X           │
│     ↓                                                           │
│  4. Partner enters invitee email                                │
│     ↓                                                           │
│  5. Client validates: email domain ∈ authorized domains         │
│     ↓                                                           │
│  6. Edge function validates again server-side                   │
│     ↓                                                           │
│  7. Invite created + email sent                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Integrate TeamInviteWidget into Company Page

### Modify `src/pages/CompanyPage.tsx`

- Import `TeamInviteWidget`
- Add widget to the Team tab for company members (partners/recruiters)
- Pass `companyId`, `canInvite`, and dynamically fetch `companyDomain`

**Location**: Team tab, below the "Manage" sub-tab or as a card in the Team header section

**Permissions**:
- `canInvite = true` for company members with role: `owner`, `admin`, or `recruiter`
- Admins can invite to any company; Partners only to their own

---

## Phase 2: Domain Lookup Hook

### Create `src/hooks/useCompanyDomains.ts`

A hook that:
1. Fetches authorized domains from `organization_domain_settings` for a company
2. Returns: `{ domains: string[], primaryDomain: string | null, loading: boolean }`
3. Caches result with React Query

**Usage**:
```typescript
const { domains, primaryDomain, loading } = useCompanyDomains(companyId);
// Pass to TeamInviteWidget
```

---

## Phase 3: Enhanced TeamInviteWidget

### Modify `src/components/partner/TeamInviteWidget.tsx`

**Current**: Accepts optional `companyDomain` prop

**Enhanced**:
1. Fetch domains internally using `useCompanyDomains` hook
2. Support multiple authorized domains (not just one)
3. Show dropdown/badge of allowed domains
4. Auto-detect partner's own email domain as suggestion
5. Improved validation messaging

**UI Changes**:
- Show "Allowed domains: @acme.com, @acme.io" badge
- Placeholder dynamically uses first allowed domain
- Error message lists all valid options

---

## Phase 4: Server-Side Domain Validation

### Modify `supabase/functions/send-team-invite/index.ts`

**Add validation**:
1. Extract invitee email domain
2. Fetch `organization_domain_settings` for the company
3. Verify email domain is in allowed list
4. Return 403 if domain not authorized

**New validation logic**:
```typescript
// Extract domain from email
const inviteeDomain = body.email.split('@')[1];

// Fetch allowed domains for company
const { data: domainSettings } = await supabase
  .from('organization_domain_settings')
  .select('domain')
  .eq('company_id', body.companyId)
  .eq('is_enabled', true);

const allowedDomains = domainSettings?.map(d => d.domain) || [];

if (allowedDomains.length > 0 && !allowedDomains.includes(inviteeDomain)) {
  return new Response(JSON.stringify({ 
    error: `Only emails from ${allowedDomains.join(', ')} are allowed` 
  }), { status: 403, headers: corsHeaders });
}
```

---

## Phase 5: Partner Domain Management

### Create `src/components/partner/PartnerDomainSettings.tsx`

A simplified domain management panel for partners (not full admin panel):
- View authorized domains for their company
- Request to add a new domain (requires admin approval)
- Cannot modify SSO settings (admin-only)

### Add to Company Page

- Partners see a "Settings" sub-tab in Team section
- Includes: Invite widget + Domain settings (view-only)

---

## Phase 6: Auto-Suggest Domain on Company Setup

### Modify Partner Provisioning

When a partner is provisioned:
1. Extract domain from partner's email
2. Auto-create `organization_domain_settings` entry with that domain
3. Set `is_enabled = true`, `require_admin_approval = false`

This ensures every provisioned partner's company has at least one authorized domain.

---

## Files to Create

| File | Description |
|------|-------------|
| `src/hooks/useCompanyDomains.ts` | Hook to fetch company's authorized domains |
| `src/components/partner/PartnerDomainSettings.tsx` | Partner view of domain settings |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CompanyPage.tsx` | Import and render `TeamInviteWidget` in Team tab |
| `src/components/partner/TeamInviteWidget.tsx` | Use `useCompanyDomains`, support multiple domains |
| `supabase/functions/send-team-invite/index.ts` | Add server-side domain validation |
| `supabase/functions/provision-partner/index.ts` | Auto-create domain setting on provision |

---

## Database Considerations

No new tables required. Existing `organization_domain_settings` table has all necessary columns:
- `id`, `company_id`, `domain`, `is_enabled`, `auto_provision_users`, etc.

**Optional enhancement**: Add `created_by_partner boolean` column to track partner-requested domains vs admin-added

---

## Security Model

| Action | Who Can Do It |
|--------|---------------|
| View authorized domains | Company members (owner, admin, recruiter) |
| Add domain | Admins only (or partner request with approval) |
| Invite within domain | Company members with invite permissions |
| Modify domain SSO settings | Admins only |
| Delete domain | Admins only |

---

## Validation Flow Summary

```text
CLIENT SIDE
├── User enters email: john@example.com
├── Extract domain: example.com
├── Check: example.com ∈ [acme.com, acme.io]
├── If NO → Show error: "Only @acme.com or @acme.io emails allowed"
├── If YES → Proceed to submit

SERVER SIDE (Edge Function)
├── Receive request with email + companyId
├── Query organization_domain_settings for companyId
├── Extract allowed domains
├── Validate invitee domain against list
├── If invalid → 403 Forbidden
├── If valid → Create invite + send email
```

---

## Technical Approach

### useCompanyDomains Hook

```typescript
export function useCompanyDomains(companyId: string) {
  return useQuery({
    queryKey: ['company-domains', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_domain_settings')
        .select('domain, is_enabled')
        .eq('company_id', companyId)
        .eq('is_enabled', true);
      
      if (error) throw error;
      return data?.map(d => d.domain) || [];
    },
    enabled: !!companyId
  });
}
```

### Widget Integration Point

In `CompanyPage.tsx`, within the Team tab's manage section:

```tsx
<TeamInviteWidget 
  companyId={company.id}
  canInvite={isCompanyMember && memberRole !== 'viewer'}
/>
```

---

## Success Criteria

1. Partners can access invite widget from their company's Team tab
2. Widget shows authorized domains clearly
3. Invites are blocked (client + server) for unauthorized domains
4. Provisioned partners automatically have their domain authorized
5. Partners cannot bypass domain restrictions
6. Audit logs track all invite attempts

---

## Estimated Implementation Time

| Phase | Duration |
|-------|----------|
| Phase 1: Widget Integration | 30 min |
| Phase 2: Domain Hook | 30 min |
| Phase 3: Enhanced Widget | 45 min |
| Phase 4: Server Validation | 30 min |
| Phase 5: Partner Domain View | 30 min |
| Phase 6: Auto-Suggest on Provision | 30 min |
| **Total** | **~3 hours** |

