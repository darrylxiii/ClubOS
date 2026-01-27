import { useSLATracking } from "@/hooks/usePartnerAnalytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle, CheckCircle, Shield, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export function SLATracker({ companyId }: { companyId: string }) {
  const { data: slaItems, isLoading } = useSLATracking(companyId);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            SLA Commitments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = (slaItems || []) as any[];
  const urgentItems = items.filter(item => {
    const deadline = new Date(item.sla_deadline);
    const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursRemaining <= 24 && hoursRemaining > 0;
  });

  const overdue = items.filter(item => {
    const deadline = new Date(item.sla_deadline);
    return deadline.getTime() < Date.now();
  });

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            SLA Commitments
          </div>
          <div className="flex items-center gap-1.5">
            {overdue.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                <AlertCircle className="h-3 w-3" />
                {overdue.length}
              </Badge>
            )}
            {urgentItems.length > 0 && (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 text-xs">
                <Timer className="h-3 w-3 mr-1" />
                {urgentItems.length}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(!items || items.length === 0) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5"
          >
            <div className="p-2 rounded-full bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">All SLAs Met</p>
              <p className="text-sm text-muted-foreground">No pending commitments</p>
            </div>
          </motion.div>
        )}

        {items.map((item: any, index: number) => {
          const deadline = new Date(item.sla_deadline);
          const totalTime = deadline.getTime() - new Date(item.created_at).getTime();
          const elapsed = Date.now() - new Date(item.created_at).getTime();
          const progress = Math.min(100, (elapsed / totalTime) * 100);
          const isOverdue = deadline.getTime() < Date.now();
          const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);

          const getStyle = () => {
            if (isOverdue) return {
              border: 'border-destructive/40',
              bg: 'bg-destructive/5',
              progress: '[&>div]:bg-destructive',
              icon: 'text-destructive'
            };
            if (hoursRemaining <= 24) return {
              border: 'border-amber-500/40',
              bg: 'bg-amber-500/5',
              progress: '[&>div]:bg-amber-500',
              icon: 'text-amber-500'
            };
            return {
              border: 'border-border/50',
              bg: 'bg-muted/30',
              progress: '[&>div]:bg-primary',
              icon: 'text-muted-foreground'
            };
          };

          const style = getStyle();

          return (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border ${style.border} ${style.bg} transition-all hover:shadow-sm`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm capitalize truncate">
                    {item.event_type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isOverdue 
                      ? `Overdue by ${formatDistanceToNow(deadline)}`
                      : `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`
                    }
                  </div>
                </div>
                {isOverdue ? (
                  <AlertCircle className={`h-4 w-4 flex-shrink-0 ${style.icon}`} />
                ) : (
                  <Clock className={`h-4 w-4 flex-shrink-0 ${style.icon}`} />
                )}
              </div>
              <Progress 
                value={progress} 
                className={`h-1.5 ${style.progress}`}
              />
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}