import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCRMDeals } from '@/hooks/useCRMDeals';
import { formatCurrency } from '@/lib/revenueCalculations';

export function CRMRevenueForecast() {
  const { deals, metrics, loading } = useCRMDeals({});



  /* 
    Ideally, we would use a hook like useCRMSettings() here.
    For now, we'll fetch it directly or use a default if the hook doesn't exist yet.
  */
  const [monthlyTarget, setMonthlyTarget] = useState(100000);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await (supabase.from('crm_settings' as any).select('monthly_revenue_target').single() as any);
      if (data?.monthly_revenue_target) {
        setMonthlyTarget(data.monthly_revenue_target);
      }
    }
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const progress = metrics ? (metrics.wonValue / monthlyTarget) * 100 : 0;

  // Forecast calculation
  const daysInMonth = 30;
  const dayOfMonth = new Date().getDate();
  const projectedRevenue = metrics
    ? (metrics.wonValue / dayOfMonth) * daysInMonth
    : 0;

  const forecastVsTarget = ((projectedRevenue / monthlyTarget) * 100) - 100;


  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Revenue Forecast
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            This Month
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Won Revenue
            </div>
            <p className="text-2xl font-bold text-green-500">
              {formatCurrency(metrics?.wonValue || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.wonDeals || 0} deals closed
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Zap className="w-4 h-4" />
              Pipeline Value
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(metrics?.totalValue || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(metrics?.weightedValue || 0)} weighted
            </p>
          </motion.div>
        </div>

        {/* Progress to Target */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress to Target</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(metrics?.wonValue || 0)}</span>
            <span>Target: {formatCurrency(monthlyTarget)}</span>
          </div>
        </div>

        {/* Forecast Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-lg border ${forecastVsTarget >= 0
            ? 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20'
            : 'bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Projected Month-End</p>
              <p className="text-xl font-bold">{formatCurrency(projectedRevenue)}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm ${forecastVsTarget >= 0 ? 'text-green-500' : 'text-orange-500'
              }`}>
              {forecastVsTarget >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {Math.abs(forecastVsTarget).toFixed(1)}% vs target
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
          <div className="text-center">
            <p className="text-lg font-bold">{metrics?.totalDeals || 0}</p>
            <p className="text-xs text-muted-foreground">Open Deals</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{metrics?.winRate?.toFixed(0) || 0}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{formatCurrency(metrics?.avgDealSize || 0).replace('€', '€ ')}</p>
            <p className="text-xs text-muted-foreground">Avg Deal</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
