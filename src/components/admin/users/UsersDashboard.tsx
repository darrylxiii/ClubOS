import { DashboardHeader } from "../shared/DashboardHeader";
import { TotalUsersCard } from "./TotalUsersCard";
import { RolesDistributionCard } from "./RolesDistributionCard";
import { ActivityStatusCard } from "./ActivityStatusCard";
import { CompanyMembersCard } from "./CompanyMembersCard";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useQueryClient } from "@tanstack/react-query";

export const UsersDashboard = () => {
  const queryClient = useQueryClient();
  const { isLoading } = useUserMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-'] });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="User Management"
        description="Manage user accounts, roles, and permissions"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TotalUsersCard />
        <RolesDistributionCard />
        <ActivityStatusCard />
        <CompanyMembersCard />
      </div>
    </div>
  );
};
