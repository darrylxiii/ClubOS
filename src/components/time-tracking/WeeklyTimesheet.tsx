import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TimeEntryCard } from "./TimeEntryCard";
import { TimeEntry } from "@/types/projects";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  Send
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";

interface WeeklyTimesheetProps {
  entries: TimeEntry[];
  view: 'freelancer' | 'client';
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
  onEditEntry?: (entryId: string) => void;
  onDeleteEntry?: (entryId: string) => void;
  onApproveEntry?: (entryId: string) => void;
  onDisputeEntry?: (entryId: string) => void;
  onSubmitTimesheet?: () => void;
}

export function WeeklyTimesheet({
  entries,
  view,
  currentWeekStart,
  onWeekChange,
  onEditEntry,
  onDeleteEntry,
  onApproveEntry,
  onDisputeEntry,
  onSubmitTimesheet
}: WeeklyTimesheetProps) {
  
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  
  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours_worked), 0);
  const totalEarnings = entries.reduce((sum, e) => sum + Number(e.total_amount), 0);
  const billableHours = entries.filter(e => e.is_billable).reduce((sum, e) => sum + Number(e.hours_worked), 0);
  const approvedHours = entries.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.hours_worked), 0);
  const pendingEntries = entries.filter(e => e.status === 'pending');
  const approvedEntries = entries.filter(e => e.status === 'approved');
  const disputedEntries = entries.filter(e => e.status === 'disputed');

  const approvalRate = entries.length > 0 ? (approvedHours / totalHours) * 100 : 0;

  const goToPreviousWeek = () => {
    onWeekChange(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    onWeekChange(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Week Navigator */}
      <Card className="p-4 border border-border/50">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={goToPreviousWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <div className="text-lg font-semibold text-foreground flex items-center gap-2 justify-center">
              <Calendar className="h-4 w-4" />
              {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Week {format(currentWeekStart, 'w')}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToCurrentWeek}
              >
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

      {/* Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Hours</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {totalHours.toFixed(1)}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {billableHours.toFixed(1)}h billable
          </div>
        </Card>

        <Card className="p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Earnings</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            €{totalEarnings.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            This week
          </div>
        </Card>

        <Card className="p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Approval Rate</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {approvalRate.toFixed(0)}%
          </div>
          <Progress value={approvalRate} className="h-1 mt-2" />
        </Card>

        <Card className="p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Status</span>
          </div>
          <div className="space-y-1">
            {pendingEntries.length > 0 && (
              <Badge variant="outline" className="border-yellow-500/20 text-xs">
                {pendingEntries.length} pending
              </Badge>
            )}
            {approvedEntries.length > 0 && (
              <Badge variant="outline" className="border-green-500/20 text-xs ml-1">
                {approvedEntries.length} approved
              </Badge>
            )}
            {disputedEntries.length > 0 && (
              <Badge variant="outline" className="border-red-500/20 text-xs ml-1">
                {disputedEntries.length} disputed
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Submit Timesheet (Freelancer view, if pending entries) */}
      {view === 'freelancer' && pendingEntries.length > 0 && (
        <Card className="p-4 border border-border/50 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground mb-1">
                Ready to submit timesheet?
              </div>
              <div className="text-sm text-muted-foreground">
                {pendingEntries.length} entries totaling {pendingEntries.reduce((sum, e) => sum + Number(e.hours_worked), 0).toFixed(1)}h will be sent for client approval
              </div>
            </div>
            <Button onClick={onSubmitTimesheet}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          </div>
        </Card>
      )}

      {/* Time Entries */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Time Entries ({entries.length})
        </h3>
        
        {entries.length === 0 ? (
          <Card className="p-12 text-center border border-border/50">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2">
              No time entries this week
            </h4>
            <p className="text-sm text-muted-foreground">
              {view === 'freelancer' 
                ? 'Start tracking your time or add manual entries to build your timesheet'
                : 'No time has been logged by the freelancer this week'
              }
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map((entry) => (
              <TimeEntryCard
                key={entry.id}
                entry={entry}
                view={view}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
                onApprove={onApproveEntry}
                onDispute={onDisputeEntry}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
