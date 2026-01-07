import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/hooks/useEmployeePipelineValue';

interface PotentialEarningsCardProps {
  weightedValue: number;
  rawValue: number;
  realizedRevenue: number;
  isLoading?: boolean;
}

export function PotentialEarningsCard({ 
  weightedValue, 
  rawValue, 
  realizedRevenue,
  isLoading 
}: PotentialEarningsCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="h-4 w-4" />
          Potential Pipeline Value
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <p className="text-4xl font-bold text-foreground">
            {formatCurrency(weightedValue)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Weighted by stage probability
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs">Raw Pipeline</span>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(rawValue)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Realized</span>
            </div>
            <p className="text-lg font-semibold text-green-500">{formatCurrency(realizedRevenue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
