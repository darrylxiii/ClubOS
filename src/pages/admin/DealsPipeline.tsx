import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealPipelineKanban } from "@/components/deals/DealPipelineKanban";
import { PipelineMetricsCards } from "@/components/deals/PipelineMetricsCards";
import { RevenueCharts } from "@/components/deals/RevenueCharts";
import { PipelineInsights } from "@/components/deals/PipelineInsights";
import { ProjectedEarnings } from "@/components/financial/ProjectedEarnings";
import { RoleGate } from "@/components/RoleGate";
import { AppLayout } from "@/components/AppLayout";
import { Target, TrendingUp, BarChart3, Lightbulb } from "lucide-react";

export default function DealsPipeline() {
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
        </div>

        {/* Metrics Cards */}
        <PipelineMetricsCards />

        {/* Tabs */}
        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-muted/50">
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="forecasting" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Forecasting
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
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

          <TabsContent value="forecasting" className="space-y-6">
            <ProjectedEarnings />
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
