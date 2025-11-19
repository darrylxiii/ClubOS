import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { XCircle, TrendingDown } from "lucide-react";

interface JobCloseLostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  applications: any[];
  onConfirm: (lossReason: string, lossNotes: string) => Promise<void>;
}

const LOSS_REASONS = [
  { value: "budget_cut", label: "Budget Cut" },
  { value: "role_eliminated", label: "Role Eliminated" },
  { value: "hired_internally", label: "Hired Internally" },
  { value: "hired_competitor", label: "Hired via Competitor" },
  { value: "requirements_changed", label: "Requirements Changed" },
  { value: "no_qualified_candidates", label: "No Qualified Candidates" },
  { value: "timing_issues", label: "Timing Issues" },
  { value: "client_unresponsive", label: "Client Unresponsive" },
  { value: "other", label: "Other" },
];

export function JobCloseLostDialog({ 
  open, 
  onOpenChange, 
  job,
  applications,
  onConfirm 
}: JobCloseLostDialogProps) {
  const [lossReason, setLossReason] = useState<string>("");
  const [lossNotes, setLossNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const activeApplications = applications.filter(app => app.status === 'active').length;
  const totalApplications = applications.length;
  
  const pipelineStats = applications.reduce((acc, app) => {
    if (app.current_stage_index >= 2) acc.interview++;
    if (app.current_stage_index >= 3) acc.final++;
    return acc;
  }, { interview: 0, final: 0 });

  const handleConfirm = async () => {
    if (!lossReason) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(lossReason, lossNotes);
      onOpenChange(false);
    } catch (error) {
      console.error("Error closing job as lost:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>Close Job - Not Filled</DialogTitle>
          </div>
          <DialogDescription>
            This job will be closed without a hire. Help us understand what happened for future insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pipeline Summary */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pipeline Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold">{totalApplications}</div>
                <div className="text-xs text-muted-foreground">Total Applicants</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{pipelineStats.interview}</div>
                <div className="text-xs text-muted-foreground">Interviewed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{pipelineStats.final}</div>
                <div className="text-xs text-muted-foreground">Final Round</div>
              </div>
            </div>
            {activeApplications > 0 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {activeApplications} active candidate{activeApplications !== 1 ? 's' : ''} will be closed
              </p>
            )}
          </div>

          {/* Loss Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Not Filling *</Label>
            <Select value={lossReason} onValueChange={setLossReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context that might help us improve future outcomes..."
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !lossReason}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Processing..." : "Close Job Without Hire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
