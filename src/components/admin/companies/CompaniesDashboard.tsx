import { DashboardHeader } from "../shared/DashboardHeader";
import { TotalCompaniesCard } from "./TotalCompaniesCard";
import { TotalJobsCard } from "./TotalJobsCard";
import { TotalApplicationsCard } from "./TotalApplicationsCard";
import { CompanyFollowersCard } from "./CompanyFollowersCard";
import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { useQueryClient } from "@tanstack/react-query";

export const CompaniesDashboard = () => {
  const queryClient = useQueryClient();
  const { isLoading } = useCompanyMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['company-'] });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Companies Overview"
        description="Manage company accounts and engagement"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TotalCompaniesCard />
        <TotalJobsCard />
        <TotalApplicationsCard />
        <CompanyFollowersCard />
      </div>
    </div>
  );
};
