import { useRole } from "@/contexts/RoleContext";
import { CRMPermission, hasPermission } from "@/config/permissions";

export const usePermission = (permission: CRMPermission) => {
    const { currentRole, loading } = useRole();

    const allowed = hasPermission(currentRole, permission);

    return {
        allowed,
        loading
    };
};

export const usePermissions = (permissions: CRMPermission[]) => {
    const { currentRole, loading } = useRole();

    const allAllowed = permissions.every(p => hasPermission(currentRole, p));
    const anyAllowed = permissions.some(p => hasPermission(currentRole, p));

    return {
        allAllowed,
        anyAllowed,
        loading
    };
};
