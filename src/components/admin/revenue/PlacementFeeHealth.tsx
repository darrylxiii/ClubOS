import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileWarning, 
  TrendingDown,
  RefreshCw 
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { differenceInDays } from 'date-fns';

interface HealthMetric {
  label: string;
  value: number | string;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

export function PlacementFeeHealth() {
  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['placement-fee-health'],
    queryFn: async () => {
      // Fetch placement fees with related data
      const { data: fees, error } = await supabase
        .from('placement_fees')
        .select(`
          id, fee_amount, status, cash_flow_status, 
          created_at, expected_collection_date, variance_amount,
          invoice_id
        `);

      if (error) throw error;
      const typedFees = (fees || []) as { id: string; fee_amount: number; status: string; cash_flow_status: string | null; created_at: string; expected_collection_date: string | null; variance_amount: number | null; invoice_id: string | null }[];

      // Fetch hired applications count
      const { count: hiredCount } = await supabase
        .from('applications')
        .select('id', { count: 'exact' })
        .eq('status', 'hired');

      // Calculate metrics
      const totalFees = fees?.length || 0;
      const totalAmount = fees?.reduce((sum, f) => sum + (Number(f.fee_amount) || 0), 0) || 0;
      
      const invoicedFees = fees?.filter(f => f.invoice_id) || [];
      const invoicedAmount = invoicedFees.reduce((sum, f) => sum + (Number(f.fee_amount) || 0), 0);
      
      const uninvoicedFees = fees?.filter(f => !f.invoice_id && f.status !== 'cancelled') || [];
      const uninvoicedAmount = uninvoicedFees.reduce((sum, f) => sum + (Number(f.fee_amount) || 0), 0);
      
      const varianceFees = fees?.filter(f => Math.abs(Number(f.variance_amount) || 0) > 0) || [];
      const totalVariance = varianceFees.reduce((sum, f) => sum + Math.abs(Number(f.variance_amount) || 0), 0);

      // Aging analysis
      const now = new Date();
      const overdueCount = fees?.filter(f => {
        if (!f.expected_collection_date || f.cash_flow_status === 'collected') return false;
        return differenceInDays(now, new Date(f.expected_collection_date)) > 0;
      }).length || 0;

      const agingBuckets = {
        current: 0,
        days30: 0,
        days60: 0,
        days90Plus: 0,
      };

      fees?.forEach(f => {
        if (f.cash_flow_status === 'collected' || !f.created_at) return;
        const age = differenceInDays(now, new Date(f.created_at));
        const amount = Number(f.fee_amount) || 0;
        
        if (age <= 30) agingBuckets.current += amount;
        else if (age <= 60) agingBuckets.days30 += amount;
        else if (age <= 90) agingBuckets.days60 += amount;
        else agingBuckets.days90Plus += amount;
      });

      // Coverage ratio
      const coverageRatio = hiredCount ? (totalFees / hiredCount) * 100 : 0;

      return {
        totalFees,
        totalAmount,
        invoicedAmount,
        uninvoicedAmount,
        uninvoicedCount: uninvoicedFees.length,
        varianceCount: varianceFees.length,
        totalVariance,
        overdueCount,
        agingBuckets,
        coverageRatio,
        hiredCount: hiredCount || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const metrics: HealthMetric[] = [
    {
      label: 'Fee Coverage',
      value: `${healthData?.coverageRatio.toFixed(0)}%`,
      status: (healthData?.coverageRatio || 0) >= 95 ? 'good' : (healthData?.coverageRatio || 0) >= 80 ? 'warning' : 'critical',
      description: `${healthData?.totalFees} fees for ${healthData?.hiredCount} hires`,
    },
    {
      label: 'Uninvoiced Amount',
      value: formatCurrency(healthData?.uninvoicedAmount || 0),
      status: (healthData?.uninvoicedCount || 0) === 0 ? 'good' : (healthData?.uninvoicedCount || 0) <= 5 ? 'warning' : 'critical',
      description: `${healthData?.uninvoicedCount} fees pending invoice`,
    },
    {
      label: 'Variance Issues',
      value: healthData?.varianceCount || 0,
      status: (healthData?.varianceCount || 0) === 0 ? 'good' : (healthData?.varianceCount || 0) <= 3 ? 'warning' : 'critical',
      description: `${formatCurrency(healthData?.totalVariance || 0)} total variance`,
    },
    {
      label: 'Overdue Payments',
      value: healthData?.overdueCount || 0,
      status: (healthData?.overdueCount || 0) === 0 ? 'good' : (healthData?.overdueCount || 0) <= 2 ? 'warning' : 'critical',
      description: 'Past expected collection date',
    },
  ];

  const getStatusIcon = (status: HealthMetric['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <FileWarning className="h-5 w-5 text-destructive" />;
    }
  };

  const overallHealth = metrics.every(m => m.status === 'good') 
    ? 'good' 
    : metrics.some(m => m.status === 'critical') 
    ? 'critical' 
    : 'warning';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Placement Fee Health</h3>
          <Badge 
            variant={overallHealth === 'good' ? 'default' : overallHealth === 'warning' ? 'secondary' : 'destructive'}
          >
            {overallHealth === 'good' ? 'Healthy' : overallHealth === 'warning' ? 'Attention Needed' : 'Issues Detected'}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className={
            metric.status === 'critical' ? 'border-destructive/50' : 
            metric.status === 'warning' ? 'border-yellow-500/50' : ''
          }>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                {getStatusIcon(metric.status)}
              </div>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{metric.description}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aging Report */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Aging Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <div className="text-sm text-muted-foreground">Current (0-30 days)</div>
              <div className="text-xl font-bold text-green-500">
                {formatCurrency(healthData?.agingBuckets.current || 0)}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <div className="text-sm text-muted-foreground">31-60 days</div>
              <div className="text-xl font-bold text-yellow-500">
                {formatCurrency(healthData?.agingBuckets.days30 || 0)}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-500/10">
              <div className="text-sm text-muted-foreground">61-90 days</div>
              <div className="text-xl font-bold text-orange-500">
                {formatCurrency(healthData?.agingBuckets.days60 || 0)}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-sm text-muted-foreground">90+ days</div>
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(healthData?.agingBuckets.days90Plus || 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {overallHealth !== 'good' && (
        <Alert variant={overallHealth === 'critical' ? 'destructive' : 'default'}>
          <TrendingDown className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {metrics.filter(m => m.status !== 'good').map(m => m.label).join(', ')} need attention.
            Review and resolve these issues to maintain financial health.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
