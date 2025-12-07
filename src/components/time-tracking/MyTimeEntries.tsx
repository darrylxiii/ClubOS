import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimeTracking, TimeEntryData } from "@/hooks/useTimeTracking";
import { QuickTimeEntryDialog } from "./QuickTimeEntryDialog";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { 
  Plus, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MyTimeEntries() {
  const { myEntries, deleteEntry, isLoading } = useTimeTracking();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  
  // Filter entries for current week
  const weekEntries = myEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= currentWeekStart && entryDate <= weekEnd;
  });

  // Calculate weekly totals
  const weeklyTotal = weekEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
  const weeklyBillable = weekEntries.reduce((sum, e) => sum + Number(e.billable_hours || 0), 0);

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === 
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const getActivityColor = (level: string | null) => {
    switch (level) {
      case 'high':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Time Entries</h2>
          <p className="text-sm text-muted-foreground">Track and manage your work hours</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Log Time
        </Button>
      </div>

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
                {weeklyTotal.toFixed(1)}h logged
              </span>
              <span className="text-sm text-muted-foreground">
                {weeklyBillable.toFixed(1)}h billable
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
            Start tracking your work hours to see them here
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Log Your First Entry
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {weekEntries.map((entry) => (
            <TimeEntryRow 
              key={entry.id} 
              entry={entry} 
              onDelete={() => deleteEntry.mutate(entry.id)}
              getActivityColor={getActivityColor}
            />
          ))}
        </div>
      )}

      {/* Add Entry Dialog */}
      <QuickTimeEntryDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
    </div>
  );
}

interface TimeEntryRowProps {
  entry: TimeEntryData;
  onDelete: () => void;
  getActivityColor: (level: string | null) => string;
}

function TimeEntryRow({ entry, onDelete, getActivityColor }: TimeEntryRowProps) {
  return (
    <Card className="p-4 border border-border/50 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-foreground">
              {format(new Date(entry.date), 'EEE, MMM d')}
            </span>
            {entry.activity_level && (
              <Badge className={cn("border text-xs capitalize", getActivityColor(entry.activity_level))}>
                {entry.activity_level} activity
              </Badge>
            )}
            {entry.source && entry.source !== 'manual' && (
              <Badge variant="outline" className="text-xs capitalize">
                {entry.source}
              </Badge>
            )}
          </div>

          <p className="text-sm text-foreground line-clamp-2">
            {entry.notes || 'No description'}
          </p>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">
              {Number(entry.hours_worked).toFixed(1)}h
            </div>
            {entry.billable_hours && Number(entry.billable_hours) > 0 && (
              <div className="text-sm text-muted-foreground">
                {Number(entry.billable_hours).toFixed(1)}h billable
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
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
