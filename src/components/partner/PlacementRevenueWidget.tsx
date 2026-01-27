import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface PlacementRevenueWidgetProps {
  companyId: string;
}

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }
    
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return count;
}

export function PlacementRevenueWidget({ companyId }: PlacementRevenueWidgetProps) {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['placement-revenue', companyId],
    queryFn: async () => {
      // Get current quarter dates
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
      
      // Get last quarter dates
      const lastQuarterStart = new Date(quarterStart);
      lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3);
      const lastQuarterEnd = new Date(quarterStart);
      lastQuarterEnd.setDate(lastQuarterEnd.getDate() - 1);

      // Fetch company's annual revenue goal
      const { data: companyData } = await supabase
        .from('companies')
        .select('annual_revenue_goal')
        .eq('id', companyId)
        .maybeSingle();

      const annualGoal = (companyData as any)?.annual_revenue_goal || 800000; // Default €800k/year
      const quarterlyGoal = annualGoal / 4; // Convert to quarterly

      // Current quarter revenue
      const { data: currentQuarter } = await (supabase as any)
        .from('placement_fees')
        .select('fee_amount')
        .eq('company_id', companyId)
        .gte('hired_date', quarterStart.toISOString())
        .lte('hired_date', quarterEnd.toISOString());

      // Last quarter revenue
      const { data: lastQuarter } = await (supabase as any)
        .from('placement_fees')
        .select('fee_amount')
        .eq('company_id', companyId)
        .gte('hired_date', lastQuarterStart.toISOString())
        .lte('hired_date', lastQuarterEnd.toISOString());

      const currentTotal = (currentQuarter || []).reduce((sum: number, p: any) => sum + (p.fee_amount || 0), 0);
      const lastTotal = (lastQuarter || []).reduce((sum: number, p: any) => sum + (p.fee_amount || 0), 0);
      const percentChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

      const progressPercent = (currentTotal / quarterlyGoal) * 100;

      return {
        currentQuarter: currentTotal,
        lastQuarter: lastTotal,
        percentChange,
        quarterlyGoal,
        progressPercent,
        placements: (currentQuarter || []).length
      };
    },
    enabled: !!companyId
  });

  const animatedRevenue = useAnimatedCounter(revenueData?.currentQuarter || 0, 1500);
  const isPositive = (revenueData?.percentChange || 0) >= 0;

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-12 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-semibold">Placement Revenue</span>
            </span>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${
                isPositive 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(revenueData?.percentChange || 0).toFixed(0)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-foreground tracking-tight">
              €{animatedRevenue.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">this quarter</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to goal</span>
              <span className="font-medium">
                {Math.min(100, revenueData?.progressPercent || 0).toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={Math.min(100, revenueData?.progressPercent || 0)} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{revenueData?.placements || 0} placements</span>
              <span>Goal: €{(revenueData?.quarterlyGoal || 0).toLocaleString()}</span>
            </div>
          </div>

          {(revenueData?.lastQuarter || 0) > 0 && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                vs. last quarter: €{(revenueData?.lastQuarter || 0).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
