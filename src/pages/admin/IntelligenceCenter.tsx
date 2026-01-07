import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  Brain,
  BarChart3,
  Target,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
const GlobalAnalyticsContent = lazy(() => import('@/pages/admin/GlobalAnalytics').then(m => ({ default: () => {
  const Component = m.default;
  return <Component />;
}})));
const HiringIntelligenceContent = lazy(() => import('@/pages/HiringIntelligenceHub'));
const FunnelAnalyticsContent = lazy(() => import('@/pages/FunnelAnalytics'));
const CommunicationAnalyticsContent = lazy(() => import('@/components/communication/CommunicationAnalyticsDashboard').then(m => ({ default: m.CommunicationAnalyticsDashboard })));
const MessagingAnalyticsContent = lazy(() => import('@/pages/MessagingAnalytics'));
const EnhancedMLDashboardContent = lazy(() => import('@/pages/EnhancedMLDashboard'));

function TabLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function IntelligenceCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              Intelligence Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Unified analytics and AI-powered insights
            </p>
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="hiring" className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Hiring
              </TabsTrigger>
              <TabsTrigger value="funnel" className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Funnel
              </TabsTrigger>
              <TabsTrigger value="communication" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Communication
              </TabsTrigger>
              <TabsTrigger value="ml" className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                ML Models
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Suspense fallback={<TabLoader />}>
                <GlobalAnalyticsContent />
              </Suspense>
            </TabsContent>

            <TabsContent value="hiring" className="mt-6">
              <Suspense fallback={<TabLoader />}>
                <HiringIntelligenceContent />
              </Suspense>
            </TabsContent>

            <TabsContent value="funnel" className="mt-6">
              <Suspense fallback={<TabLoader />}>
                <FunnelAnalyticsContent />
              </Suspense>
            </TabsContent>

            <TabsContent value="communication" className="mt-6">
              <Suspense fallback={<TabLoader />}>
                <CommunicationAnalyticsContent />
              </Suspense>
            </TabsContent>

            <TabsContent value="ml" className="mt-6">
              <Suspense fallback={<TabLoader />}>
                <EnhancedMLDashboardContent />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
