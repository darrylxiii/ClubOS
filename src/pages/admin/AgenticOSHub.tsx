import { lazy, Suspense, useState } from 'react';
import { Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';
import { useSearchParams } from 'react-router-dom';

const AgenticHeartbeatLogs = lazy(() => import('@/components/admin/agentic/AgenticHeartbeatLogs'));
const PredictiveSignalsView = lazy(() => import('@/components/admin/agentic/PredictiveSignalsView'));
const AgentActivityView = lazy(() => import('@/components/admin/agentic/AgentActivityView'));
const DailyBriefingsView = lazy(() => import('@/components/admin/agentic/DailyBriefingsView'));

export default function AgenticOSHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'heartbeat';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold uppercase tracking-wider">Agentic OS</h1>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-4 sm:w-full h-auto bg-card/50 backdrop-blur-sm rounded-lg p-1">
            <TabsTrigger value="heartbeat">Heartbeat Logs</TabsTrigger>
            <TabsTrigger value="signals">Predictive Signals</TabsTrigger>
            <TabsTrigger value="activity">Agent Activity</TabsTrigger>
            <TabsTrigger value="briefings">Daily Briefings</TabsTrigger>
          </TabsList>
        </div>

        <Suspense fallback={<PageLoader />}>
          <TabsContent value="heartbeat">
            <AgenticHeartbeatLogs />
          </TabsContent>
          <TabsContent value="signals">
            <PredictiveSignalsView />
          </TabsContent>
          <TabsContent value="activity">
            <AgentActivityView />
          </TabsContent>
          <TabsContent value="briefings">
            <DailyBriefingsView />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
