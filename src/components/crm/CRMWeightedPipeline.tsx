import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Target, PieChart, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { PROSPECT_STAGES, type CRMProspect } from '@/types/crm-enterprise';

interface PipelineStageMetrics {
  stage: string;
  label: string;
  count: number;
  totalValue: number;
  weightedValue: number;
  probability: number;
  color: string;
}

interface MonthlyForecast {
  month: string;
  expected: number;
  bestCase: number;
  worstCase: number;
}

export function CRMWeightedPipeline() {
  const [stageMetrics, setStageMetrics] = useState<PipelineStageMetrics[]>([]);
  const [monthlyForecast, setMonthlyForecast] = useState<MonthlyForecast[]>([]);
  const [totals, setTotals] = useState({
    totalPipeline: 0,
    weightedPipeline: 0,
    avgDealSize: 0,
    winRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipelineMetrics();
  }, []);

  const loadPipelineMetrics = async () => {
    try {
      setLoading(true);

      // Fetch all prospects with deal values
      const { data: prospects, error } = await supabase
        .from('crm_prospects')
        .select('stage, deal_value, close_probability, expected_close_date')
        .not('stage', 'in', '(closed_won,closed_lost,unsubscribed)');

      if (error) throw error;

      // Calculate stage metrics
      const stageProbabilities: Record<string, number> = {
        new: 0.05,
        contacted: 0.10,
        opened: 0.15,
        replied: 0.25,
        qualified: 0.40,
        meeting_booked: 0.55,
        proposal_sent: 0.70,
        negotiation: 0.85,
      };

      const stageData: Record<string, { count: number; totalValue: number }> = {};
      
      (prospects || []).forEach((p) => {
        if (!stageData[p.stage]) {
          stageData[p.stage] = { count: 0, totalValue: 0 };
        }
        stageData[p.stage].count++;
        stageData[p.stage].totalValue += p.deal_value || 0;
      });

      const metrics: PipelineStageMetrics[] = PROSPECT_STAGES
        .filter(s => !['closed_won', 'closed_lost', 'unsubscribed', 'nurture'].includes(s.value))
        .map(stage => {
          const data = stageData[stage.value] || { count: 0, totalValue: 0 };
          const probability = stageProbabilities[stage.value] || 0.1;
          return {
            stage: stage.value,
            label: stage.label,
            count: data.count,
            totalValue: data.totalValue,
            weightedValue: data.totalValue * probability,
            probability: probability * 100,
            color: stage.color,
          };
        });

      setStageMetrics(metrics);

      // Calculate totals
      const totalPipeline = metrics.reduce((sum, m) => sum + m.totalValue, 0);
      const weightedPipeline = metrics.reduce((sum, m) => sum + m.weightedValue, 0);
      const totalDeals = metrics.reduce((sum, m) => sum + m.count, 0);

      // Get historical win rate
      const { data: closedWon } = await supabase
        .from('crm_prospects')
        .select('id', { count: 'exact' })
        .eq('stage', 'closed_won');

      const { data: closedLost } = await supabase
        .from('crm_prospects')
        .select('id', { count: 'exact' })
        .eq('stage', 'closed_lost');

      const wonCount = closedWon?.length || 0;
      const lostCount = closedLost?.length || 0;
      const winRate = wonCount + lostCount > 0 
        ? (wonCount / (wonCount + lostCount)) * 100 
        : 0;

      setTotals({
        totalPipeline,
        weightedPipeline,
        avgDealSize: totalDeals > 0 ? totalPipeline / totalDeals : 0,
        winRate,
      });

      // Generate monthly forecast
      const forecast: MonthlyForecast[] = [];
      for (let i = 0; i < 3; i++) {
        const month = addMonths(new Date(), i);
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthProspects = (prospects || []).filter(p => {
          if (!p.expected_close_date) return false;
          const closeDate = new Date(p.expected_close_date);
          return closeDate >= monthStart && closeDate <= monthEnd;
        });

        const expected = monthProspects.reduce((sum, p) => {
          const prob = stageProbabilities[p.stage] || p.close_probability || 0.1;
          return sum + (p.deal_value || 0) * prob;
        }, 0);

        forecast.push({
          month: format(month, 'MMM yyyy'),
          expected,
          bestCase: expected * 1.3,
          worstCase: expected * 0.7,
        });
      }
      setMonthlyForecast(forecast);

    } catch (err) {
      console.error('Error loading pipeline metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Total Pipeline</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.totalPipeline)}</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Target className="w-4 h-4" />
              <span className="text-xs">Weighted Pipeline</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.weightedPipeline)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <PieChart className="w-4 h-4" />
              <span className="text-xs">Avg Deal Size</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.avgDealSize)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {totals.winRate >= 30 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs">Win Rate</span>
            </div>
            <p className="text-2xl font-bold">{totals.winRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline by Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageMetrics.map((stage) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs")}>
                      {stage.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {stage.count} deals
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(stage.totalValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      Weighted: {formatCurrency(stage.weightedValue)} ({stage.probability}%)
                    </p>
                  </div>
                </div>
                <Progress 
                  value={(stage.totalValue / Math.max(totals.totalPipeline, 1)) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {monthlyForecast.map((month) => (
              <div key={month.month} className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm font-medium mb-2">{month.month}</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(month.expected)}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="text-green-500">{formatCurrency(month.bestCase)}</span>
                  <span>-</span>
                  <span className="text-red-500">{formatCurrency(month.worstCase)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
