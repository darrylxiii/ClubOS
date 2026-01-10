import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle2, XCircle, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCheckRewardSafety, useFinancialHealth, SafetyCheckResult } from '@/hooks/useRewardSafety';

interface CFOSafetyGuardProps {
  estimatedCost: number;
  className?: string;
}

export function CFOSafetyGuard({ estimatedCost, className }: CFOSafetyGuardProps) {
  const { data: financialHealth } = useFinancialHealth();
  const checkRewardSafety = useCheckRewardSafety();
  const safetyResult = checkRewardSafety.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusConfig = (result?: SafetyCheckResult) => {
    if (!result) return { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pending' };
    
    if (result.errors && result.errors.length > 0) {
      return { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Blocked' };
    }
    if (result.warnings && result.warnings.length > 0) {
      return { color: 'text-warning', bg: 'bg-warning/10', label: 'Caution' };
    }
    return { color: 'text-success', bg: 'bg-success/10', label: 'Approved' };
  };

  const statusConfig = getStatusConfig(safetyResult);

  return (
    <Card variant="elevated" className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-xl", statusConfig.bg)}>
            <Shield className={cn("h-6 w-6", statusConfig.color)} />
          </div>
          <div>
            <h3 className="text-heading-sm font-semibold">CFO Safety Check</h3>
            <p className="text-label-sm text-muted-foreground">
              Financial impact analysis
            </p>
          </div>
        </div>
        <Badge className={cn("capitalize", statusConfig.bg, statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Financial Health Overview */}
      {financialHealth && (
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-card/50 border border-border/30 space-y-2"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-label-sm">Cash Position</span>
            </div>
            <p className="text-heading-md font-bold">
              {formatCurrency(financialHealth.currentCash)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-card/50 border border-border/30 space-y-2"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              <span className="text-label-sm">Monthly Burn</span>
            </div>
            <p className="text-heading-md font-bold">
              {formatCurrency(financialHealth.monthlyBurn)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-card/50 border border-border/30 space-y-2"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-label-sm">Runway</span>
            </div>
            <p className={cn(
              "text-heading-md font-bold",
              financialHealth.runwayMonths < 6 ? "text-destructive" :
              financialHealth.runwayMonths < 12 ? "text-warning" : "text-success"
            )}>
              {financialHealth.runwayMonths.toFixed(1)} months
            </p>
          </motion.div>
        </div>
      )}

      {/* Reward Impact */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/30">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-muted-foreground">Proposed Reward</span>
          <span className="text-heading-sm font-bold">{formatCurrency(estimatedCost)}</span>
        </div>
        
        {financialHealth && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-label-sm">
                <span className="text-muted-foreground">% of Cash Position</span>
                <span className={cn(
                  "font-medium",
                  (estimatedCost / financialHealth.currentCash) * 100 > 15 ? "text-warning" : "text-success"
                )}>
                  {((estimatedCost / financialHealth.currentCash) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(100, (estimatedCost / financialHealth.currentCash) * 100)} 
                className="h-2"
              />
            </div>

            <div className="flex items-center justify-between text-label-sm">
              <span className="text-muted-foreground">Runway Impact</span>
              <span className="font-medium">
                -{(estimatedCost / financialHealth.monthlyBurn).toFixed(1)} months
              </span>
            </div>

            <div className="flex items-center justify-between text-label-sm">
              <span className="text-muted-foreground">New Runway After Reward</span>
              <span className={cn(
                "font-medium",
                (financialHealth.currentCash - estimatedCost) / financialHealth.monthlyBurn < 6 
                  ? "text-destructive" : "text-success"
              )}>
                {((financialHealth.currentCash - estimatedCost) / financialHealth.monthlyBurn).toFixed(1)} months
              </span>
            </div>
          </>
        )}
      </div>

      {/* Safety Check Results */}
      {safetyResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {/* Errors */}
          {safetyResult.errors?.map((error, index) => (
            <div
              key={`error-${index}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <span className="text-body-sm text-destructive">{error}</span>
            </div>
          ))}

          {/* Warnings */}
          {safetyResult.warnings?.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20"
            >
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <span className="text-body-sm text-warning-foreground">{warning}</span>
            </div>
          ))}

          {/* All Clear */}
          {!safetyResult.errors?.length && !safetyResult.warnings?.length && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-body-sm text-success">
                All safety checks passed. This reward is within financial guidelines.
              </span>
            </div>
          )}
        </motion.div>
      )}
    </Card>
  );
}
