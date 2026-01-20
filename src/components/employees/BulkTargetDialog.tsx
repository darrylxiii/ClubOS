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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBulkCreateTargets, getPeriodDates } from "@/hooks/useTargetManagement";
import { EmployeeProfile } from "@/hooks/useEmployeeProfile";
import { Users, Target } from "lucide-react";

interface BulkTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeProfile[];
}

// Predefined templates
const TARGET_TEMPLATES = [
  {
    name: "Junior Recruiter",
    revenue_target: 25000,
    placements_target: 2,
    hours_target: 160,
    interviews_target: 15,
    candidates_sourced_target: 40,
  },
  {
    name: "Senior Recruiter",
    revenue_target: 50000,
    placements_target: 4,
    hours_target: 160,
    interviews_target: 25,
    candidates_sourced_target: 60,
  },
  {
    name: "Lead Recruiter",
    revenue_target: 75000,
    placements_target: 5,
    hours_target: 160,
    interviews_target: 30,
    candidates_sourced_target: 50,
  },
  {
    name: "Strategist",
    revenue_target: 100000,
    placements_target: 6,
    hours_target: 160,
    interviews_target: 20,
    candidates_sourced_target: 30,
  },
];

export function BulkTargetDialog({
  open,
  onOpenChange,
  employees,
}: BulkTargetDialogProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [revenueTarget, setRevenueTarget] = useState("");
  const [placementsTarget, setPlacementsTarget] = useState("");
  const [hoursTarget, setHoursTarget] = useState("");
  const [interviewsTarget, setInterviewsTarget] = useState("");
  const [candidatesSourcedTarget, setCandidatesSourcedTarget] = useState("");
  const [notes, setNotes] = useState("");

  const bulkCreate = useBulkCreateTargets();

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    const template = TARGET_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setRevenueTarget(template.revenue_target.toString());
      setPlacementsTarget(template.placements_target.toString());
      setHoursTarget(template.hours_target.toString());
      setInterviewsTarget(template.interviews_target.toString());
      setCandidatesSourcedTarget(template.candidates_sourced_target.toString());
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAll = () => {
    setSelectedEmployees(employees.map(e => e.id));
  };

  const deselectAll = () => {
    setSelectedEmployees([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    bulkCreate.mutate({
      employee_ids: selectedEmployees,
      period_type: periodType,
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
    setSelectedEmployees([]);
    setPeriodType('quarterly');
    setSelectedTemplate("");
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
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Assign Targets
          </DialogTitle>
          <DialogDescription>
            Create the same target for multiple employees at once
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Employees ({selectedEmployees.length} selected)</Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
            <ScrollArea className="h-40 border rounded-lg p-3">
              <div className="space-y-2">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                    <Checkbox
                      checked={selectedEmployees.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{emp.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Use Template (optional)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TEMPLATES.map(t => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              placeholder="Any additional expectations..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={selectedEmployees.length === 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending 
                ? 'Creating...' 
                : `Create ${selectedEmployees.length} Target${selectedEmployees.length !== 1 ? 's' : ''}`
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
