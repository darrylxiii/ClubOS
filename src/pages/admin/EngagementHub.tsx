import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
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
    setSearchParams(value === 'funnel' ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">ENGAGEMENT HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Funnel performance and platform engagement metrics
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="funnel">Funnel Analytics</TabsTrigger>
              <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="funnel"><FunnelAnalytics /></TabsContent>
              <TabsContent value="engagement"><UserEngagementDashboard /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
