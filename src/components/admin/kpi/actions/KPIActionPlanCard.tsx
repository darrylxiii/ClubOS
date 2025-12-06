import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Play, 
  ArrowUpRight,
  Target,
  Sparkles
} from 'lucide-react';
import { useKPIActions, KPIImprovementAction } from '@/hooks/useKPIOwnership';
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface KPIActionPlanCardProps {
  showOnlyMine?: boolean;
  maxItems?: number;
  compact?: boolean;
}

export function KPIActionPlanCard({ showOnlyMine = false, maxItems = 5, compact = false }: KPIActionPlanCardProps) {
  const { pendingActions, myActions, updateAction } = useKPIActions();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<KPIImprovementAction | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const actions = showOnlyMine ? myActions : pendingActions;
  const displayedActions = actions?.slice(0, maxItems) || [];

  const getStatusColor = (action: KPIImprovementAction) => {
    if (action.status === 'completed') return 'text-emerald-600 bg-emerald-500/10 border-emerald-600/30';
    if (action.status === 'in_progress') return 'text-blue-600 bg-blue-500/10 border-blue-600/30';
    if (action.due_date && isPast(new Date(action.due_date)) && !isToday(new Date(action.due_date))) {
      return 'text-rose-600 bg-rose-500/10 border-rose-600/30';
    }
    return 'text-amber-600 bg-amber-500/10 border-amber-600/30';
  };

  const getStatusIcon = (action: KPIImprovementAction) => {
    if (action.status === 'completed') return <CheckCircle2 className="h-3 w-3" />;
    if (action.status === 'in_progress') return <Play className="h-3 w-3" />;
    if (action.due_date && isPast(new Date(action.due_date))) return <AlertTriangle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getStatusLabel = (action: KPIImprovementAction) => {
    if (action.status === 'completed') return 'Completed';
    if (action.status === 'in_progress') return 'In Progress';
    if (action.due_date && isPast(new Date(action.due_date)) && !isToday(new Date(action.due_date))) {
      return 'Overdue';
    }
    return 'Pending';
  };

  const handleStartAction = (action: KPIImprovementAction) => {
    updateAction({ actionId: action.id, status: 'in_progress' });
  };

  const handleCompleteAction = () => {
    if (!selectedAction) return;
    updateAction({ 
      actionId: selectedAction.id, 
      status: 'completed',
      outcomeNotes: outcomeNotes || undefined 
    });
    setCompleteDialogOpen(false);
    setSelectedAction(null);
    setOutcomeNotes('');
  };

  const openCompleteDialog = (action: KPIImprovementAction) => {
    setSelectedAction(action);
    setCompleteDialogOpen(true);
  };

  if (!displayedActions.length) {
    return (
      <Card className="bg-card/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending action plans</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {displayedActions.map(action => (
          <div
            key={action.id}
            className="flex items-center gap-3 p-2 rounded-lg border bg-background/50"
          >
            <Badge variant="outline" className={`gap-1 ${getStatusColor(action)}`}>
              {getStatusIcon(action)}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{action.kpi_name}</p>
              <p className="text-xs text-muted-foreground truncate">{action.action_description}</p>
            </div>
            {action.due_date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(action.due_date), 'MMM d')}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {showOnlyMine ? 'My Action Plans' : 'Pending Action Plans'}
              </CardTitle>
              <CardDescription>
                {displayedActions.length} action{displayedActions.length !== 1 ? 's' : ''} requiring attention
              </CardDescription>
            </div>
            {actions && actions.length > maxItems && (
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px] pr-4">
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {displayedActions.map((action, index) => {
                  const ownerName = action.owner_profile?.full_name || 'Unassigned';
                  const initials = ownerName.split(' ').map(n => n[0]).join('').slice(0, 2);
                  
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border bg-background/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {action.kpi_name}
                            </Badge>
                            <Badge variant="outline" className={`gap-1 text-xs ${getStatusColor(action)}`}>
                              {getStatusIcon(action)}
                              {getStatusLabel(action)}
                            </Badge>
                          </div>
                          <p className="text-sm">{action.action_description}</p>
                        </div>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={action.owner_profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {action.due_date 
                              ? `Due ${format(new Date(action.due_date), 'MMM d, yyyy')}`
                              : 'No due date'}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {action.action_type}
                          </Badge>
                        </div>
                        <span>
                          Created {formatDistanceToNow(new Date(action.created_at))} ago
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {action.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleStartAction(action)}
                          >
                            <Play className="h-3 w-3" />
                            Start
                          </Button>
                        )}
                        {(action.status === 'pending' || action.status === 'in_progress') && (
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1"
                            onClick={() => openCompleteDialog(action)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Complete Action Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Complete Action Plan
            </DialogTitle>
            <DialogDescription>
              {selectedAction?.kpi_name}: {selectedAction?.action_description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Outcome Notes (Optional)</Label>
              <Textarea
                placeholder="What was the result? What improved?"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteAction} className="gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
