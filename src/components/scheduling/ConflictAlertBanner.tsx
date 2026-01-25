import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, ChevronRight, Zap, X } from 'lucide-react';
import { useConflictResolution, SchedulingConflict } from '@/hooks/useConflictResolution';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { cn } from '@/lib/utils';

interface ConflictAlertBannerProps {
  className?: string;
  onConflictsChange?: (count: number) => void;
}

export function ConflictAlertBanner({ className, onConflictsChange }: ConflictAlertBannerProps) {
  const { conflicts, fetchConflicts, autoResolve, isResolving } = useConflictResolution();
  const [selectedConflict, setSelectedConflict] = useState<SchedulingConflict | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  useEffect(() => {
    onConflictsChange?.(conflicts.length);
  }, [conflicts.length, onConflictsChange]);

  if (dismissed || conflicts.length === 0) {
    return null;
  }

  const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  const hasCritical = criticalCount > 0;
  const hasError = errorCount > 0;

  const handleOpenConflict = (conflict: SchedulingConflict) => {
    setSelectedConflict(conflict);
    setDialogOpen(true);
  };

  const handleAutoResolve = async () => {
    await autoResolve();
  };

  return (
    <>
      <Alert 
        className={cn(
          "border-l-4",
          hasCritical ? "border-l-red-500 bg-red-500/5" :
          hasError ? "border-l-orange-500 bg-orange-500/5" :
          "border-l-yellow-500 bg-yellow-500/5",
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {hasCritical ? (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            )}
            <div>
              <AlertTitle className="font-semibold">
                {conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''} Detected
              </AlertTitle>
              <AlertDescription className="mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {criticalCount} Critical
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge className="bg-orange-500 text-xs">
                      {errorCount} Error
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 text-xs">
                      {warningCount} Warning
                    </Badge>
                  )}
                </div>

                {/* Quick list of conflicts */}
                <div className="mt-3 space-y-1">
                  {conflicts.slice(0, 3).map((conflict) => (
                    <button
                      key={conflict.id}
                      onClick={() => handleOpenConflict(conflict)}
                      className="flex items-center gap-2 text-sm text-left hover:bg-muted/50 rounded px-2 py-1 -mx-2 w-full transition-colors"
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        conflict.severity === 'critical' && "bg-red-500",
                        conflict.severity === 'error' && "bg-orange-500",
                        conflict.severity === 'warning' && "bg-yellow-500"
                      )} />
                      <span className="truncate flex-1">
                        {conflict.conflict_type.replace(/_/g, ' ')}
                        {conflict.involved_calendar_events[0] && 
                          ` - ${conflict.involved_calendar_events[0].title}`
                        }
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                  {conflicts.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-4">
                      + {conflicts.length - 3} more conflict{conflicts.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </div>
          </div>

          <div className="flex items-start gap-2">
            {warningCount > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleAutoResolve}
                disabled={isResolving}
              >
                <Zap className="h-4 w-4 mr-1" />
                Auto-fix Warnings
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Alert>

      <ConflictResolutionDialog
        conflict={selectedConflict}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onResolved={() => fetchConflicts()}
      />
    </>
  );
}
