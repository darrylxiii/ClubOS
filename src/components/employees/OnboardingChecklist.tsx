import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboardingChecklists, useUpdateOnboardingItem } from "@/hooks/usePerformanceReviews";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { 
  ClipboardList, 
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User
} from "lucide-react";

export function OnboardingChecklist() {
  const { data: employees } = useAllEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const { data: items, isLoading } = useOnboardingChecklists(selectedEmployee || undefined);
  const updateItem = useUpdateOnboardingItem();

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      await updateItem.mutateAsync({ id, completed });
      toast.success(completed ? 'Task completed' : 'Task reopened');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const completedCount = items?.filter(i => i.completed).length || 0;
  const totalCount = items?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const groupedItems = items?.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const getDueBadge = (dueDate?: string | null, completed?: boolean) => {
    if (completed || !dueDate) return null;
    const daysUntilDue = differenceInDays(new Date(dueDate), new Date());
    if (daysUntilDue < 0) return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    if (daysUntilDue <= 3) return <Badge className="bg-amber-500/10 text-amber-500 text-xs">Due soon</Badge>;
    return null;
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Onboarding Checklist
            </CardTitle>
            <CardDescription>
              Track new hire onboarding progress
            </CardDescription>
          </div>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees?.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || 'Employee'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedEmployee ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select an employee to view their checklist</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !items?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No onboarding tasks assigned</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{completedCount} of {totalCount} tasks completed</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Grouped Tasks */}
            <div className="space-y-4">
              {groupedItems && Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                    {category.replace('_', ' ')}
                  </h4>
                  <div className="space-y-2">
                    {categoryItems?.map(item => (
                      <div 
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          item.completed 
                            ? 'bg-green-500/5 border border-green-500/20' 
                            : 'bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => handleToggle(item.id, checked as boolean)}
                          disabled={updateItem.isPending}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.task_name}
                            </span>
                            {getDueBadge(item.due_date, item.completed)}
                          </div>
                          {item.due_date && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.completed ? (
                                <>Completed {item.completed_at && format(new Date(item.completed_at), 'MMM d')}</>
                              ) : (
                                <>Due {format(new Date(item.due_date), 'MMM d, yyyy')}</>
                              )}
                            </p>
                          )}
                        </div>
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
