import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useCRMPipelineMetrics, formatCurrencyCompact } from "@/hooks/useCRMPipelineMetrics";

interface StageCount {
  stage: string;
  count: number;
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  replied: 'bg-cyan-500',
  qualified: 'bg-green-500',
  meeting_booked: 'bg-yellow-500',
  proposal_sent: 'bg-orange-500',
  negotiation: 'bg-purple-500',
  closed_won: 'bg-emerald-500',
  closed_lost: 'bg-red-500',
};

export const CRMProspectsWidget = () => {
  const { data: pipelineMetrics, isLoading: metricsLoading } = useCRMPipelineMetrics();
  
  const { data: stageCounts, isLoading: stageLoading } = useQuery({
    queryKey: ['crm-prospects-by-stage'],
    queryFn: async (): Promise<StageCount[]> => {
      const { data, error } = await supabase
        .from('crm_prospects')
        .select('stage')
        .not('stage', 'in', '("closed_won","closed_lost")');
      
      if (error) {
        console.error('Error fetching prospect stages:', error);
        return [];
      }
      
      // Group by stage
      const counts: Record<string, number> = {};
      (data || []).forEach(p => {
        const stage = p.stage || 'new';
        counts[stage] = (counts[stage] || 0) + 1;
      });
      
      return Object.entries(counts)
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 30000,
  });

  const loading = metricsLoading || stageLoading;

  const formatStageName = (stage: string) => {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = pipelineMetrics && pipelineMetrics.prospect_count > 0;

  if (!hasData) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            CRM Prospects
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Info className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No prospects yet</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/crm">
                Add Prospects
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              CRM Prospects
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/crm">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <div className="text-xl font-bold text-primary">{pipelineMetrics.prospect_count}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <div className="text-xl font-bold">{formatCurrencyCompact(pipelineMetrics.avg_deal_size)}</div>
              <div className="text-xs text-muted-foreground">Avg Deal</div>
            </div>
          </div>

          {/* Stage Breakdown */}
          {stageCounts && stageCounts.length > 0 && (
            <div className="space-y-2">
              {stageCounts.slice(0, 4).map(({ stage, count }) => (
                <div key={stage} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage] || 'bg-gray-500'}`} />
                  <span className="text-sm text-muted-foreground flex-1">{formatStageName(stage)}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
