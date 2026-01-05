import { AlertTriangle, AlertCircle, Calendar, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConflictResult } from '@/hooks/useCalendarConflictDetection';
import { format } from 'date-fns';

interface ConflictWarningBannerProps {
  conflicts: ConflictResult;
  onDismiss?: () => void;
  onViewConflicts?: () => void;
}

export function ConflictWarningBanner({
  conflicts,
  onDismiss,
  onViewConflicts,
}: ConflictWarningBannerProps) {
  if (!conflicts.hasConflict) return null;

  const isError = conflicts.severity === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;

  return (
    <Alert variant={isError ? 'destructive' : 'default'} className="relative">
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {isError ? 'Scheduling Conflict' : 'Potential Conflict'}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-2">
          {isError
            ? 'This time overlaps with an existing Quantum Club meeting.'
            : 'This time overlaps with events on your external calendar.'}
        </p>
        
        <div className="space-y-1 mb-3">
          {conflicts.conflictingEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-2 text-xs bg-background/50 rounded px-2 py-1"
            >
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="font-medium truncate">{event.title}</span>
              <span className="text-muted-foreground flex-shrink-0">
                {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
              </span>
              {event.is_quantum_club && (
                <span className="text-xs bg-primary/20 text-primary px-1 rounded">TQC</span>
              )}
            </div>
          ))}
          {conflicts.conflictingEvents.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{conflicts.conflictingEvents.length - 3} more conflicts
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {onViewConflicts && (
            <Button size="sm" variant="outline" onClick={onViewConflicts}>
              View Details
            </Button>
          )}
          {!isError && onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Proceed Anyway
            </Button>
          )}
        </div>
      </AlertDescription>

      {onDismiss && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}
