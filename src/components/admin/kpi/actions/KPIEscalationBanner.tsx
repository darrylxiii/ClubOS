import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, ArrowRight, Clock, X } from 'lucide-react';
import { useKPIActions, KPIImprovementAction } from '@/hooks/useKPIOwnership';
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface KPIEscalationBannerProps {
  onDismiss?: () => void;
}

export function KPIEscalationBanner({ onDismiss }: KPIEscalationBannerProps) {
  const { pendingActions } = useKPIActions();

  // Find critically overdue actions (overdue by more than 2 days)
  const criticalActions = pendingActions?.filter(action => {
    if (!action.due_date) return false;
    const dueDate = new Date(action.due_date);
    return isPast(dueDate) && differenceInDays(new Date(), dueDate) >= 2;
  }) || [];

  if (criticalActions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Alert variant="destructive" className="border-rose-600/50 bg-rose-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>
              {criticalActions.length} Critical Action{criticalActions.length !== 1 ? 's' : ''} Overdue
            </span>
            {onDismiss && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {criticalActions.slice(0, 3).map(action => (
                <div 
                  key={action.id}
                  className="flex items-center justify-between p-2 rounded bg-background/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={action.owner_profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {action.owner_profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{action.kpi_name}</span>
                      <span className="text-muted-foreground"> • </span>
                      <span className="text-sm">{action.action_description.slice(0, 50)}...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-rose-600 border-rose-600/30 gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(action.due_date!))} overdue
                    </Badge>
                    <Button variant="outline" size="sm" className="gap-1">
                      Resolve
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {criticalActions.length > 3 && (
                <p className="text-sm text-muted-foreground text-center pt-1">
                  +{criticalActions.length - 3} more overdue actions
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
