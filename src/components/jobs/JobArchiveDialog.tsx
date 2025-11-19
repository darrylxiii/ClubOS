import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  onConfirm: () => Promise<void>;
}

export function JobArchiveDialog({ 
  open, 
  onOpenChange, 
  job,
  onConfirm 
}: JobArchiveDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error archiving job:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>Archive Job</DialogTitle>
          </div>
          <DialogDescription>
            Archive this job to hide it from active views while preserving all data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">What happens when you archive:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Job is hidden from active job lists</li>
                  <li>All application data is preserved</li>
                  <li>Revenue tracking remains intact</li>
                  <li>Can be restored later if needed</li>
                  <li>Analytics history is maintained</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job:</span>
                <span className="font-medium">{job.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company:</span>
                <span className="font-medium">{job.companies?.name || job.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{job.status}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Archiving..." : "Archive Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
