import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
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
    setSearchParams(value === 'matrix' ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">PERFORMANCE HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Performance metrics, team tracking, and user activity analytics
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="matrix">Performance Matrix</TabsTrigger>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
              <TabsTrigger value="activity">User Activity</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="matrix"><QuantumPerformanceMatrixPage /></TabsContent>
              <TabsContent value="team"><TeamPerformance /></TabsContent>
              <TabsContent value="activity"><UserActivity /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
