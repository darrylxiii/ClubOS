import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTimesheets, TimesheetPeriod } from '@/hooks/useTimesheets';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  Send, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { TimesheetSubmissionDialog } from './TimesheetSubmissionDialog';

interface TimeEntryGrouped {
  date: string;
  entries: any[];
  totalHours: number;
  billableHours: number;
}

interface TimesheetDetailProps {
  timesheet: TimesheetPeriod;
  onBack: () => void;
}

export function TimesheetDetail({ timesheet, onBack }: TimesheetDetailProps) {
  const { recallTimesheet } = useTimesheets();
  const [entries, setEntries] = useState<any[]>([]);
  const [groupedEntries, setGroupedEntries] = useState<TimeEntryGrouped[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [timesheet.id]);

  const loadEntries = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('time_entries')
      .select(`
        *,
        tracking_projects(name, color)
      `)
      .eq('timesheet_period_id', timesheet.id)
      .order('start_time');

    if (data) {
      setEntries(data);
      groupEntriesByDate(data);
    }
    setIsLoading(false);
  };

  const groupEntriesByDate = (entriesList: any[]) => {
    const days = eachDayOfInterval({
      start: parseISO(timesheet.start_date),
      end: parseISO(timesheet.end_date),
    });

    const grouped = days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entriesList.filter(
        (e) => format(new Date(e.start_time), 'yyyy-MM-dd') === dayStr
      );
      const totalSeconds = dayEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      const billableSeconds = dayEntries
        .filter((e) => e.is_billable)
        .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

      return {
        date: dayStr,
        entries: dayEntries,
        totalHours: totalSeconds / 3600,
        billableHours: billableSeconds / 3600,
      };
    });

    setGroupedEntries(grouped);
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    submitted: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-destructive/20 text-destructive',
    recalled: 'bg-muted text-muted-foreground',
  };

  const canSubmit = timesheet.status === 'draft' || timesheet.status === 'recalled';
  const canRecall = timesheet.status === 'submitted';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">
                {format(parseISO(timesheet.start_date), 'MMM d')} - {format(parseISO(timesheet.end_date), 'MMM d, yyyy')}
              </h2>
              <Badge className={statusColors[timesheet.status]}>
                {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Weekly timesheet summary
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canRecall && (
            <Button 
              variant="outline" 
              onClick={() => recallTimesheet.mutate(timesheet.id)}
              disabled={recallTimesheet.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Recall
            </Button>
          )}
          {canSubmit && (
            <Button onClick={() => setShowSubmitDialog(true)}>
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{Number(timesheet.total_hours).toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billable Hours</p>
                <p className="text-2xl font-bold">{Number(timesheet.billable_hours).toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Non-Billable</p>
                <p className="text-2xl font-bold">{Number(timesheet.non_billable_hours).toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overtime</p>
                <p className="text-2xl font-bold">{Number(timesheet.overtime_hours).toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Info */}
      {(timesheet.approved_at || timesheet.rejected_at) && (
        <Card className={timesheet.status === 'approved' ? 'border-emerald-500/30' : 'border-destructive/30'}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {timesheet.status === 'approved' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div>
                <p className="font-medium">
                  {timesheet.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                  {format(parseISO(timesheet.approved_at || timesheet.rejected_at!), 'MMM d, yyyy')}
                </p>
                {timesheet.approver_comment && (
                  <p className="text-sm text-muted-foreground mt-1">
                    "{timesheet.approver_comment}"
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedEntries.map((day) => (
                <div 
                  key={day.date}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(parseISO(day.date), 'EEEE, MMMM d')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{day.totalHours.toFixed(1)}h total</span>
                      <span className="text-emerald-400">{day.billableHours.toFixed(1)}h billable</span>
                    </div>
                  </div>

                  {day.entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No entries</p>
                  ) : (
                    <div className="space-y-2">
                      {day.entries.map((entry) => (
                        <div 
                          key={entry.id}
                          className="flex items-center justify-between py-2 px-3 rounded bg-background/50"
                        >
                          <div className="flex items-center gap-3">
                            {entry.tracking_projects?.color && (
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.tracking_projects.color }}
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {entry.description || 'No description'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.tracking_projects?.name || 'No project'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {entry.is_billable && (
                              <Badge variant="outline" className="text-xs">Billable</Badge>
                            )}
                            {entry.is_locked && (
                              <Badge variant="secondary" className="text-xs">Locked</Badge>
                            )}
                            <span className="text-sm font-medium">
                              {((entry.duration_seconds || 0) / 3600).toFixed(1)}h
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TimesheetSubmissionDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        timesheet={timesheet}
      />
    </div>
  );
}
