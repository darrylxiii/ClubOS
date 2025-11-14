import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Award } from "lucide-react";

export function BenchmarkComparison({ companyId }: { companyId: string }) {
  const { data: benchmarks, isLoading } = useQuery({
    queryKey: ['benchmarks', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('partner_benchmarks' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false })
        .limit(4);
      return (data || []) as any[];
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderBenchmark = (benchmark: any) => {
    const difference = benchmark.company_value - benchmark.industry_average;
    const isBelow = difference < 0;
    const percentile = benchmark.industry_percentile || 50;
    const percentDiff = Math.abs(Math.round((difference / benchmark.industry_average) * 100));

    return (
      <div key={benchmark.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div className="space-y-1">
          <div className="text-sm font-medium capitalize">
            {benchmark.metric_type.replace(/_/g, ' ')}
          </div>
          <div className="text-2xl font-bold">
            {Math.round(benchmark.company_value)} days
          </div>
          <div className="text-xs text-muted-foreground">
            Industry avg: {Math.round(benchmark.industry_average)} days
          </div>
        </div>
        <div className="text-right space-y-1">
          <Badge 
            variant={isBelow ? 'default' : 'secondary'} 
            className="gap-1"
          >
            {isBelow ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            {percentDiff}% {isBelow ? 'faster' : 'slower'}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {percentile}th percentile
          </div>
        </div>
      </div>
    );
  };

  if (!benchmarks || benchmarks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Industry Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Benchmark data will appear here once enough hiring activity has been recorded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Industry Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {benchmarks.map(renderBenchmark)}
      </CardContent>
    </Card>
  );
}
