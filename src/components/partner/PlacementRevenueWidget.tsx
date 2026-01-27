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

      const currentTotal = (currentQuarter || []).reduce((sum, p) => sum + (p.fee_amount || 0), 0);
      const lastTotal = (lastQuarter || []).reduce((sum, p) => sum + (p.fee_amount || 0), 0);
      const percentChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

      // Quarterly goal (mock - would come from company settings)
      const quarterlyGoal = 200000;
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
      <Card className="border-2 border-gold/30 bg-gradient-to-br from-card via-card to-gold/5">
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
      <Card className="border-2 border-gold/30 bg-gradient-to-br from-card via-card to-gold/5 overflow-hidden relative">
        {/* Gold accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/50 via-gold to-gold/50" />
        
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gold/20">
                <DollarSign className="h-5 w-5 text-gold" />
              </div>
              <span className="text-lg font-semibold">Placement Revenue</span>
            </span>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${
                isPositive 
                  ? 'border-success/50 text-success bg-success/10' 
                  : 'border-destructive/50 text-destructive bg-destructive/10'
              }`}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(revenueData?.percentChange || 0).toFixed(0)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gold tracking-tight">
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
            <div className="relative">
              <Progress 
                value={Math.min(100, revenueData?.progressPercent || 0)} 
                className="h-3 bg-gold/20"
              />
              <div 
                className="absolute inset-0 h-3 rounded-full bg-gradient-to-r from-gold/80 to-gold transition-all"
                style={{ width: `${Math.min(100, revenueData?.progressPercent || 0)}%` }}
              />
            </div>
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