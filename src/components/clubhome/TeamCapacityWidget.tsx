import { useState } from "react";
import { Users, Trophy, Briefcase, DollarSign, Activity, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DashboardWidget } from "./DashboardWidget";
import { useStrategistWorkload } from "@/hooks/useStrategistWorkload";
import { StrategistManagementModal } from "@/components/admin/StrategistManagementModal";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from "date-fns";

const getCapacityColor = (percent: number) => {
  if (percent >= 85) return { bar: "bg-destructive", text: "text-destructive" };
  if (percent >= 60) return { bar: "bg-orange-500", text: "text-orange-500" };
  return { bar: "bg-emerald-500", text: "text-emerald-500" };
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const formatRevenue = (amount: number) => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
  return `$${amount}`;
};

const RANK_COLORS = ["bg-amber-500", "bg-slate-400", "bg-orange-700"];

export const TeamCapacityWidget = () => {
  const { t } = useTranslation('common');
  const { data: workloads, isLoading } = useStrategistWorkload();
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = workloads || [];
  const visible = sorted.slice(0, 4);

  const totalPlacements = sorted.reduce((sum, w) => sum + w.placements, 0);
  const totalRevenue = sorted.reduce((sum, w) => sum + w.revenue, 0);

  return (
    <>
      <DashboardWidget
        title={t('teamCapacityWidget.title.teamCapacity')}
        icon={Users}
        isLoading={isLoading}
        isEmpty={!visible.length}
        emptyMessage="No strategists assigned yet"
        headerAction={
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2" onClick={() => setModalOpen(true)}>
            Manage <ExternalLink className="h-3 w-3" />
          </Button>
        }
      >
        <div className="space-y-3">
          {sorted.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium px-1 pb-1 border-b border-white/5">
              <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-500" />{totalPlacements} placed</span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-emerald-500" />{formatRevenue(totalRevenue)} revenue</span>
            </div>
          )}

          {visible.map((s, index) => {
            const color = getCapacityColor(s.capacityPercent);
            return (
              <div key={s.id} className="group relative flex items-center gap-4 py-2.5 px-3 -mx-2 rounded-xl transition-all duration-300 hover:bg-white/[0.03] dark:hover:bg-white/[0.02] border border-transparent hover:border-white/5 overflow-hidden">
                <div className="relative shrink-0">
                  {index < 3 && (
                    <div className={cn("absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center z-10 shadow-lg", RANK_COLORS[index])}>
                      <span className="text-[8px] font-bold text-white">{index + 1}</span>
                    </div>
                  )}
                  <Avatar className="h-9 w-9 ring-1 ring-white/10 shadow-lg border-[1.5px] border-background transition-transform duration-300 group-hover:scale-105">
                    <AvatarImage src={s.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted/80 text-muted-foreground font-semibold shadow-inner">{getInitials(s.full_name)}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0 space-y-2 mt-0.5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold tracking-tight truncate text-foreground/90 group-hover:text-foreground transition-colors block">{s.full_name}</span>
                      {s.lastActiveAt && (
                        <span className="text-[9px] text-muted-foreground/50 font-medium">
                          Active {formatDistanceToNow(new Date(s.lastActiveAt), { addSuffix: false })} ago
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[11px] font-bold tabular-nums tracking-wider", color.text)}>{s.performanceScore}/100</span>
                  </div>

                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] border border-white/5">
                    <div className={cn("h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] relative", color.bar)} style={{ width: `${Math.min(100, s.capacityPercent)}%` }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                    </div>
                  </div>

                  <div className="flex gap-3 text-[10px] text-muted-foreground/70 font-medium pt-0.5">
                    <span className="flex items-center gap-1 group-hover:text-muted-foreground transition-colors"><Trophy className="h-3 w-3 opacity-70" />{s.placements}</span>
                    <span className="flex items-center gap-1 group-hover:text-muted-foreground transition-colors"><Briefcase className="h-3 w-3 opacity-70" />{s.activePipelines}</span>
                    <span className="flex items-center gap-1 group-hover:text-muted-foreground transition-colors"><DollarSign className="h-3 w-3 opacity-70" />{formatRevenue(s.revenue)}</span>
                    <span className="flex items-center gap-1 group-hover:text-muted-foreground transition-colors"><Activity className="h-3 w-3 opacity-70" />{s.pipelineActions}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {sorted.length > 4 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">+{sorted.length - 4} more</p>
          )}
        </div>
      </DashboardWidget>

      <StrategistManagementModal open={modalOpen} onOpenChange={setModalOpen} defaultTab="workload" />
    </>
  );
};
