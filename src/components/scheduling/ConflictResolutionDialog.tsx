import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Zap,
  RefreshCw,
  ThumbsUp,
  Eye
} from 'lucide-react';
import { SchedulingConflict, ResolutionOption, useConflictResolution } from '@/hooks/useConflictResolution';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConflictResolutionDialogProps {
  conflict: SchedulingConflict | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

const severityConfig = {
  warning: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: AlertTriangle },
  error: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: AlertTriangle },
  critical: { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle }
};

const conflictTypeLabels: Record<string, string> = {
  double_booking: 'Double Booking',
  overlap: 'Schedule Overlap',
  travel_time: 'Insufficient Travel Time',
  timezone_issue: 'Timezone Conflict',
  buffer_violation: 'Buffer Time Violation'
};

export function ConflictResolutionDialog({
  conflict,
  open,
  onOpenChange,
  onResolved
}: ConflictResolutionDialogProps) {
  const { proposeResolutions, resolveConflict, ignoreConflict, isResolving } = useConflictResolution();
  const [solutions, setSolutions] = useState<ResolutionOption[]>([]);
  const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<ResolutionOption | null>(null);

  useEffect(() => {
    if (conflict && open) {
      if (conflict.proposed_solutions && conflict.proposed_solutions.length > 0) {
        setSolutions(conflict.proposed_solutions);
      } else {
        loadSolutions();
      }
    }
  }, [conflict, open]);

  const loadSolutions = async () => {
    if (!conflict) return;
    
    setIsLoadingSolutions(true);
    try {
      const options = await proposeResolutions(conflict);
      setSolutions(options);
    } finally {
      setIsLoadingSolutions(false);
    }
  };

  const handleResolve = async () => {
    if (!conflict || !selectedSolution) return;

    const success = await resolveConflict(conflict.id, selectedSolution);
    if (success) {
      onOpenChange(false);
      onResolved?.();
    }
  };

  const handleIgnore = async () => {
    if (!conflict) return;

    const success = await ignoreConflict(conflict.id);
    if (success) {
      onOpenChange(false);
      onResolved?.();
    }
  };

  if (!conflict) return null;

  const config = severityConfig[conflict.severity];
  const SeverityIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.color)}>
              <SeverityIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {conflictTypeLabels[conflict.conflict_type] || 'Scheduling Conflict'}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={config.color}>
                  {conflict.severity.toUpperCase()}
                </Badge>
                <span>•</span>
                <span>Detected {format(new Date(conflict.created_at), 'MMM d, h:mm a')}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Conflict Timeline */}
          <div className="space-y-4 mb-6">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Conflicting Events
            </h4>
            
            <div className="relative pl-6 border-l-2 border-muted space-y-4">
              {conflict.involved_calendar_events.map((event, index) => (
                <div key={event.id || index} className="relative">
                  <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-primary" />
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.guestName && `with ${event.guestName} • `}
                            {format(new Date(event.start), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.source}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {conflict.involved_bookings.length > 0 && (
                <div className="text-sm text-muted-foreground pl-2">
                  + {conflict.involved_bookings.length} booking(s) involved
                </div>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Resolution Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Resolution Options
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadSolutions}
                disabled={isLoadingSolutions}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoadingSolutions && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {isLoadingSolutions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : solutions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No resolution options available</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={loadSolutions}>
                    Generate Options
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {solutions.map((solution) => (
                  <Card
                    key={solution.option_id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedSolution?.option_id === solution.option_id && "border-primary ring-1 ring-primary"
                    )}
                    onClick={() => setSelectedSolution(solution)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {selectedSolution?.option_id === solution.option_id && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                          {solution.title}
                        </CardTitle>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            solution.action_type === 'accept' && "bg-green-500/10 text-green-600",
                            solution.action_type === 'reschedule' && "bg-blue-500/10 text-blue-600",
                            solution.action_type === 'cancel' && "bg-red-500/10 text-red-600"
                          )}
                        >
                          {solution.action_type}
                        </Badge>
                      </div>
                      <CardDescription>{solution.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span>Disruption</span>
                            <span>{solution.disruption_score}%</span>
                          </div>
                          <Progress 
                            value={solution.disruption_score} 
                            className="h-1.5"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span>Acceptance</span>
                            <span>{solution.acceptance_probability}%</span>
                          </div>
                          <Progress 
                            value={solution.acceptance_probability} 
                            className="h-1.5"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="ghost" onClick={handleIgnore} disabled={isResolving}>
            <Eye className="h-4 w-4 mr-2" />
            Ignore This Time
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={!selectedSolution || isResolving}
            >
              {isResolving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Apply Resolution
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
