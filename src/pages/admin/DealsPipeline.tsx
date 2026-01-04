import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealPipelineKanban } from "@/components/deals/DealPipelineKanban";
import { PipelineMetricsCards } from "@/components/deals/PipelineMetricsCards";
import { RevenueCharts } from "@/components/deals/RevenueCharts";
import { PipelineInsights } from "@/components/deals/PipelineInsights";
import { ProjectedEarnings } from "@/components/financial/ProjectedEarnings";
import { RevenueIntelligenceDashboard } from "@/components/deals/RevenueIntelligenceDashboard";
import { RevenuePreCalculation } from "@/components/deals/RevenuePreCalculation";
import { ProbationTracker } from "@/components/probation/ProbationTracker";
import { StrategistLeaderboard } from "@/components/leaderboard/StrategistLeaderboard";
import { ClientHealthDashboard } from "@/components/client-health/ClientHealthDashboard";
import { RoleGate } from "@/components/RoleGate";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, BarChart3, Lightbulb, Settings, Building2, Shield, Users, Heart } from "lucide-react";
import { useDealPipeline, useDealStages } from "@/hooks/useDealPipeline";
import { useNavigate } from "react-router-dom";

export default function DealsPipeline() {
  const navigate = useNavigate();
  const { data: deals } = useDealPipeline();
  const { data: stages } = useDealStages();

  return (
    <RoleGate allowedRoles={['admin', 'strategist']} showLoading>
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Deal Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Enterprise-grade deal management and revenue intelligence
            </p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => navigate('/admin/company-fees')}
          >
            <Building2 className="h-4 w-4" />
            Configure Company Fees
          </Button>
        </div>

        {/* Metrics Cards */}
        <PipelineMetricsCards />

        {/* Tabs */}
        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="grid w-full max-w-5xl grid-cols-8 bg-muted/50">
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="forecasting" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Forecasting
            </TabsTrigger>
            <TabsTrigger value="probation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Probation
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="client-health" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <DealPipelineKanban />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <RevenuePreCalculation deals={deals || []} stages={stages} />
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-6">
            <RevenueIntelligenceDashboard />
            <ProjectedEarnings />
          </TabsContent>

          <TabsContent value="probation" className="space-y-6">
            <ProbationTracker />
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <StrategistLeaderboard />
          </TabsContent>

          <TabsContent value="client-health" className="space-y-6">
            <ClientHealthDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <RevenueCharts />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <PipelineInsights />
              <div className="space-y-6">
                {/* Placeholder for future insights */}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </AppLayout>
    </RoleGate>
  );
}
