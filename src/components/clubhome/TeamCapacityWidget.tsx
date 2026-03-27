import { Users, Building2, UserCheck, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DashboardWidget } from "./DashboardWidget";
import { useStrategistWorkload } from "@/hooks/useStrategistWorkload";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

const getCapacityColor = (percent: number) => {
  if (percent >= 85) return { bar: "bg-destructive", text: "text-destructive" };
  if (percent >= 60) return { bar: "bg-orange-500", text: "text-orange-500" };
  return { bar: "bg-emerald-500", text: "text-emerald-500" };
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

export const TeamCapacityWidget = () => {
  const { t } = useTranslation('common');
  const { data: workloads, isLoading } = useStrategistWorkload();

  // Sort most loaded first
  const sorted = [...(workloads || [])].sort(
    (a, b) => b.capacityPercent - a.capacityPercent
  );
  const visible = sorted.slice(0, 4);

  return (
    <DashboardWidget
      title={t('teamCapacityWidget.title.teamCapacity')}
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
            <div key={s.id} className="group relative flex items-center gap-4 py-2.5 px-3 -mx-2 rounded-xl transition-all duration-300 hover:bg-white/[0.03] dark:hover:bg-white/[0.02] border border-transparent hover:border-white/5 overflow-hidden">
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10 shadow-lg border-[1.5px] border-background transition-transform duration-300 group-hover:scale-105">
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-muted/80 text-muted-foreground font-semibold shadow-inner">
                  {getInitials(s.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-2 mt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold tracking-tight truncate text-foreground/90 group-hover:text-foreground transition-colors">
                    {s.full_name}
                  </span>
                  <span className={cn("text-[11px] font-bold tabular-nums tracking-wider", color.text)}>
                    {s.capacityPercent}%
                  </span>
                </div>
                
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] border border-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] relative",
                      color.bar
                    )}
                    style={{ width: `${Math.min(100, s.capacityPercent)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                  </div>
                </div>

                <div className="flex gap-4 text-[10px] text-muted-foreground/70 font-medium pt-0.5">
                  <span className="flex items-center gap-1 group-hover:text-muted-foreground transition-colors">
                    <UserCheck className="h-3 w-3 opacity-70" />
                    {s.candidateCount}
                  </span>
                  <span className="flex items-center gap-1 group-hover:text-muted-foreground transition-colors">
                    <Building2 className="h-3 w-3 opacity-70" />
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
