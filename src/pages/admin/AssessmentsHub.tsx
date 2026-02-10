import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

const AssessmentOverviewTab = lazy(() => import('@/components/admin/assessments/AssessmentOverviewTab').then(m => ({ default: m.AssessmentOverviewTab })));
const SendAssessmentsTab = lazy(() => import('@/components/admin/assessments/SendAssessmentsTab').then(m => ({ default: m.SendAssessmentsTab })));
const ResultsDashboardTab = lazy(() => import('@/components/admin/assessments/ResultsDashboardTab').then(m => ({ default: m.ResultsDashboardTab })));
const CustomAssessmentsTab = lazy(() => import('@/components/admin/assessments/CustomAssessmentsTab').then(m => ({ default: m.CustomAssessmentsTab })));
const AssignmentTrackingTab = lazy(() => import('@/components/admin/assessments/AssignmentTrackingTab').then(m => ({ default: m.AssignmentTrackingTab })));
const ValuesPokerAdmin = lazy(() => import('@/pages/admin/games/ValuesPokerAdmin'));
const SwipeGameAdmin = lazy(() => import('@/pages/admin/games/SwipeGameAdmin'));
const PressureCookerAdmin = lazy(() => import('@/pages/admin/games/PressureCookerAdmin'));
const BlindSpotAdmin = lazy(() => import('@/pages/admin/games/BlindSpotAdmin'));
const MiljoenenjachtAdmin = lazy(() => import('@/pages/admin/games/MiljoenenjachtAdmin'));

const TAB_MAP: Record<string, string> = {
  overview: 'overview',
  send: 'send',
  results: 'results',
  custom: 'custom',
  tracking: 'tracking',
  'values-poker': 'values-poker',
  'swipe-game': 'swipe-game',
  'pressure-cooker': 'pressure-cooker',
  'blind-spot': 'blind-spot',
  miljoenenjacht: 'miljoenenjacht',
};

export default function AssessmentsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'overview';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'overview' ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">ASSESSMENTS HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Manage, send, and analyze assessments and games across your talent pool
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="send">Send</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
              <TabsTrigger value="values-poker">Values Poker</TabsTrigger>
              <TabsTrigger value="swipe-game">Swipe Game</TabsTrigger>
              <TabsTrigger value="pressure-cooker">Pressure Cooker</TabsTrigger>
              <TabsTrigger value="blind-spot">Blind Spot</TabsTrigger>
              <TabsTrigger value="miljoenenjacht">Miljoenenjacht</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="overview"><AssessmentOverviewTab /></TabsContent>
              <TabsContent value="send"><SendAssessmentsTab /></TabsContent>
              <TabsContent value="results"><ResultsDashboardTab /></TabsContent>
              <TabsContent value="custom"><CustomAssessmentsTab /></TabsContent>
              <TabsContent value="tracking"><AssignmentTrackingTab /></TabsContent>
              <TabsContent value="values-poker"><ValuesPokerAdmin /></TabsContent>
              <TabsContent value="swipe-game"><SwipeGameAdmin /></TabsContent>
              <TabsContent value="pressure-cooker"><PressureCookerAdmin /></TabsContent>
              <TabsContent value="blind-spot"><BlindSpotAdmin /></TabsContent>
              <TabsContent value="miljoenenjacht"><MiljoenenjachtAdmin /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
