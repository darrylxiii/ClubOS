import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTimesheets, TimesheetPeriod, TimesheetValidation } from '@/hooks/useTimesheets';
import { format, parseISO } from 'date-fns';
import { 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';

interface TimesheetSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimesheetPeriod;
}

export function TimesheetSubmissionDialog({
  open,
  onOpenChange,
  timesheet,
}: TimesheetSubmissionDialogProps) {
  const { submitTimesheet, validateTimesheet } = useTimesheets();
  const [notes, setNotes] = useState('');
  const [validation, setValidation] = useState<TimesheetValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (open && timesheet) {
      runValidation();
    }
  }, [open, timesheet]);

  const runValidation = async () => {
    setIsValidating(true);
    const result = await validateTimesheet(timesheet.id);
    setValidation(result);
    setIsValidating(false);
  };

  const handleSubmit = async () => {
    await submitTimesheet.mutateAsync({
      timesheetId: timesheet.id,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  const canSubmit = validation?.isValid && !submitTimesheet.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Timesheet</DialogTitle>
          <DialogDescription>
            {format(parseISO(timesheet.start_date), 'MMM d')} - {format(parseISO(timesheet.end_date), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold">{Number(timesheet.total_hours).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{Number(timesheet.billable_hours).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Billable</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{Number(timesheet.overtime_hours).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Overtime</p>
            </div>
          </div>

          {/* Validation */}
          <div className="space-y-3">
            <Label>Pre-Submission Checks</Label>
            
            {isValidating ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : validation ? (
              <div className="space-y-2">
                {validation.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Errors</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      {validation.errors.map((error, i) => (
                        <li key={i} className="text-destructive">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Warnings</span>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.errors.length === 0 && validation.warnings.length === 0 && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">All checks passed</span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Approver (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes or context for your approver..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
          >
            {submitTimesheet.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
