import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useCreateTarget, getPeriodDates } from "@/hooks/useTargetManagement";
import { EmployeeProfile } from "@/hooks/useEmployeeProfile";
import { Target } from "lucide-react";

interface CreateTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeProfile[];
  preselectedEmployeeId?: string;
}

export function CreateTargetDialog({
  open,
  onOpenChange,
  employees,
  preselectedEmployeeId,
}: CreateTargetDialogProps) {
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || "");
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [revenueTarget, setRevenueTarget] = useState("");
  const [placementsTarget, setPlacementsTarget] = useState("");
  const [hoursTarget, setHoursTarget] = useState("");
  const [interviewsTarget, setInterviewsTarget] = useState("");
  const [candidatesSourcedTarget, setCandidatesSourcedTarget] = useState("");
  const [notes, setNotes] = useState("");

  const createTarget = useCreateTarget();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { start, end } = getPeriodDates(periodType);

    createTarget.mutate({
      employee_id: employeeId,
      period_type: periodType,
      period_start: start,
      period_end: end,
      revenue_target: revenueTarget ? parseFloat(revenueTarget) : null,
      placements_target: placementsTarget ? parseInt(placementsTarget) : null,
      hours_target: hoursTarget ? parseInt(hoursTarget) : null,
      interviews_target: interviewsTarget ? parseInt(interviewsTarget) : null,
      candidates_sourced_target: candidatesSourcedTarget ? parseInt(candidatesSourcedTarget) : null,
      notes: notes || null,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      }
    });
  };

  const resetForm = () => {
    setEmployeeId(preselectedEmployeeId || "");
    setPeriodType('quarterly');
    setRevenueTarget("");
    setPlacementsTarget("");
    setHoursTarget("");
    setInterviewsTarget("");
    setCandidatesSourcedTarget("");
    setNotes("");
  };

  const { start, end } = getPeriodDates(periodType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create Performance Target
          </DialogTitle>
          <DialogDescription>
            Set targets for an employee to track their performance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || 'Unknown'} - {emp.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Period Type</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Period: {start} to {end}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Revenue Target (€)</Label>
              <Input
                type="number"
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(e.target.value)}
                placeholder="e.g., 50000"
              />
            </div>
            <div className="space-y-2">
              <Label>Placements Target</Label>
              <Input
                type="number"
                value={placementsTarget}
                onChange={(e) => setPlacementsTarget(e.target.value)}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label>Hours Target</Label>
              <Input
                type="number"
                value={hoursTarget}
                onChange={(e) => setHoursTarget(e.target.value)}
                placeholder="e.g., 160"
              />
            </div>
            <div className="space-y-2">
              <Label>Interviews Target</Label>
              <Input
                type="number"
                value={interviewsTarget}
                onChange={(e) => setInterviewsTarget(e.target.value)}
                placeholder="e.g., 20"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Candidates Sourced Target</Label>
              <Input
                type="number"
                value={candidatesSourcedTarget}
                onChange={(e) => setCandidatesSourcedTarget(e.target.value)}
                placeholder="e.g., 50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional expectations or context..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!employeeId || createTarget.isPending}>
              {createTarget.isPending ? 'Creating...' : 'Create Target'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
