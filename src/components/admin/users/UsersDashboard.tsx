import { DashboardHeader } from "../shared/DashboardHeader";
import { TotalUsersCard } from "./TotalUsersCard";
import { RolesDistributionCard } from "./RolesDistributionCard";
import { ActivityStatusCard } from "./ActivityStatusCard";
import { CompanyMembersCard } from "./CompanyMembersCard";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';

export const UsersDashboard = () => {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const { isLoading } = useUserMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-'] });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={t('users.usersDashboard.userManagement')}
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
