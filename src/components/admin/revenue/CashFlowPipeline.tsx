import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, TrendingUp, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface PipelineStage {
  status: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  amount: number;
}

interface CashFlowPipelineProps {
  year?: number;
}

export function CashFlowPipeline({ year }: CashFlowPipelineProps) {
  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['cash-flow-pipeline', year],
    queryFn: async () => {
      // Fetch placement fees grouped by cash_flow_status
      let query = supabase
        .from('placement_fees')
        .select('cash_flow_status, fee_amount, expected_collection_date, status, hired_date')
        .neq('status', 'cancelled');

      // Filter by year if provided
      if (year) {
        const startOfYear = `${year}-01-01`;
        const endOfYear = `${year}-12-31`;
        query = query.gte('hired_date', startOfYear).lte('hired_date', endOfYear);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by status
      const statusMap: Record<string, { count: number; amount: number }> = {
        pending: { count: 0, amount: 0 },
        invoiced: { count: 0, amount: 0 },
        partial: { count: 0, amount: 0 },
        collected: { count: 0, amount: 0 },
        written_off: { count: 0, amount: 0 },
      };

      (data || []).forEach((fee) => {
        const status = fee.cash_flow_status || 'pending';
        if (statusMap[status]) {
          statusMap[status].count += 1;
          statusMap[status].amount += Number(fee.fee_amount) || 0;
        }
      });

      return statusMap;
    },
  });
  const { data: commissionLiability } = useQuery({
    queryKey: ['commission-liability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_commissions')
        .select('gross_amount, status')
        .in('status', ['pending', 'approved']);

      if (error) throw error;

      const pending = (data || [])
        .filter((c) => c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.gross_amount) || 0), 0);
      const approved = (data || [])
        .filter((c) => c.status === 'approved')
        .reduce((sum, c) => sum + (Number(c.gross_amount) || 0), 0);

      return { pending, approved, total: pending + approved };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const stages: PipelineStage[] = [
    {
      status: 'pending',
      label: 'Pending',
      icon: <Clock className="h-5 w-5" />,
      color: 'bg-muted text-muted-foreground',
      count: pipelineData?.pending.count || 0,
      amount: pipelineData?.pending.amount || 0,
    },
    {
      status: 'invoiced',
      label: 'Invoiced',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-blue-500/10 text-blue-500',
      count: pipelineData?.invoiced.count || 0,
      amount: pipelineData?.invoiced.amount || 0,
    },
    {
      status: 'partial',
      label: 'Partial Payment',
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'bg-yellow-500/10 text-yellow-500',
      count: pipelineData?.partial.count || 0,
      amount: pipelineData?.partial.amount || 0,
    },
    {
      status: 'collected',
      label: 'Collected',
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'bg-green-500/10 text-green-500',
      count: pipelineData?.collected.count || 0,
      amount: pipelineData?.collected.amount || 0,
    },
    {
      status: 'written_off',
      label: 'Written Off',
      icon: <XCircle className="h-5 w-5" />,
      color: 'bg-destructive/10 text-destructive',
      count: pipelineData?.written_off.count || 0,
      amount: pipelineData?.written_off.amount || 0,
    },
  ];

  const totalAmount = stages.reduce((sum, s) => sum + s.amount, 0);
  const collectedAmount = pipelineData?.collected.amount || 0;
  const collectionRate = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cash Flow Pipeline</h3>
        <Badge variant="outline" className="text-sm">
          {collectionRate.toFixed(1)}% Collection Rate
        </Badge>
      </div>

      {/* Pipeline Stages */}
      <div className="flex items-center gap-2">
        {stages.map((stage, index) => (
          <div key={stage.status} className="flex items-center flex-1">
            <Card className={`flex-1 ${stage.color} border-0`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {stage.icon}
                  <span className="text-sm font-medium">{stage.label}</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(stage.amount)}</div>
                <div className="text-xs opacity-70">{stage.count} fees</div>
              </CardContent>
            </Card>
            {index < stages.length - 1 && (
              <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <Progress value={100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commission Liability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {formatCurrency(commissionLiability?.total || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(commissionLiability?.pending || 0)} pending •{' '}
              {formatCurrency(commissionLiability?.approved || 0)} approved
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Revenue (after commissions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(collectedAmount - (commissionLiability?.total || 0))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on collected fees
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
