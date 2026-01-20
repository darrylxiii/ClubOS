import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTimesheets, TimesheetPeriod } from '@/hooks/useTimesheets';
import { format, parseISO, differenceInDays } from 'date-fns';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User,
  Search,
  AlertTriangle,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { ApprovalActionDialog } from './ApprovalActionDialog';

export function ApprovalDashboard() {
  const { pendingApprovals, isLoadingApprovals } = useTimesheets();
  const [search, setSearch] = useState('');
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetPeriod | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [showActionDialog, setShowActionDialog] = useState(false);

  const filteredApprovals = pendingApprovals.filter((ts) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ts.user_name?.toLowerCase().includes(searchLower) ||
      ts.user_email?.toLowerCase().includes(searchLower)
    );
  });

  const getUrgencyBadge = (timesheet: TimesheetPeriod) => {
    if (!timesheet.submitted_at) return null;
    const daysWaiting = differenceInDays(new Date(), parseISO(timesheet.submitted_at));
    
    if (daysWaiting >= 5) {
      return <Badge className="bg-destructive/20 text-destructive">Urgent</Badge>;
    } else if (daysWaiting >= 3) {
      return <Badge className="bg-amber-500/20 text-amber-400">Pending 3+ days</Badge>;
    }
    return null;
  };

  const handleAction = (timesheet: TimesheetPeriod, action: 'approve' | 'reject') => {
    setSelectedTimesheet(timesheet);
    setActionType(action);
    setShowActionDialog(true);
  };

  // Red flags detection
  const getRedFlags = (timesheet: TimesheetPeriod) => {
    const flags: string[] = [];
    if (Number(timesheet.overtime_hours) > 10) {
      flags.push('Excessive overtime');
    }
    if (Number(timesheet.total_hours) < 20 && Number(timesheet.total_hours) > 0) {
      flags.push('Low hours');
    }
    if (Number(timesheet.total_hours) > 60) {
      flags.push('Very high hours');
    }
    return flags;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Timesheet Approvals</h2>
          <p className="text-sm text-muted-foreground">
            {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Pending Approvals */}
      {isLoadingApprovals ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
            <h3 className="text-lg font-medium">All Caught Up</h3>
            <p className="text-sm text-muted-foreground">
              No timesheets pending approval
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((timesheet) => {
            const redFlags = getRedFlags(timesheet);
            const urgencyBadge = getUrgencyBadge(timesheet);
            
            return (
              <Card key={timesheet.id} className="hover:bg-accent/5 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{timesheet.user_name || 'Unknown User'}</span>
                          {urgencyBadge}
                          {redFlags.map((flag, i) => (
                            <Badge key={i} variant="outline" className="text-amber-400 border-amber-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {flag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{timesheet.user_email}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(timesheet.start_date), 'MMM d')} - {format(parseISO(timesheet.end_date), 'MMM d')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {Number(timesheet.total_hours).toFixed(1)}h
                          </span>
                          <span className="text-emerald-400">
                            {Number(timesheet.billable_hours).toFixed(1)}h billable
                          </span>
                        </div>

                        {timesheet.user_notes && (
                          <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                            <span className="text-muted-foreground">Note:</span> {timesheet.user_notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleAction(timesheet, 'reject')}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleAction(timesheet, 'approve')}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedTimesheet && (
        <ApprovalActionDialog
          open={showActionDialog}
          onOpenChange={setShowActionDialog}
          timesheet={selectedTimesheet}
          action={actionType}
        />
      )}
    </div>
  );
}
