import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { ConflictResult } from '@/hooks/useCalendarConflictDetection';
import { format } from 'date-fns';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictResult;
  proposedStart: Date;
  proposedEnd: Date;
  onProceed: () => void;
  onReschedule: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  proposedStart,
  proposedEnd,
  onProceed,
  onReschedule,
}: ConflictResolutionDialogProps) {
  const isError = conflicts.severity === 'error';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isError ? 'Scheduling Conflict Detected' : 'Calendar Conflicts Found'}
          </DialogTitle>
          <DialogDescription>
            Your proposed meeting time overlaps with existing events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-1">Proposed Time</p>
            <p className="text-sm text-muted-foreground">
              {format(proposedStart, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-sm">
              {format(proposedStart, 'HH:mm')} - {format(proposedEnd, 'HH:mm')}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">
              Conflicting Events ({conflicts.conflictingEvents.length})
            </p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {conflicts.conflictingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-background border rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.is_quantum_club && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          TQC Meeting
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                      </span>
                      
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.attendees.length} attendees
                        </span>
                      )}
                    </div>

                    {event.source !== 'quantum_club' && (
                      <p className="text-xs text-muted-foreground">
                        From: {event.calendar_label || event.source}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onReschedule} className="w-full sm:w-auto">
            Choose Different Time
          </Button>
          {!isError && (
            <Button onClick={onProceed} className="w-full sm:w-auto">
              Schedule Anyway
            </Button>
          )}
          {isError && (
            <Button variant="secondary" disabled className="w-full sm:w-auto">
              Cannot Double-Book TQC Meeting
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
