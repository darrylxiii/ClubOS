import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { PageTitle } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';

const QuantumPerformanceMatrixPage = lazy(() => import('@/pages/QuantumPerformanceMatrixPage'));
const TeamPerformance = lazy(() => import('@/pages/TeamPerformance'));
const UserActivity = lazy(() => import('@/pages/admin/UserActivity'));

const TAB_MAP: Record<string, string> = {
  matrix: 'matrix',
  team: 'team',
  activity: 'activity',
};

export default function PerformanceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'matrix';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <PageTitle>Performance Hub</PageTitle>
              <p className="text-sm text-muted-foreground">
                Performance metrics, team tracking, and user activity analytics
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-3 sm:w-full h-auto bg-card/50 backdrop-blur-sm rounded-lg p-1">
                <TabsTrigger value="matrix">Performance Matrix</TabsTrigger>
                <TabsTrigger value="team">Team Performance</TabsTrigger>
                <TabsTrigger value="activity">User Activity</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="matrix">
              <Suspense fallback={<PageLoader />}>
                <QuantumPerformanceMatrixPage />
              </Suspense>
            </TabsContent>

            <TabsContent value="team">
              <Suspense fallback={<PageLoader />}>
                <TeamPerformance />
              </Suspense>
            </TabsContent>

            <TabsContent value="activity">
              <Suspense fallback={<PageLoader />}>
                <UserActivity />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
