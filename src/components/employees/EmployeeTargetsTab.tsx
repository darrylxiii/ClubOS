import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Users, Clock, DollarSign } from "lucide-react";
import { useEmployeeTargets } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";

interface EmployeeTargetsTabProps {
  employeeId: string;
}

export function EmployeeTargetsTab({ employeeId }: EmployeeTargetsTabProps) {
  const { data: targets, isLoading } = useEmployeeTargets(employeeId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!targets || targets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            No Targets Set
          </CardTitle>
          <CardDescription>
            No performance targets have been configured for this employee yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Targets can be set by managers or admins in the team management section.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {targets.map(target => {
        const isPast = new Date(target.period_end) < new Date();
        const isCurrent = new Date(target.period_start) <= new Date() && new Date(target.period_end) >= new Date();

        return (
          <Card key={target.id} className={isCurrent ? "border-primary/50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {target.period_type} Target
                </CardTitle>
                <div className="flex gap-2">
                  {isCurrent && <Badge variant="default">Current</Badge>}
                  {isPast && <Badge variant="secondary">Completed</Badge>}
                </div>
              </div>
              <CardDescription>
                {new Date(target.period_start).toLocaleDateString()} - {new Date(target.period_end).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {target.revenue_target && (
                <TargetProgressRow
                  icon={DollarSign}
                  label="Revenue"
                  achieved={target.revenue_achieved}
                  target={target.revenue_target}
                  format="currency"
                />
              )}
              {target.placements_target && (
                <TargetProgressRow
                  icon={Users}
                  label="Placements"
                  achieved={target.placements_achieved}
                  target={target.placements_target}
                />
              )}
              {target.candidates_sourced_target && (
                <TargetProgressRow
                  icon={TrendingUp}
                  label="Candidates Sourced"
                  achieved={target.candidates_sourced_achieved}
                  target={target.candidates_sourced_target}
                />
              )}
              {target.interviews_target && (
                <TargetProgressRow
                  icon={Users}
                  label="Interviews"
                  achieved={target.interviews_achieved}
                  target={target.interviews_target}
                />
              )}
              {target.hours_target && (
                <TargetProgressRow
                  icon={Clock}
                  label="Hours"
                  achieved={target.hours_achieved}
                  target={target.hours_target}
                  suffix="h"
                />
              )}
              {target.notes && (
                <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                  {target.notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TargetProgressRow({
  icon: Icon,
  label,
  achieved,
  target,
  format = "number",
  suffix = "",
}: {
  icon: React.ElementType;
  label: string;
  achieved: number;
  target: number;
  format?: "number" | "currency";
  suffix?: string;
}) {
  const progress = target > 0 ? (achieved / target) * 100 : 0;
  const displayAchieved = format === "currency" ? formatCurrency(achieved) : `${achieved}${suffix}`;
  const displayTarget = format === "currency" ? formatCurrency(target) : `${target}${suffix}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <span className="text-sm font-medium">
          {displayAchieved} / {displayTarget}
          <span className="text-muted-foreground ml-2">
            ({Math.round(progress)}%)
          </span>
        </span>
      </div>
      <Progress 
        value={Math.min(progress, 100)} 
        className={`h-2 ${progress >= 100 ? '[&>div]:bg-green-500' : ''}`}
      />
    </div>
  );
}
