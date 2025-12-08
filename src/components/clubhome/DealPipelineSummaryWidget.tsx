import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface PipelineStats {
  totalValue: number;
  weightedValue: number;
  dealCount: number;
  stageBreakdown: { stage: string; count: number; value: number }[];
}

export const DealPipelineSummaryWidget = () => {
  const [stats, setStats] = useState<PipelineStats>({
    totalValue: 0,
    weightedValue: 0,
    dealCount: 0,
    stageBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelineStats();
  }, []);

  const fetchPipelineStats = async () => {
    try {
      // Fetch jobs with deal stages
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, salary_max, deal_stage')
        .eq('status', 'published');

      if (jobs) {
        // Define default probabilities since deal_stages might not have probability column
        const defaultProbabilities: Record<string, number> = {
          'New': 0.1, 'Qualified': 0.2, 'Proposal': 0.4,
          'Negotiation': 0.6, 'Closed Won': 1.0, 'Closed Lost': 0
        };

        let totalValue = 0;
        let weightedValue = 0;
        const stageBreakdown: Record<string, { count: number; value: number }> = {};

        jobs.forEach(job => {
          const value = job.salary_max || 0;
          const probability = defaultProbabilities[job.deal_stage || 'New'] || 0.1;

          totalValue += value;
          weightedValue += value * probability;

          const stage = job.deal_stage || 'New';
          if (!stageBreakdown[stage]) {
            stageBreakdown[stage] = { count: 0, value: 0 };
          }
          stageBreakdown[stage].count++;
          stageBreakdown[stage].value += value;
        });

        setStats({
          totalValue,
          weightedValue,
          dealCount: jobs.length,
          stageBreakdown: Object.entries(stageBreakdown).map(([stage, data]) => ({
            stage,
            ...data
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching pipeline stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    }
    return `€${value}`;
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

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Deal Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-primary">{stats.dealCount}</div>
            <div className="text-xs text-muted-foreground">Active Deals</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-green-500">{formatCurrency(stats.weightedValue)}</div>
            <div className="text-xs text-muted-foreground">Weighted</div>
          </div>
        </div>

        {stats.stageBreakdown.length > 0 && (
          <div className="space-y-1 mb-4">
            {stats.stageBreakdown.slice(0, 4).map(stage => (
              <div key={stage.stage} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{stage.stage}</span>
                <span className="font-medium">{stage.count} deals</span>
              </div>
            ))}
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/admin/deals-pipeline">
            <Target className="h-4 w-4 mr-2" />
            View Pipeline
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
