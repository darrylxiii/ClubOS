import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useCRMPipelineMetrics, useStageProbabilities, formatCurrencyCompact } from "@/hooks/useCRMPipelineMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StageBreakdown {
  stage: string;
  count: number;
  value: number;
}

export const DealPipelineSummaryWidget = () => {
  const { data: pipelineMetrics, isLoading: metricsLoading } = useCRMPipelineMetrics();
  const { data: stageProbabilities, isLoading: probLoading } = useStageProbabilities();
  
  // Get stage breakdown from crm_prospects
  const { data: stageBreakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['deal-pipeline-stage-breakdown'],
    queryFn: async (): Promise<StageBreakdown[]> => {
      const { data, error } = await supabase
        .from('crm_prospects')
        .select('stage, estimated_annual_value')
        .not('stage', 'in', '("closed_won","closed_lost")');
      
      if (error) {
        console.error('Error fetching stage breakdown:', error);
        return [];
      }
      
      // Group by stage
      const breakdown: Record<string, { count: number; value: number }> = {};
      (data || []).forEach(prospect => {
        const stage = prospect.stage || 'new';
        if (!breakdown[stage]) {
          breakdown[stage] = { count: 0, value: 0 };
        }
        breakdown[stage].count++;
        breakdown[stage].value += prospect.estimated_annual_value || 0;
      });
      
      return Object.entries(breakdown)
        .map(([stage, data]) => ({ stage, ...data }))
        .sort((a, b) => {
          const orderA = stageProbabilities?.[a.stage]?.stage_order || 99;
          const orderB = stageProbabilities?.[b.stage]?.stage_order || 99;
          return orderA - orderB;
        });
    },
    enabled: !probLoading,
    staleTime: 30000,
  });

  const loading = metricsLoading || probLoading || breakdownLoading;

  const formatStageName = (stage: string) => {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = pipelineMetrics && pipelineMetrics.prospect_count > 0;

  if (!hasData) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Deal Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">No active deals in pipeline</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/crm">
                <Target className="h-4 w-4 mr-2" />
                Go to CRM
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Deal Pipeline
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Weighted values use stage probability from CRM settings</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-primary">{pipelineMetrics.prospect_count}</div>
            <div className="text-xs text-muted-foreground">Active Deals</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{formatCurrencyCompact(pipelineMetrics.total_pipeline)}</div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-green-500">{formatCurrencyCompact(pipelineMetrics.weighted_pipeline)}</div>
            <div className="text-xs text-muted-foreground">Weighted</div>
          </div>
        </div>

        {stageBreakdown && stageBreakdown.length > 0 && (
          <div className="space-y-1 mb-4">
            {stageBreakdown.slice(0, 4).map(stage => (
              <div key={stage.stage} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatStageName(stage.stage)}</span>
                <span className="font-medium">{stage.count} deals</span>
              </div>
            ))}
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/crm">
            <Target className="h-4 w-4 mr-2" />
            View Pipeline
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
