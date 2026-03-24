

# User Management System Audit & Redesign Plan

## Current Score: 28/100

## The Problem: 7 Disconnected Surfaces

User management functionality is scattered across **7 different locations** with no unified entry point:

| Location | What it does | Problems |
|----------|-------------|----------|
| **Admin Panel → Users & Roles tab** | `UnifiedUserManagement` — flat table of ALL users, role checkboxes, single company assignment | No role-type separation; single company assignment (broken for multi-company); 898-line monolith component; candidate-specific filters mixed with partner/admin views |
| **Admin Panel → Companies tab** | `PartnerProvisioningModal` — provision new partners | Partner provisioning buried inside company management, not user management |
| **Security Hub → God Mode tab** | `GodModeUserActions` — suspend/ban/unsuspend users, impersonation | Account lifecycle actions completely separated from user list |
| **Talent Hub** (`/admin/talent-hub`) | Member requests, merges, archived candidates, rejections | Candidate approval workflow in a separate page with no link to the main user table |
| **Employee Dashboard** (`/admin/employee-management`) | `EmployeeProfileManager` — internal staff management, commission tiers | Internal team management completely separate from user management |
| **Admin Panel header** | `StrategistManagementModal` — manage strategist assignments | Strategist-specific management as a floating button, disconnected from everything |
| **Referrals Hub → Provisioned tab** | `ProvisionedPartnersTab` — manage provisioned partners | Yet another place to manage partner users |

### Specific Technical Problems

1. **No dedicated route**: User management lives as a tab inside `/admin` — no `/admin/users` URL, no deep-linking, no bookmarking
2. **No role-based views**: Candidates, partners, and admins/staff all shown in one flat table with identical columns — partners don't have resumes, candidates don't have company roles, staff have commission tiers
3. **Single company assignment**: The edit dialog only supports assigning ONE company — directly contradicts the multi-company ownership feature we just built
4. **Account lifecycle split**: Suspend/ban/unsuspend is only in God Mode (Security Hub), not accessible from the user table
5. **No bulk operations from user list**: Bulk ops exist at `/admin/bulk-operations` but disconnected from user context
6. **No activity/login history in user table**: Must navigate to a completely separate Activity tab
7. **Partner provisioning in wrong place**: Must go to Companies page or Referrals hub to provision a partner
8. **898-line monolith**: `UnifiedUserManagement.tsx` handles fetching, filtering, rendering, editing, invite generation, CSV export — all in one file

---

## Plan: Dedicated User Management Hub at `/admin/users`

### Architecture

```text
/admin/users
├── Tab: Candidates (default)
│   ├── Table: name, email, status, salary range, location, resume, stealth, joined
│   ├── Inline actions: view profile, view as candidate, edit, suspend/ban
│   ├── Bulk: approve, reject, archive, export
│   └── Advanced filters: salary, work pref, documents, privacy
│
├── Tab: Partners
│   ├── Table: name, email, companies (multi), company roles, status, joined
│   ├── Inline actions: view profile, edit roles, manage companies, suspend/ban
│   ├── Quick action: Provision New Partner (opens PartnerProvisioningModal)
│   └── Advanced filters: company, role, provisioning status
│
├── Tab: Staff (Admins, Strategists, Recruiters)
│   ├── Table: name, email, system roles, assigned candidates, commission tier, status
│   ├── Inline actions: edit roles, assign strategist workload, manage MFA, suspend
│   ├── Quick action: Add Staff Member
│   └── Links to Employee Dashboard for detailed performance
│
├── Tab: Pending Requests
│   ├── Embedded: AdminMemberRequests (currently in TalentHub)
│   └── Both candidate and partner requests in one view
│
└── Tab: All Users (power view)
    └── Current UnifiedUserManagement table (for cross-role search)
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/UserManagementHub.tsx` | **New** — Hub page with 5 tabs, `useSearchParams` for URL persistence |
| `src/components/admin/users/CandidatesTab.tsx` | **New** — Candidate-specific table with relevant columns and filters |
| `src/components/admin/users/PartnersTab.tsx` | **New** — Partner-specific table with multi-company display, provisioning button |
| `src/components/admin/users/StaffTab.tsx` | **New** — Staff table with system roles, commission tiers, strategist assignments |
| `src/components/admin/users/PendingRequestsTab.tsx` | **New** — Wraps existing `AdminMemberRequests` |
| `src/components/admin/users/AllUsersTab.tsx` | **New** — Refactored from `UnifiedUserManagement`, stripped to a clean table |
| `src/components/admin/users/UserEditDrawer.tsx` | **New** — Replaces the cramped dialog with a full-width drawer; multi-company support; account lifecycle actions (suspend/ban) integrated; MFA reset |
| `src/routes/admin.routes.tsx` | Add route `/admin/users` → `UserManagementHub`; redirect `/admin?tab=users` → `/admin/users` |
| `src/config/navigation.config.ts` | Add "User Management" to admin Operations group (or Talent Management) |
| `src/pages/Admin.tsx` | Remove "Users & Roles" tab; add button linking to `/admin/users` |

### Key Design Decisions

1. **Dedicated route** (`/admin/users`) — bookmarkable, deep-linkable, shows up in command palette
2. **Role-separated tabs** — each user type gets columns and actions relevant to them; no more salary filters for partner views
3. **Multi-company in edit drawer** — the `UserEditDrawer` shows ALL company memberships and allows adding/removing companies per the new multi-company model
4. **Account lifecycle integrated** — suspend/ban/unsuspend actions directly in each row's action menu (imports from existing `useGodMode` hook), no need to navigate to Security Hub
5. **Partner provisioning accessible** — "Provision Partner" button in the Partners tab header, opening existing `PartnerProvisioningModal`
6. **Pending requests embedded** — no more separate `/admin/talent-hub` for member requests; it's a tab in user management where it belongs
7. **Existing components reused** — `AdminMemberRequests`, `PartnerProvisioningModal`, `useGodMode`, `UserSettingsPreview` all imported and composed, not rewritten

### What stays the same
- `TalentHub` keeps its other tabs (Merge, Archived, Sync, Rejections, Email Templates) — only Requests moves
- `EmployeeManagement` stays for detailed staff performance/commissions — Staff tab links to it
- `GodMode` stays in Security Hub for feature flags, impersonation, database tools — only account actions are surfaced in user management
- All existing data flows, RLS policies, and edge functions unchanged

### Navigation Update
In `navigation.config.ts`, under admin "Talent Management" group:
- Add: `{ name: "User Management", icon: Users, path: "/admin/users" }`
- Keep: "Member Management" → `/admin/talent-hub` (for merge/archived/sync/rejections/emails)

