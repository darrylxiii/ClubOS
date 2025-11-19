import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, DollarSign, Users } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";

interface JobDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  applicationCount: number;
  isAdmin: boolean;
  onConfirm: () => Promise<void>;
}

export function JobDeleteDialog({ 
  open, 
  onOpenChange, 
  job,
  applicationCount,
  isAdmin,
  onConfirm 
}: JobDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const isDraft = job.status === 'draft';
  const canDelete = isDraft || isAdmin;
  const hasRevenue = job.deal_value_override || (job.companies?.placement_fee_percentage && job.companies.placement_fee_percentage > 0);

  const handleConfirm = async () => {
    if (!canDelete) return;
    if (!isDraft && confirmText !== job.title) return;

    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setConfirmText("");
    } catch (error) {
      console.error("Error deleting job:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Job Permanently</DialogTitle>
          </div>
          <DialogDescription>
            {isDraft 
              ? "This draft job will be permanently deleted."
              : "This action cannot be undone. All data associated with this job will be permanently removed."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Impact Analysis */}
          {!isDraft && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Deletion Impact:</div>
                <ul className="space-y-1 text-sm">
                  {applicationCount > 0 && (
                    <li className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {applicationCount} application{applicationCount !== 1 ? 's' : ''} will become orphaned
                    </li>
                  )}
                  {hasRevenue && (
                    <li className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      Revenue tracking data will be lost
                    </li>
                  )}
                  <li>Deal pipeline analytics will be affected</li>
                  <li>Job history will be permanently erased</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {!canDelete && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Published jobs can only be deleted by administrators. Consider archiving instead.
              </AlertDescription>
            </Alert>
          )}

          {/* Job Details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Job Title:</span>
              <span className="text-sm font-medium">{job.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium capitalize">{job.status}</span>
            </div>
            {applicationCount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Applications:</span>
                <span className="text-sm font-medium">{applicationCount}</span>
              </div>
            )}
            {job.deal_value_override && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deal Value:</span>
                <span className="text-sm font-medium">{formatCurrency(job.deal_value_override)}</span>
              </div>
            )}
          </div>

          {/* Confirmation Input */}
          {!isDraft && canDelete && (
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-mono font-bold">{job.title}</span> to confirm deletion
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Enter job title"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !canDelete || (!isDraft && confirmText !== job.title)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
