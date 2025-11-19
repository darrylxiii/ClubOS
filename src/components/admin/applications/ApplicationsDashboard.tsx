import { DashboardHeader } from "../shared/DashboardHeader";
import { TotalApplicationsCard } from "./TotalApplicationsCard";
import { ReviewQueueCard } from "./ReviewQueueCard";
import { ApprovalRateCard } from "./ApprovalRateCard";
import { NewApplicationsCard } from "./NewApplicationsCard";
import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { useQueryClient } from "@tanstack/react-query";
import { AlertPanel } from "../shared/AlertPanel";

export const ApplicationsDashboard = () => {
  const queryClient = useQueryClient();
  const { metrics, isLoading } = useApplicationMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['application-'] });
  };

  const alerts = metrics?.critical_pending && metrics.critical_pending > 0 ? [{
    id: 'critical-pending',
    type: 'warning' as const,
    title: 'Pending Review Alert',
    message: `${metrics.critical_pending} applications pending review for over 48 hours`,
  }] : [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Candidate Applications"
        description="Manage and review candidate applications"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {alerts.length > 0 && <AlertPanel alerts={alerts} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TotalApplicationsCard />
        <ReviewQueueCard />
        <ApprovalRateCard />
        <NewApplicationsCard />
      </div>
    </div>
  );
};
