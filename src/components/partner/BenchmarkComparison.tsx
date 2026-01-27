import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Award, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface Benchmark {
  id: string;
  metric_type: string;
  company_value: number;
  industry_average: number;
  industry_percentile: number;
  calculated_at: string;
}

export function BenchmarkComparison({ companyId }: { companyId: string }) {
  const { data: benchmarks, isLoading, refetch } = useQuery({
    queryKey: ['benchmarks', companyId],
    queryFn: async () => {
      // First try to calculate fresh benchmarks
      try {
        await supabase.rpc('calculate_partner_benchmarks' as any, {
          p_company_id: companyId
        });
      } catch {
        // Ignore if function doesn't exist yet
      }

      const { data } = await supabase
        .from('partner_benchmarks' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false })
        .limit(4);
      return (data || []) as unknown as Benchmark[];
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const getMetricLabel = (type: string) => {
    switch (type) {
      case 'time_to_hire': return 'Time to Hire';
      case 'offer_rate': return 'Offer Rate';
      case 'interview_rate': return 'Interview Rate';
      case 'response_time': return 'Response Time';
      default: return type.replace(/_/g, ' ');
    }
  };

  const getMetricUnit = (type: string) => {
    switch (type) {
      case 'time_to_hire': return 'days';
      case 'response_time': return 'hours';
      default: return '%';
    }
  };

  const renderBenchmark = (benchmark: Benchmark, index: number) => {
    const difference = benchmark.company_value - benchmark.industry_average;
    const isTimeMetric = benchmark.metric_type.includes('time');
    // For time metrics, lower is better; for rate metrics, higher is better
    const isBetter = isTimeMetric ? difference < 0 : difference > 0;
    const percentile = benchmark.industry_percentile || 50;
    const percentDiff = benchmark.industry_average > 0 
      ? Math.abs(Math.round((difference / benchmark.industry_average) * 100))
      : 0;

    const isTopPerformer = percentile >= 75;

    return (
      <motion.div 
        key={benchmark.id} 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`relative p-4 rounded-lg border transition-all hover:shadow-md ${
          isTopPerformer 
            ? 'border-gold/40 bg-gold/5' 
            : 'border-border/50 bg-muted/30'
        }`}
      >
        {isTopPerformer && (
          <div className="absolute -top-2 -right-2">
            <div className="p-1 rounded-full bg-gold/20 border border-gold/40">
              <Trophy className="h-3 w-3 text-gold" />
            </div>
          </div>
        )}
        
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {getMetricLabel(benchmark.metric_type)}
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {Math.round(benchmark.company_value)}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {getMetricUnit(benchmark.metric_type)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              vs. {Math.round(benchmark.industry_average)} avg
            </div>
          </div>
          
          <div className="text-right space-y-1">
            <Badge 
              variant="outline"
              className={`gap-1 ${
                isBetter 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}
            >
              {isBetter ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {percentDiff}% {isBetter ? 'better' : 'behind'}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {percentile}th percentile
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-gold" />
            Industry Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:border-gold/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-gold/10">
              <Award className="h-4 w-4 text-gold" />
            </div>
            Industry Benchmarks
          </div>
          {benchmarks && benchmarks.length > 0 && (
            <Badge variant="outline" className="text-xs">
              Updated today
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!benchmarks || benchmarks.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Award className="h-8 w-8 mx-auto text-gold/40" />
            <p className="text-sm text-muted-foreground">
              Complete more hiring cycles to unlock benchmark comparisons
            </p>
          </div>
        ) : (
          benchmarks.map((benchmark, index) => renderBenchmark(benchmark, index))
        )}
      </CardContent>
    </Card>
  );
}