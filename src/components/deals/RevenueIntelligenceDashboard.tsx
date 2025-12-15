import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDealPipeline, useDealStages, usePipelineMetrics } from "@/hooks/useDealPipeline";
import { formatCurrency } from "@/lib/revenueCalculations";
import { TrendingUp, DollarSign, Target, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RevenueIntelligenceDashboard() {
  const { data: deals, isLoading } = useDealPipeline();
  const { data: stages } = useDealStages();
  // Use single source of truth from SQL function
  const { data: metrics, isLoading: metricsLoading } = usePipelineMetrics();

  if (isLoading || metricsLoading) {
    return <div className="text-muted-foreground">Loading revenue intelligence...</div>;
  }

  // Use metrics from SQL source of truth
  const totalPipelineValue = metrics?.total_pipeline || 0;
  const weightedPipelineValue = metrics?.weighted_pipeline || 0;
  const avgDealSize = metrics?.avg_deal_size || 0;

  const dealsWithoutFee = deals?.filter(deal => {
    const companies = deal.companies as any;
    return !companies?.placement_fee_percentage;
  }).length || 0;

  // Calculate Q4 forecast (deals expected to close this quarter)
  const now = new Date();
  const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  
  const q4Forecast = deals?.reduce((sum, deal) => {
    if (!deal.expected_close_date) return sum;
    const closeDate = new Date(deal.expected_close_date);
    if (closeDate <= quarterEnd) {
      const stage = stages?.find(s => s.name === deal.deal_stage);
      const probability = stage?.probability_weight || deal.deal_probability || 0;
      return sum + ((deal.estimated_value || 0) * probability / 100);
    }
    return sum;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              Across {deals?.length || 0} active deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weightedPipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              Probability-adjusted value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quarter Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(q4Forecast)}</div>
            <p className="text-xs text-muted-foreground">
              Expected revenue this quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgDealSize)}</div>
            {dealsWithoutFee > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                <AlertTriangle className="h-3 w-3" />
                {dealsWithoutFee} missing fee
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Stage */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Stage</CardTitle>
          <CardDescription>Pipeline value distribution across deal stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages?.map((stage) => {
              const stageDeals = deals?.filter(d => d.deal_stage === stage.name) || [];
              const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.estimated_value || 0), 0);
              const weightedStageValue = stageValue * (stage.probability_weight / 100);
              const percentage = totalPipelineValue > 0 ? (stageValue / totalPipelineValue) * 100 : 0;

              return (
                <div key={stage.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium">{stage.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {stageDeals.length}
                      </Badge>
                    </div>
                    <div className="text-sm text-right">
                      <div className="font-semibold">{formatCurrency(weightedStageValue)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(stageValue)} total
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
