import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHiringMetrics, useRecruiterPerformance, usePipelineHealth } from "@/hooks/useAnalytics";
import { HiringVelocityChart } from "./HiringVelocityChart";
import { PipelineHealthChart } from "./PipelineHealthChart";
import { RecruiterPerformanceChart } from "./RecruiterPerformanceChart";
import { MetricsOverview } from "./MetricsOverview";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ExecutiveDashboardProps {
  companyId: string;
}

export function ExecutiveDashboard({ companyId }: ExecutiveDashboardProps) {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: hiringMetrics, isLoading: hiringLoading, refetch: refetchHiring } = useHiringMetrics(companyId);
  const { data: recruiterPerf, isLoading: recruiterLoading, refetch: refetchRecruiter } = useRecruiterPerformance(companyId);
  const { data: pipelineHealth, isLoading: pipelineLoading, refetch: refetchPipeline } = usePipelineHealth(companyId);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchHiring(),
        refetchRecruiter(),
        refetchPipeline()
      ]);
      toast({
        title: "Analytics Refreshed",
        description: "All metrics have been updated with the latest data.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh analytics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your analytics report will be downloaded shortly.",
    });
  };

  const isLoading = hiringLoading || recruiterLoading || pipelineLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time insights into your hiring performance and team metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <MetricsOverview 
        hiringMetrics={hiringMetrics || []}
        isLoading={isLoading}
      />

      {/* Detailed Charts */}
      <Tabs defaultValue="velocity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="velocity">Hiring Velocity</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Health</TabsTrigger>
          <TabsTrigger value="performance">Recruiter Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="velocity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hiring Velocity Trends</CardTitle>
              <CardDescription>
                Track time-to-hire, application volume, and conversion rates over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HiringVelocityChart 
                data={hiringMetrics || []}
                isLoading={hiringLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Health Analysis</CardTitle>
              <CardDescription>
                Monitor candidate distribution across stages and identify bottlenecks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineHealthChart 
                data={pipelineHealth || []}
                isLoading={pipelineLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recruiter Performance</CardTitle>
              <CardDescription>
                Compare individual recruiter metrics and team productivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecruiterPerformanceChart 
                data={recruiterPerf || []}
                isLoading={recruiterLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}