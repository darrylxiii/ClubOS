import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalsDashboard } from "@/components/agent/GoalsDashboard";
import { AgentActivityFeed } from "@/components/agent/AgentActivityFeed";
import { AutonomySettings } from "@/components/agent/AutonomySettings";
import { AgentGovernanceDashboard } from "@/components/agent/AgentGovernanceDashboard";
import { Target, Activity, Shield, Settings, Bot } from "lucide-react";

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
        <TabsList className="bg-muted/50">
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
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
              {/* Quick Stats for Activity Tab */}
              <div className="p-6 rounded-lg border border-border/50 bg-muted/20">
                <h3 className="font-semibold mb-4">Agent Performance Today</h3>
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">Actions Taken</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">Goals Progressed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">Events Processed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">Time Saved</p>
                  </div>
                </div>
              </div>
            </div>
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
