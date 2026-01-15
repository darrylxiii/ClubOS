import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface StageData {
  name: string;
  count: number;
  avgDays: number;
}

interface HiringPipelineOverviewProps {
  companyId: string;
}

export const HiringPipelineOverview = ({ companyId }: HiringPipelineOverviewProps) => {
  const [stages, setStages] = useState<StageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActive, setTotalActive] = useState(0);

  useEffect(() => {
    fetchPipelineData();
  }, [companyId]);

  const fetchPipelineData = async () => {
    try {
      // Get company's job IDs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId);

      if (!jobs || jobs.length === 0) {
        setLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Fetch all active applications
      const { data: applications, error } = await supabase
        .from('applications')
        .select('current_stage_index, stages, updated_at')
        .in('job_id', jobIds)
        .neq('status', 'rejected')
        .neq('status', 'withdrawn');

      if (error) throw error;

      if (applications && applications.length > 0) {
        setTotalActive(applications.length);

        // Aggregate by stage
        const stageMap = new Map<string, { count: number; totalDays: number }>();

        applications.forEach(app => {
          try {
            const stages = Array.isArray(app.stages) ? app.stages : JSON.parse(app.stages as any);
            const currentStage = stages[app.current_stage_index];
            if (currentStage) {
              const stageName = currentStage.name;
              const daysSinceUpdate = Math.floor(
                (new Date().getTime() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)
              );

              if (!stageMap.has(stageName)) {
                stageMap.set(stageName, { count: 0, totalDays: 0 });
              }

              const data = stageMap.get(stageName)!;
              data.count += 1;
              data.totalDays += daysSinceUpdate;
            }
          } catch (_e) {
            console.error('Error parsing stages:', _e);
          }
        });

        const stageData: StageData[] = Array.from(stageMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          avgDays: Math.round(data.totalDays / data.count)
        }));

        // Sort by count descending
        stageData.sort((a, b) => b.count - a.count);
        setStages(stageData);
      }
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stageName: string) => {
    const stage = stageName.toLowerCase();
    if (stage.includes('applied') || stage.includes('new')) return 'bg-blue-500';
    if (stage.includes('screening') || stage.includes('review')) return 'bg-yellow-500';
    if (stage.includes('interview')) return 'bg-purple-500';
    if (stage.includes('offer') || stage.includes('final')) return 'bg-green-500';
    return 'bg-muted-foreground';
  };

  const isBottleneck = (avgDays: number) => avgDays > 7;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hiring Pipeline
          </CardTitle>
          <CardDescription>Current stage breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hiring Pipeline
          </CardTitle>
          <CardDescription>Current stage breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No active pipeline</p>
            <p className="text-xs text-muted-foreground mt-1">Pipeline data will appear when you have active applications</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Hiring Pipeline
        </CardTitle>
        <CardDescription>
          {totalActive} active candidates across {stages.length} stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => {
            const percentage = (stage.count / maxCount) * 100;
            const bottleneck = isBottleneck(stage.avgDays);

            return (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage.name}</span>
                    {bottleneck && (
                      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Slow
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{stage.avgDays}d avg</span>
                    </div>
                    <span className="font-semibold text-foreground">{stage.count}</span>
                  </div>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${getStageColor(stage.name)} rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Button className="w-full mt-4" variant="outline" asChild>
          <Link to="/company-applications">View Full Pipeline</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
