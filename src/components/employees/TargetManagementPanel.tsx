import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Plus, 
  Users, 
  RefreshCw,
  Calendar,
  TrendingUp,
  Trash2
} from "lucide-react";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { useAllTargets, useRecalculateTargetProgress, useDeleteTarget } from "@/hooks/useTargetManagement";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format } from "date-fns";
import { CreateTargetDialog } from "./CreateTargetDialog";
import { BulkTargetDialog } from "./BulkTargetDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function TargetManagementPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("quarterly");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  
  const { data: employees } = useAllEmployees();
  const { data: targets, isLoading } = useAllTargets(selectedPeriod);
  const recalculate = useRecalculateTargetProgress();
  const deleteTarget = useDeleteTarget();

  // Group targets by employee
  const targetsByEmployee = targets?.reduce((acc, target) => {
    if (!acc[target.employee_id]) {
      acc[target.employee_id] = [];
    }
    acc[target.employee_id].push(target);
    return acc;
  }, {} as Record<string, typeof targets>) || {};

  // Find current targets
  const now = new Date();
  const currentTargets = targets?.filter(t => 
    new Date(t.period_start) <= now && new Date(t.period_end) >= now
  ) || [];

  // Calculate summary stats
  const avgProgress = currentTargets.length > 0
    ? currentTargets.reduce((sum, t) => {
        const metrics = [
          t.revenue_target ? (t.revenue_achieved / t.revenue_target) * 100 : null,
          t.placements_target ? (t.placements_achieved / t.placements_target) * 100 : null,
          t.hours_target ? (t.hours_achieved / t.hours_target) * 100 : null,
        ].filter(Boolean) as number[];
        return sum + (metrics.length > 0 ? metrics.reduce((a, b) => a + b, 0) / metrics.length : 0);
      }, 0) / currentTargets.length
    : 0;

  const employeesWithTargets = new Set(currentTargets.map(t => t.employee_id)).size;
  const employeesWithoutTargets = (employees?.length || 0) - employeesWithTargets;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Target
          </Button>
          <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="gap-2">
            <Users className="h-4 w-4" />
            Bulk Assign
          </Button>
        </div>
        <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentTargets.length}</p>
                <p className="text-sm text-muted-foreground">Active Targets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgProgress)}%</p>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${employeesWithoutTargets > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
                <Users className={`h-5 w-5 ${employeesWithoutTargets > 0 ? 'text-amber-500' : 'text-green-500'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{employeesWithoutTargets}</p>
                <p className="text-sm text-muted-foreground">Without Targets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target List by Employee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Targets
          </CardTitle>
          <CardDescription>
            View and manage {selectedPeriod} performance targets for all employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : targets?.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No {selectedPeriod} targets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create targets to track employee performance
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Target
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {employees?.map(employee => {
                const employeeTargets = targetsByEmployee[employee.id] || [];
                if (employeeTargets.length === 0) return null;

                return (
                  <div key={employee.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {employee.profile?.full_name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <h4 className="font-medium">{employee.profile?.full_name || 'Employee'}</h4>
                          <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                        </div>
                      </div>
                    </div>

                    {employeeTargets.map(target => (
                      <TargetRow 
                        key={target.id} 
                        target={target} 
                        onRecalculate={() => recalculate.mutate(target.id)}
                        onDelete={() => deleteTarget.mutate(target.id)}
                        isRecalculating={recalculate.isPending}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateTargetDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        employees={employees || []}
      />
      <BulkTargetDialog 
        open={isBulkOpen} 
        onOpenChange={setIsBulkOpen}
        employees={employees || []}
      />
    </div>
  );
}

function TargetRow({ 
  target, 
  onRecalculate, 
  onDelete,
  isRecalculating 
}: { 
  target: any; 
  onRecalculate: () => void;
  onDelete: () => void;
  isRecalculating: boolean;
}) {
  const now = new Date();
  const isPast = new Date(target.period_end) < now;
  const isCurrent = new Date(target.period_start) <= now && new Date(target.period_end) >= now;

  // Calculate overall progress
  const metrics = [
    target.revenue_target ? { achieved: target.revenue_achieved, target: target.revenue_target, label: 'Revenue', format: 'currency' } : null,
    target.placements_target ? { achieved: target.placements_achieved, target: target.placements_target, label: 'Placements' } : null,
    target.hours_target ? { achieved: target.hours_achieved, target: target.hours_target, label: 'Hours' } : null,
    target.interviews_target ? { achieved: target.interviews_achieved, target: target.interviews_target, label: 'Interviews' } : null,
    target.candidates_sourced_target ? { achieved: target.candidates_sourced_achieved, target: target.candidates_sourced_target, label: 'Sourced' } : null,
  ].filter(Boolean) as { achieved: number; target: number; label: string; format?: string }[];

  const overallProgress = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.achieved / m.target) * 100, 0) / metrics.length
    : 0;

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {format(new Date(target.period_start), 'MMM d')} - {format(new Date(target.period_end), 'MMM d, yyyy')}
          </span>
          {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
          {isPast && <Badge variant="secondary" className="text-xs">Completed</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecalculate}
            disabled={isRecalculating}
            title="Recalculate progress"
          >
            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" title="Delete target">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Target?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this target and its progress data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={Math.min(overallProgress, 100)} className="flex-1 h-2" />
        <span className="text-sm font-medium w-12 text-right">{Math.round(overallProgress)}%</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        {metrics.map(m => (
          <div key={m.label} className="text-center p-2 bg-background/50 rounded">
            <div className="text-muted-foreground text-xs">{m.label}</div>
            <div className="font-medium">
              {m.format === 'currency' ? formatCurrency(m.achieved) : m.achieved} / {m.format === 'currency' ? formatCurrency(m.target) : m.target}
            </div>
          </div>
        ))}
      </div>

      {target.notes && (
        <p className="text-sm text-muted-foreground">{target.notes}</p>
      )}
    </div>
  );
}
