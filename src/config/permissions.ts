import { UserRole } from "@/types/roles";

export type CRMPermission =
    // Contacts
    | 'crm.contacts.view'
    | 'crm.contacts.create'
    | 'crm.contacts.edit'
    | 'crm.contacts.delete'
    | 'crm.contacts.export'

    // Deals
    | 'crm.deals.view'
    | 'crm.deals.create'
    | 'crm.deals.edit'
    | 'crm.deals.delete'

    // Reporting & Intelligence
    | 'crm.reports.view_basic'
    | 'crm.reports.view_advanced'
    | 'crm.intelligence.view_graph'

    // System
    | 'crm.audit.view'
    | 'crm.automations.manage'
    | 'crm.schemas.manage';

export const ROLE_PERMISSIONS: Record<NonNullable<UserRole>, CRMPermission[]> = {
    admin: [
        'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit', 'crm.contacts.delete', 'crm.contacts.export',
        'crm.deals.view', 'crm.deals.create', 'crm.deals.edit', 'crm.deals.delete',
        'crm.reports.view_basic', 'crm.reports.view_advanced', 'crm.intelligence.view_graph',
        'crm.audit.view', 'crm.automations.manage', 'crm.schemas.manage'
    ],
    strategist: [
        'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit', 'crm.contacts.export',
        'crm.deals.view', 'crm.deals.create', 'crm.deals.edit',
        'crm.reports.view_basic', 'crm.reports.view_advanced', 'crm.intelligence.view_graph',
        'crm.audit.view', 'crm.automations.manage'
    ],
    partner: [
        'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit',
        'crm.deals.view', 'crm.deals.create', 'crm.deals.edit',
        'crm.reports.view_basic', 'crm.intelligence.view_graph'
    ],
    company_admin: [
        'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit',
        'crm.deals.view', 'crm.deals.create', 'crm.deals.edit',
        'crm.reports.view_basic'
    ],
    recruiter: [
        'crm.contacts.view', 'crm.contacts.create', 'crm.deals.view'
    ],
    user: [
        'crm.contacts.view'
        // Very limited access
    ]
};

export const hasPermission = (role: UserRole, permission: CRMPermission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};
