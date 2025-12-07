import { useState } from 'react';
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
import { useTimesheets, TimesheetPeriod } from '@/hooks/useTimesheets';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ApprovalActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimesheetPeriod;
  action: 'approve' | 'reject';
}

export function ApprovalActionDialog({
  open,
  onOpenChange,
  timesheet,
  action,
}: ApprovalActionDialogProps) {
  const { processApproval } = useTimesheets();
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    await processApproval.mutateAsync({
      timesheetId: timesheet.id,
      action,
      comment: comment || undefined,
    });
    setComment('');
    onOpenChange(false);
  };

  const isApprove = action === 'approve';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {isApprove ? 'Approve Timesheet' : 'Reject Timesheet'}
          </DialogTitle>
          <DialogDescription>
            {timesheet.user_name}'s timesheet for{' '}
            {format(parseISO(timesheet.start_date), 'MMM d')} - {format(parseISO(timesheet.end_date), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-xl font-bold">{Number(timesheet.total_hours).toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">{Number(timesheet.billable_hours).toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Billable</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-400">{Number(timesheet.overtime_hours).toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Overtime</p>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              {isApprove ? 'Comment (Optional)' : 'Reason for Rejection'}
            </Label>
            <Textarea
              id="comment"
              placeholder={
                isApprove 
                  ? 'Add a comment for the employee...'
                  : 'Explain why this timesheet is being rejected...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              required={!isApprove}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        <Button 
          variant={isApprove ? 'default' : 'outline'}
          className={!isApprove ? 'text-destructive hover:text-destructive' : ''}
          onClick={handleSubmit}
          disabled={processApproval.isPending || (!isApprove && !comment.trim())}
        >
          {processApproval.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isApprove ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {isApprove ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
