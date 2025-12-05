import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Infinity, Users, DollarSign, Loader2 } from "lucide-react";
import { useContinuousPipelineHire } from "@/hooks/useContinuousPipelineHire";
import { formatCurrency } from "@/lib/revenueCalculations";

interface Application {
  id: string;
  candidate_full_name?: string;
  candidate_email?: string;
  candidate_id?: string;
  status: string;
}

interface Job {
  id: string;
  title: string;
  company_name?: string;
  fee_percentage?: number;
  is_continuous?: boolean;
  hired_count?: number;
  target_hire_count?: number | null;
}

interface ContinuousPipelineHireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  applications: Application[];
  onSuccess?: () => void;
}

export function ContinuousPipelineHireDialog({
  open,
  onOpenChange,
  job,
  applications,
  onSuccess,
}: ContinuousPipelineHireDialogProps) {
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [actualSalary, setActualSalary] = useState<string>("");
  const [notes, setNotes] = useState("");
  
  const { mutate: recordHire, isPending } = useContinuousPipelineHire();

  const activeApplications = applications.filter(
    (app) => !["rejected", "withdrawn", "hired"].includes(app.status)
  );

  const selectedApplication = applications.find(
    (app) => app.id === selectedApplicationId
  );

  const hiredCount = job.hired_count || 0;
  const nextHireNumber = hiredCount + 1;
  const isUnlimited = job.target_hire_count === null || job.target_hire_count === undefined;
  const targetCount = job.target_hire_count || 0;

  const salaryValue = parseFloat(actualSalary) || 0;
  const feePercentage = job.fee_percentage || 20;
  const placementFee = salaryValue * (feePercentage / 100);

  const handleConfirm = () => {
    if (!selectedApplicationId || !actualSalary) return;

    recordHire(
      {
        jobId: job.id,
        applicationId: selectedApplicationId,
        candidateId: selectedApplication?.candidate_id,
        actualSalary: salaryValue,
        placementFee,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedApplicationId("");
          setActualSalary("");
          setNotes("");
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Record Hire #{nextHireNumber}
            <Badge variant="outline" className="gap-1 text-primary">
              {isUnlimited ? (
                <>
                  <Infinity className="h-3 w-3" />
                  Continuous
                </>
              ) : (
                <>
                  <Users className="h-3 w-3" />
                  {hiredCount}/{targetCount}
                </>
              )}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {job.title} at {job.company_name}
            {!isUnlimited && hiredCount + 1 === targetCount && (
              <span className="block mt-1 text-amber-600">
                This will be the final hire for this pipeline.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Candidate Selection */}
          <div className="space-y-2">
            <Label htmlFor="candidate">Select Candidate</Label>
            <Select
              value={selectedApplicationId}
              onValueChange={setSelectedApplicationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose candidate to hire" />
              </SelectTrigger>
              <SelectContent>
                {activeApplications.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.candidate_full_name || app.candidate_email || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeApplications.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active candidates in pipeline
              </p>
            )}
          </div>

          {selectedApplication && (
            <>
              {/* Actual Salary */}
              <div className="space-y-2">
                <Label htmlFor="salary">Actual Salary (Annual)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="salary"
                    type="number"
                    placeholder="e.g., 85000"
                    value={actualSalary}
                    onChange={(e) => setActualSalary(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Fee Summary */}
              {salaryValue > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Salary</span>
                    <span>{formatCurrency(salaryValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Fee ({feePercentage}%)
                    </span>
                    <span className="font-medium text-primary">
                      {formatCurrency(placementFee)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-muted-foreground">
                      Total Revenue (Hire #{nextHireNumber})
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(placementFee)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any relevant notes about this hire..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedApplicationId || !actualSalary || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              `Record Hire #${nextHireNumber}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
