import { lazy, Suspense, useState } from 'react';
import { Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';
import { useSearchParams } from 'react-router-dom';
import AgenticSystemHealth from '@/components/admin/agentic/AgenticSystemHealth';

const MissionControlView = lazy(() => import('@/components/admin/agentic/MissionControlView'));
const IntelligenceFeedView = lazy(() => import('@/components/admin/agentic/IntelligenceFeedView'));
const AgentDirectoryView = lazy(() => import('@/components/admin/agentic/AgentDirectoryView'));
const BriefingDocumentView = lazy(() => import('@/components/admin/agentic/BriefingDocumentView'));
const AgentChatView = lazy(() => import('@/components/admin/agentic/AgentChatView'));
const SourcingCommandPanel = lazy(() => import('@/components/admin/agentic/SourcingCommandPanel'));

export default function AgenticOSHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'mission';
  const [chatAgent, setChatAgent] = useState<string | undefined>();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const openAgentChat = (agentName: string) => {
    setChatAgent(agentName);
    handleTabChange('chat');
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider">Agentic OS</h1>
          <p className="text-xs text-muted-foreground">Enterprise Command Center</p>
        </div>
      </div>

      <AgenticSystemHealth />

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-6 sm:w-full h-auto bg-card/50 backdrop-blur-sm rounded-lg p-1">
            <TabsTrigger value="mission">Mission Control</TabsTrigger>
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="briefings">Briefings</TabsTrigger>
            <TabsTrigger value="chat">Agent Chat</TabsTrigger>
            <TabsTrigger value="sourcing">Sourcing</TabsTrigger>
          </TabsList>
        </div>

        <Suspense fallback={<PageLoader />}>
          <TabsContent value="mission">
            <MissionControlView />
          </TabsContent>
          <TabsContent value="intelligence">
            <IntelligenceFeedView />
          </TabsContent>
          <TabsContent value="agents">
            <AgentDirectoryView onOpenChat={openAgentChat} />
          </TabsContent>
          <TabsContent value="briefings">
            <BriefingDocumentView />
          </TabsContent>
          <TabsContent value="chat">
            <AgentChatView initialAgent={chatAgent} />
          </TabsContent>
          <TabsContent value="sourcing">
            <SourcingCommandPanel />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
