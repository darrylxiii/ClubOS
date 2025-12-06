import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trophy, DollarSign, Users, Calendar, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { useSalaryRecommendation } from "@/hooks/useSalaryRecommendation";
import { Badge } from "@/components/ui/badge";

interface JobCloseHiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  applications: any[];
  onConfirm: (hiredCandidateId: string, actualSalary: number, placementFee: number) => Promise<void>;
}

export function JobCloseHiredDialog({ 
  open, 
  onOpenChange, 
  job,
  applications,
  onConfirm 
}: JobCloseHiredDialogProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [actualSalary, setActualSalary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const selectedApplication = applications.find(app => app.id === selectedCandidateId);
  const candidateId = selectedApplication?.candidate_id;
  
  // Get AI salary recommendation hook
  const { recommendation, loading: recommendationLoading, getRecommendation } = useSalaryRecommendation();

  // Fetch recommendation when candidate is selected
  useEffect(() => {
    if (candidateId && job?.id && open) {
      getRecommendation(candidateId, job.id, selectedCandidateId);
    }
  }, [candidateId, job?.id, selectedCandidateId, open, getRecommendation]);

  const expectedSalary = selectedApplication?.candidate_profiles?.expected_salary || 0;
  const feePercentage = job.companies?.placement_fee_percentage || 0;
  
  const salaryToUse = actualSalary ? parseFloat(actualSalary) : expectedSalary;
  const placementFee = salaryToUse * (feePercentage / 100);
  
  const daysToFill = job.published_at 
    ? Math.floor((new Date().getTime() - new Date(job.published_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleApplyRecommendation = () => {
    if (recommendation?.recommended_base_salary) {
      setActualSalary(recommendation.recommended_base_salary.toString());
      toast.success("AI recommendation applied");
    }
  };

  const handleConfirm = async () => {
    if (!selectedCandidateId) {
      toast.error("Please select the hired candidate");
      return;
    }

    if (!feePercentage) {
      toast.error("No placement fee configured for this company");
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selectedCandidateId, salaryToUse, placementFee);
      onOpenChange(false);
    } catch (error) {
      console.error("Error closing job:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-success" />
            <DialogTitle>Mark Job as Successfully Filled</DialogTitle>
          </div>
          <DialogDescription>
            Congratulations on the successful placement! Select the hired candidate and confirm revenue details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Candidate Selection */}
          <div className="space-y-2">
            <Label htmlFor="candidate">Hired Candidate *</Label>
            <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
              <SelectTrigger id="candidate">
                <SelectValue placeholder="Select candidate..." />
              </SelectTrigger>
              <SelectContent>
                {applications
                  .filter(app => app.status === 'active')
                  .map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.candidate_full_name || 'Unknown Candidate'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary Information */}
          {selectedCandidateId && (
            <>
              {/* AI Salary Recommendation */}
              {recommendationLoading ? (
                <div className="rounded-lg border bg-primary/5 p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Generating AI salary recommendation...</span>
                </div>
              ) : recommendation ? (
                <div className="rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Salary Recommendation</span>
                    </div>
                    <Badge variant="outline" className="bg-primary/10">
                      {recommendation.salary_percentile}th percentile
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(recommendation.recommended_base_salary)}
                      </p>
                      {recommendation.market_data && (
                        <p className="text-xs text-muted-foreground">
                          Range: {formatCurrency(recommendation.market_data.min)} - {formatCurrency(recommendation.market_data.max)}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={handleApplyRecommendation}>
                      Apply
                    </Button>
                  </div>
                  
                  {recommendation.ai_insights?.summary && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      {recommendation.ai_insights.summary}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="salary">Actual Annual Salary</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="salary"
                    type="number"
                    placeholder={expectedSalary.toString()}
                    value={actualSalary}
                    onChange={(e) => setActualSalary(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Expected: {formatCurrency(expectedSalary)} • Fee: {feePercentage}%
                </p>
              </div>

              {/* Revenue Summary */}
              <div className="rounded-lg border bg-success/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Placement Fee</span>
                  <span className="text-2xl font-bold text-success">
                    {formatCurrency(placementFee)}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                      Applicants
                    </div>
                    <div className="text-sm font-semibold">{applications.length}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Calendar className="h-3 w-3" />
                      Time to Fill
                    </div>
                    <div className="text-sm font-semibold">{daysToFill} days</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3" />
                      Base Salary
                    </div>
                    <div className="text-sm font-semibold">{formatCurrency(salaryToUse)}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !selectedCandidateId}>
            {loading ? "Processing..." : "Confirm Hire & Close Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
