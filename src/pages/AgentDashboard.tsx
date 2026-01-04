import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalsDashboard } from "@/components/agent/GoalsDashboard";
import { AgentActivityFeed } from "@/components/agent/AgentActivityFeed";
import { AutonomySettings } from "@/components/agent/AutonomySettings";
import { AgentGovernanceDashboard } from "@/components/agent/AgentGovernanceDashboard";
import { AgentApprovalQueue } from "@/components/agent/AgentApprovalQueue";
import { DecisionExplainer } from "@/components/agent/DecisionExplainer";
import { LearningInsightsPanel } from "@/components/agent/LearningInsightsPanel";
import { MemberAgentWidget } from "@/components/agent/MemberAgentWidget";
import { PartnerAgentWidget } from "@/components/agent/PartnerAgentWidget";
import { StrategistAgentWidget } from "@/components/agent/StrategistAgentWidget";
import { Target, Activity, Shield, Settings, Bot, Users, Brain } from "lucide-react";

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState("goals");

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          QUIN Agent Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your AI agents, track goals, and control autonomy levels
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-2">
            <Users className="h-4 w-4" />
            Personas
          </TabsTrigger>
          <TabsTrigger value="learning" className="gap-2">
            <Brain className="h-4 w-4" />
            Learning
          </TabsTrigger>
          <TabsTrigger value="governance" className="gap-2">
            <Shield className="h-4 w-4" />
            Governance
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Autonomy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="mt-6">
          <GoalsDashboard />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <AgentActivityFeed limit={30} />
            <div className="space-y-6">
              <AgentApprovalQueue />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personas" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MemberAgentWidget />
            <PartnerAgentWidget />
            <StrategistAgentWidget />
          </div>
        </TabsContent>

        <TabsContent value="learning" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <LearningInsightsPanel />
            <DecisionExplainer />
          </div>
        </TabsContent>

        <TabsContent value="governance" className="mt-6">
          <AgentGovernanceDashboard />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <AutonomySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
