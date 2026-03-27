import { useTranslation } from 'react-i18next';
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain } from 'lucide-react';

import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';

const CommunicationIntelligence = lazy(() => import('@/pages/CommunicationIntelligence'));
const CommunicationAnalyticsDashboard = lazy(() => import('@/components/communication/CommunicationAnalyticsDashboard'));
const ConversationAnalytics = lazy(() => import('@/pages/admin/ConversationAnalytics'));
const MessagingAnalytics = lazy(() => import('@/pages/MessagingAnalytics'));
const FeedbackDatabase = lazy(() => import('@/pages/FeedbackDatabase'));

const TAB_MAP: Record<string, string> = {
  intelligence: 'intelligence',
  analytics: 'analytics',
  conversations: 'conversations',
  messaging: 'messaging',
  feedback: 'feedback',
};

export default function CommunicationHub() {
  const { t } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'intelligence';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'intelligence' ? {} : { tab: value }, { replace: true });
  };

  return (
    <>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t("communication_hub", "COMMUNICATION HUB")}</h1>
            </div>
            <p className="text-muted-foreground">
              Unified communication intelligence, analytics, and messaging insights
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="intelligence">{t("intelligence", "Intelligence")}</TabsTrigger>
              <TabsTrigger value="analytics">{t("analytics", "Analytics")}</TabsTrigger>
              <TabsTrigger value="conversations">{t("conversations", "Conversations")}</TabsTrigger>
              <TabsTrigger value="messaging">{t("messaging", "Messaging")}</TabsTrigger>
              <TabsTrigger value="feedback">{t("feedback", "Feedback")}</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="intelligence"><CommunicationIntelligence /></TabsContent>
              <TabsContent value="analytics"><CommunicationAnalyticsDashboard /></TabsContent>
              <TabsContent value="conversations"><ConversationAnalytics /></TabsContent>
              <TabsContent value="messaging"><MessagingAnalytics /></TabsContent>
              <TabsContent value="feedback"><FeedbackDatabase /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </>
  );
}
