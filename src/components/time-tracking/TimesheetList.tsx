import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTimesheets, TimesheetPeriod } from '@/hooks/useTimesheets';
import { format, parseISO } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send, 
  RotateCcw,
  ChevronRight,
  Plus,
  FileText
} from 'lucide-react';
import { TimesheetDetail } from './TimesheetDetail';
import { TimesheetSubmissionDialog } from './TimesheetSubmissionDialog';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  submitted: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400', icon: <Send className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive', icon: <XCircle className="h-3 w-3" /> },
  recalled: { label: 'Recalled', color: 'bg-muted text-muted-foreground', icon: <RotateCcw className="h-3 w-3" /> },
};

export function TimesheetList() {
  const { timesheets, isLoading, generateTimesheet } = useTimesheets();
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetPeriod | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [timesheetToSubmit, setTimesheetToSubmit] = useState<TimesheetPeriod | null>(null);

  const handleSubmit = (timesheet: TimesheetPeriod) => {
    setTimesheetToSubmit(timesheet);
    setShowSubmitDialog(true);
  };

  if (selectedTimesheet) {
    return (
      <TimesheetDetail 
        timesheet={selectedTimesheet} 
        onBack={() => setSelectedTimesheet(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">My Timesheets</h2>
          <p className="text-sm text-muted-foreground">Weekly time tracking summaries</p>
        </div>
        <Button
          onClick={() => generateTimesheet.mutate(new Date())}
          disabled={generateTimesheet.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate This Week
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : timesheets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Timesheets Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate your first weekly timesheet to get started
            </p>
            <Button onClick={() => generateTimesheet.mutate(new Date())}>
              Generate Timesheet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {timesheets.map((timesheet) => {
            const config = statusConfig[timesheet.status] || statusConfig.draft;
            
            return (
              <Card 
                key={timesheet.id}
                className="hover:bg-accent/5 transition-colors cursor-pointer group"
                onClick={() => setSelectedTimesheet(timesheet)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {format(parseISO(timesheet.start_date), 'MMM d')} - {format(parseISO(timesheet.end_date), 'MMM d, yyyy')}
                          </span>
                          <Badge className={`${config.color} gap-1`}>
                            {config.icon}
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {Number(timesheet.total_hours).toFixed(1)}h total
                          </span>
                          <span>{Number(timesheet.billable_hours).toFixed(1)}h billable</span>
                          {Number(timesheet.overtime_hours) > 0 && (
                            <span className="text-amber-400">
                              +{Number(timesheet.overtime_hours).toFixed(1)}h overtime
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {timesheet.status === 'draft' && (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmit(timesheet);
                          }}
                        >
                          <Send className="mr-1 h-3.5 w-3.5" />
                          Submit
                        </Button>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>

                  {timesheet.approver_comment && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                      <span className="font-medium">Approver Note:</span> {timesheet.approver_comment}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {timesheetToSubmit && (
        <TimesheetSubmissionDialog
          open={showSubmitDialog}
          onOpenChange={setShowSubmitDialog}
          timesheet={timesheetToSubmit}
        />
      )}
    </div>
  );
}
