import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function HealthScoreDashboard({ companyId }: { companyId: string }) {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['health-score', companyId],
    queryFn: async () => {
      // Get latest health score
      const { data: score } = await supabase
        .from('partner_health_scores' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate score if doesn't exist
      if (!score) {
        const { data: calculated } = await supabase.rpc(
          'calculate_company_health_score' as any,
          { p_company_id: companyId }
        );
        return { 
          overall_score: calculated || 50, 
          response_time_score: null,
          pipeline_velocity_score: null,
          conversion_rate_score: null,
          bottleneck_score: null
        };
      }

      return score as any;
    },
    refetchInterval: 300000 // Refresh every 5 min
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Hiring Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-14 bg-muted rounded" />
              <div className="h-14 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = healthData?.overall_score || 0;
  
  const getScoreStyle = () => {
    if (score >= 80) return { 
      color: 'text-gold', 
      bg: 'bg-gold/10', 
      border: 'border-gold/30',
      progress: '[&>div]:bg-gold'
    };
    if (score >= 60) return { 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10', 
      border: 'border-emerald-500/30',
      progress: '[&>div]:bg-emerald-500'
    };
    if (score >= 40) return { 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/30',
      progress: '[&>div]:bg-amber-500'
    };
    return { 
      color: 'text-destructive', 
      bg: 'bg-destructive/10', 
      border: 'border-destructive/30',
      progress: '[&>div]:bg-destructive'
    };
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };

  const style = getScoreStyle();

  const subScores = [
    { 
      label: 'Response', 
      value: healthData?.response_time_score,
      icon: Clock 
    },
    { 
      label: 'Velocity', 
      value: healthData?.pipeline_velocity_score,
      icon: Zap 
    },
    { 
      label: 'Conversion', 
      value: healthData?.conversion_rate_score,
      icon: TrendingUp 
    },
    { 
      label: 'Bottlenecks', 
      value: healthData?.bottleneck_score,
      icon: AlertTriangle 
    },
  ];

  return (
    <Card className={`glass-card ${style.border} group hover:shadow-lg transition-all duration-300`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className={`p-1.5 rounded-lg ${style.bg}`}>
              <Activity className={`h-4 w-4 ${style.color}`} />
            </div>
            Hiring Health
          </div>
          <Badge variant="outline" className={`${style.bg} ${style.color} ${style.border}`}>
            {getScoreLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-2"
        >
          <div className={`text-5xl font-bold ${style.color} tabular-nums`}>
            {score}
            <span className="text-lg font-normal text-muted-foreground">/100</span>
          </div>
          <Progress 
            value={score} 
            className={`h-2 mt-3 ${style.progress}`}
          />
        </motion.div>

        {/* Sub-scores Grid */}
        <div className="grid grid-cols-2 gap-2">
          {subScores.map((sub, index) => {
            const Icon = sub.icon;
            const subValue = sub.value ?? 0;
            const subStyle = subValue >= 70 
              ? 'text-emerald-500' 
              : subValue >= 40 
                ? 'text-amber-500' 
                : 'text-destructive';
            
            return (
              <motion.div
                key={sub.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-2.5 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Icon className="h-3 w-3" />
                  {sub.label}
                </div>
                <div className={`font-semibold text-lg ${sub.value !== null ? subStyle : 'text-muted-foreground'}`}>
                  {sub.value !== null ? sub.value : '-'}
                  <span className="text-xs font-normal text-muted-foreground">/100</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}