import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export function HealthScoreDashboard({ companyId }: { companyId: string }) {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['health-score', companyId],
    queryFn: async () => {
      // Get latest health score
      const { data: score } = await supabase
        .from('partner_health_scores' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate score if doesn't exist
      if (!score) {
        const { data: calculated } = await supabase.rpc(
          'calculate_company_health_score' as any,
          { p_company_id: companyId }
        );
        return { 
          overall_score: calculated || 50, 
          response_time_score: null,
          pipeline_velocity_score: null,
          conversion_rate_score: null,
          bottleneck_score: null
        };
      }

      return score as any;
    },
    refetchInterval: 300000 // Refresh every 5 min
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-12 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = healthData?.overall_score || 0;
  
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-600 dark:text-green-500';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-destructive';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };

  const getProgressColor = () => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-destructive';
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Hiring Health Score
          </span>
          <Badge variant="outline" className={getScoreColor()}>
            {getScoreLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-4xl font-bold ${getScoreColor()}`}>
              {score}
            </span>
            <span className="text-muted-foreground">/100</span>
          </div>
          <div className="relative">
            <Progress value={score} className="h-3" />
            <div 
              className={`absolute inset-0 h-3 rounded-full ${getProgressColor()} transition-all`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {healthData && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <div className="text-muted-foreground">Response Time</div>
              <div className="font-semibold text-lg">
                {healthData.response_time_score || '-'}/100
              </div>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <div className="text-muted-foreground">Pipeline Velocity</div>
              <div className="font-semibold text-lg">
                {healthData.pipeline_velocity_score || '-'}/100
              </div>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <div className="text-muted-foreground">Conversion Rate</div>
              <div className="font-semibold text-lg">
                {healthData.conversion_rate_score || '-'}/100
              </div>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <div className="text-muted-foreground">Bottleneck Score</div>
              <div className="font-semibold text-lg">
                {healthData.bottleneck_score || '-'}/100
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
