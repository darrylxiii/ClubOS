import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { motion } from "framer-motion";

interface FunnelStage {
  name: string;
  count: number;
  rate: number;
}

export function InterviewSuccessWidget({ companyId }: { companyId: string }) {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ['interview-funnel', companyId],
    queryFn: async () => {
      // Get all applications for company's jobs
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          id,
          stage,
          job:jobs!inner(company_id)
        `)
        .eq('job.company_id', companyId);

      if (error) throw error;

      const total = applications?.length || 0;
      const stages: Record<string, number> = {
        applied: 0,
        screening: 0,
        interview: 0,
        offer: 0,
        hired: 0
      };

      applications?.forEach(app => {
        const stage = ((app as any).stage)?.toLowerCase() || 'applied';
        if (stages[stage] !== undefined) {
          stages[stage]++;
        } else {
          stages.applied++;
        }
      });

      // Calculate running totals for funnel
      const funnel: FunnelStage[] = [
        { name: 'Applied', count: total, rate: 100 },
        { name: 'Screening', count: stages.screening + stages.interview + stages.offer + stages.hired, rate: 0 },
        { name: 'Interview', count: stages.interview + stages.offer + stages.hired, rate: 0 },
        { name: 'Offer', count: stages.offer + stages.hired, rate: 0 },
        { name: 'Hired', count: stages.hired, rate: 0 }
      ];

      // Calculate conversion rates
      funnel.forEach((stage, i) => {
        if (i > 0) {
          stage.rate = funnel[i - 1].count > 0 
            ? Math.round((stage.count / funnel[i - 1].count) * 100) 
            : 0;
        }
      });

      return {
        funnel,
        total,
        overallConversion: total > 0 ? Math.round((stages.hired / total) * 100) : 0
      };
    }
  });

  const getTrendIcon = (rate: number) => {
    if (rate >= 30) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (rate >= 15) return <Minus className="h-3 w-3 text-amber-500" />;
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Hiring Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Hiring Funnel
          </div>
          <Badge 
            variant="outline" 
            className={`${
              (funnelData?.overallConversion || 0) >= 5 
                ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                : 'bg-muted'
            }`}
          >
            {funnelData?.overallConversion || 0}% hired
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {funnelData?.funnel.map((stage, index) => {
          const widthPercent = funnelData.funnel[0].count > 0
            ? (stage.count / funnelData.funnel[0].count) * 100
            : 0;

          return (
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{stage.count}</span>
                  {index > 0 && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(stage.rate)}
                      <span className="text-xs text-muted-foreground">{stage.rate}%</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`h-full rounded-full ${
                    index === 0 ? 'bg-primary' :
                    index === funnelData.funnel.length - 1 ? 'bg-emerald-500' :
                    'bg-primary/60'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}

        {funnelData?.total === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No applications yet. Post a job to start hiring.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}