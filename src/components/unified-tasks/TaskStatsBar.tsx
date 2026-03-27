import { cn } from "@/lib/utils";
import { AlertTriangle, Lock, Rocket, CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TaskStats {
  total: number;
  overdue: number;
  blocked: number;
  inProgress: number;
  completedToday: number;
}

interface TaskStatsBarProps {
  stats: TaskStats;
  activeFilter: string | null;
  onFilterClick: (filter: string | null) => void;
}

const STAT_KEYS = [
  { key: "overdue", labelKey: "tasks.stats.overdue", icon: AlertTriangle, activeClass: "text-destructive bg-destructive/10 border-destructive/20" },
  { key: "blocked", labelKey: "tasks.stats.blocked", icon: Lock, activeClass: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { key: "inProgress", labelKey: "tasks.stats.inProgress", icon: Rocket, activeClass: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { key: "completedToday", labelKey: "tasks.stats.doneToday", icon: CheckCircle2, activeClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
] as const;

export function TaskStatsBar({ stats, activeFilter, onFilterClick }: TaskStatsBarProps) {
  const { t } = useTranslation("common");
  if (stats.total === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground tabular-nums font-medium shrink-0">
        {t('tasks.stats.totalTasks', { count: stats.total })}
      </span>
      <span className="text-border mx-0.5">·</span>
      {STAT_KEYS.map(({ key, labelKey, icon: Icon, activeClass }) => {
        const value = stats[key as keyof TaskStats] as number;
        if (value === 0) return null;
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            onClick={() => onFilterClick(isActive ? null : key)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors tabular-nums shrink-0",
              isActive
                ? activeClass
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="font-medium">{value}</span>
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
