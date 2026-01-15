import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import { CRMPermission } from "@/config/permissions";
import { UnifiedLoader } from "@/components/ui/unified-loader";

interface PermissionGateProps {
    children: ReactNode;
    permission: CRMPermission;
    fallback?: ReactNode;
    showLoading?: boolean;
}

export const PermissionGate = ({
    children,
    permission,
    fallback = null,
    showLoading = false
}: PermissionGateProps) => {
    const { allowed, loading } = usePermission(permission);

    if (loading && showLoading) {
        return <UnifiedLoader variant="section" />;
    }

    if (loading && !showLoading) {
        return null;
    }

    if (!allowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
