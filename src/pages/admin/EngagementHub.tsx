import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { PageTitle } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';

const FunnelAnalytics = lazy(() => import('@/pages/FunnelAnalytics'));
const UserEngagementDashboard = lazy(() => import('@/pages/admin/UserEngagementDashboard'));

const TAB_MAP: Record<string, string> = {
  funnel: 'funnel',
  engagement: 'engagement',
};

export default function EngagementHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'funnel';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <PageTitle>Engagement Hub</PageTitle>
              <p className="text-sm text-muted-foreground">
                Funnel performance and platform engagement metrics
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-2 sm:w-full h-auto bg-card/50 backdrop-blur-sm rounded-lg p-1">
                <TabsTrigger value="funnel">Funnel Analytics</TabsTrigger>
                <TabsTrigger value="engagement">User Engagement</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="funnel">
              <Suspense fallback={<PageLoader />}>
                <FunnelAnalytics />
              </Suspense>
            </TabsContent>

            <TabsContent value="engagement">
              <Suspense fallback={<PageLoader />}>
                <UserEngagementDashboard />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
