import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { PageTitle } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';

const CommunicationIntelligence = lazy(() => import('@/pages/CommunicationIntelligence'));
const CommunicationAnalyticsDashboard = lazy(() =>
  import('@/components/communication/CommunicationAnalyticsDashboard').then(m => ({ default: m.CommunicationAnalyticsDashboard }))
);
const ConversationAnalytics = lazy(() => import('@/pages/admin/ConversationAnalytics'));
const MessagingAnalytics = lazy(() => import('@/pages/MessagingAnalytics'));

const TAB_MAP: Record<string, string> = {
  intelligence: 'intelligence',
  analytics: 'analytics',
  conversations: 'conversations',
  messaging: 'messaging',
};

export default function CommunicationHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'intelligence';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <PageTitle>Communication Hub</PageTitle>
              <p className="text-sm text-muted-foreground">
                Unified communication intelligence, analytics, and messaging insights
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-4 sm:w-full h-auto bg-card/50 backdrop-blur-sm rounded-lg p-1">
                <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="conversations">Conversations</TabsTrigger>
                <TabsTrigger value="messaging">Messaging</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="intelligence">
              <Suspense fallback={<PageLoader />}>
                <CommunicationIntelligence />
              </Suspense>
            </TabsContent>

            <TabsContent value="analytics">
              <Suspense fallback={<PageLoader />}>
                <CommunicationAnalyticsDashboard />
              </Suspense>
            </TabsContent>

            <TabsContent value="conversations">
              <Suspense fallback={<PageLoader />}>
                <ConversationAnalytics />
              </Suspense>
            </TabsContent>

            <TabsContent value="messaging">
              <Suspense fallback={<PageLoader />}>
                <MessagingAnalytics />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
