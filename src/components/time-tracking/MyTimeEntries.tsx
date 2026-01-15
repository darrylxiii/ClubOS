import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimeTracking, TimeEntryData, formatDuration, secondsToHours } from "@/hooks/useTimeTracking";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, parseISO } from "date-fns";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";
import { EditTimeEntryDialog } from "./EditTimeEntryDialog";

export function MyTimeEntries() {
  const { myEntries, deleteEntry, isLoading } = useTimeTracking();
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [editingEntry, setEditingEntry] = useState<TimeEntryData | null>(null);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  
  // Filter entries for current week
  const weekEntries = myEntries.filter(entry => {
    if (!entry.start_time) return false;
    const entryDate = parseISO(entry.start_time);
    return entryDate >= currentWeekStart && entryDate <= weekEnd;
  });

  // Calculate weekly totals
  const weeklyTotalSeconds = weekEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  const weeklyBillableSeconds = weekEntries
    .filter(e => e.is_billable)
    .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === 
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigator */}
      <Card className="p-4 border border-border/50">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <div className="text-lg font-semibold text-foreground flex items-center gap-2 justify-center">
              <Calendar className="h-4 w-4" />
              {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-4 justify-center mt-1">
              <span className="text-sm text-muted-foreground">
                {secondsToHours(weeklyTotalSeconds).toFixed(1)}h logged
              </span>
              <span className="text-sm text-muted-foreground">
                {secondsToHours(weeklyBillableSeconds).toFixed(1)}h billable
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                Today
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNextWeek}
              disabled={isCurrentWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Entries List */}
      {weekEntries.length === 0 ? (
        <Card className="p-12 text-center border border-border/50">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No time logged this week
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start the timer or add a manual entry to track your work
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {weekEntries.map((entry) => (
            <TimeEntryRow 
              key={entry.id} 
              entry={entry} 
              onEdit={() => setEditingEntry(entry)}
              onDelete={() => deleteEntry.mutate(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditTimeEntryDialog
        entry={editingEntry}
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      />
    </div>
  );
}

interface TimeEntryRowProps {
  entry: TimeEntryData;
  onEdit: () => void;
  onDelete: () => void;
}

function TimeEntryRow({ entry, onEdit, onDelete }: TimeEntryRowProps) {
  const hours = secondsToHours(entry.duration_seconds);
  
  return (
    <Card className="p-4 border border-border/50 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Running indicator */}
            {entry.is_running && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
            
            {/* Project badge */}
            {entry.project && (
              <Badge 
                variant="outline" 
                className="gap-1"
                style={{ borderColor: entry.project.color + '50', backgroundColor: entry.project.color + '10' }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.project.color }}
                />
                {entry.project.name}
              </Badge>
            )}
            
            {/* Time */}
            {entry.start_time && (
              <span className="text-sm text-muted-foreground">
                {format(parseISO(entry.start_time), 'EEE, MMM d')} · 
                {format(parseISO(entry.start_time), 'h:mm a')}
                {entry.end_time && (
                  <> - {format(parseISO(entry.end_time), 'h:mm a')}</>
                )}
              </span>
            )}

            {/* Billable badge */}
            {entry.is_billable && (
              <Badge variant="secondary" className="text-xs">
                Billable
              </Badge>
            )}
          </div>

          <p className="text-sm text-foreground">
            {entry.description || 'No description'}
          </p>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="text-right">
            <div className="text-lg font-bold text-foreground font-mono">
              {entry.is_running ? (
                <span className="text-green-500">Running...</span>
              ) : (
                formatDuration(entry.duration_seconds)
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {hours.toFixed(1)}h
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onEdit}
              title="Edit entry"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
