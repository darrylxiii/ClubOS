import { Users, Building2, UserCheck, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DashboardWidget } from "./DashboardWidget";
import { useStrategistWorkload } from "@/hooks/useStrategistWorkload";
import { cn } from "@/lib/utils";

const getCapacityColor = (percent: number) => {
  if (percent >= 85) return { bar: "bg-destructive", text: "text-destructive" };
  if (percent >= 60) return { bar: "bg-orange-500", text: "text-orange-500" };
  return { bar: "bg-emerald-500", text: "text-emerald-500" };
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

export const TeamCapacityWidget = () => {
  const { data: workloads, isLoading } = useStrategistWorkload();

  // Sort most loaded first
  const sorted = [...(workloads || [])].sort(
    (a, b) => b.capacityPercent - a.capacityPercent
  );
  const visible = sorted.slice(0, 4);

  return (
    <DashboardWidget
      title="Team Capacity"
      icon={Users}
      isLoading={isLoading}
      isEmpty={!visible.length}
      emptyMessage="No strategists assigned yet"
      headerAction={
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2">
          Manage <ExternalLink className="h-3 w-3" />
        </Button>
      }
    >
      <div className="space-y-3">
        {visible.map((s) => {
          const color = getCapacityColor(s.capacityPercent);
          return (
            <div key={s.id} className="flex items-center gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(s.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">
                    {s.full_name}
                  </span>
                  <span className={cn("text-[10px] font-semibold tabular-nums", color.text)}>
                    {s.capacityPercent}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", color.bar)}
                    style={{ width: `${Math.min(100, s.capacityPercent)}%` }}
                  />
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <UserCheck className="h-2.5 w-2.5" />
                    {s.candidateCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Building2 className="h-2.5 w-2.5" />
                    {s.companyCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {sorted.length > 4 && (
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            +{sorted.length - 4} more
          </p>
        )}
      </div>
    </DashboardWidget>
  );
};
