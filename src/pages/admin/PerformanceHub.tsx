import { useTranslation } from 'react-i18next';
import { lazy, Suspense, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';

const QuantumPerformanceMatrixPage = lazy(() => import('@/pages/QuantumPerformanceMatrixPage'));
const UserActivity = lazy(() => import('@/pages/admin/UserActivity'));

const TAB_MAP: Record<string, string> = {
  matrix: 'matrix',
  activity: 'activity',
};

export default function PerformanceHub() {
  const { t } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedTab = searchParams.get('tab') || '';

  useEffect(() => {
    if (requestedTab === 'team') {
      navigate('/admin/employee-management?tab=team-performance', { replace: true });
    }
  }, [requestedTab, navigate]);

  const activeTab = TAB_MAP[requestedTab] || 'matrix';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'matrix' ? {} : { tab: value }, { replace: true });
  };

  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{t("performance_hub", "PERFORMANCE HUB")}</h1>
          </div>
          <p className="text-muted-foreground">Performance metrics and user activity analytics</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
            <TabsTrigger value="matrix">{t("performance_matrix", "Performance Matrix")}</TabsTrigger>
            <TabsTrigger value="activity">{t("user_activity", "User Activity")}</TabsTrigger>
          </TabsList>
          <Suspense fallback={<PageLoader />}>
            <TabsContent value="matrix"><QuantumPerformanceMatrixPage /></TabsContent>
            <TabsContent value="activity"><UserActivity /></TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </RoleGate>
  );
}
