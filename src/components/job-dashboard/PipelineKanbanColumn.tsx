import { memo, useState } from "react";
import { PipelineKanbanCard } from "./PipelineKanbanCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

interface PipelineKanbanColumnProps {
  stage: any;
  applications: any[];
  avgDays: number;
  conversionRate?: number;
  isLast: boolean;
  onAdvance: (app: any) => void;
  onReject: (app: any) => void;
  onViewProfile: (app: any) => void;
}

const INITIAL_SHOW = 5;

export const PipelineKanbanColumn = memo(({
  stage,
  applications,
  avgDays,
  conversionRate,
  isLast,
  onAdvance,
  onReject,
  onViewProfile,
}: PipelineKanbanColumnProps) => {
  const { t } = useTranslation('jobs');
  const [showAll, setShowAll] = useState(false);
  const count = applications.length;
  const healthColor = avgDays > 14 ? 'bg-destructive' : avgDays > 7 ? 'bg-warning' : 'bg-success';
  const isClub = stage.owner === 'quantum_club' || stage.is_club_stage;
  const visibleApps = showAll ? applications : applications.slice(0, INITIAL_SHOW);
  const hiddenCount = count - INITIAL_SHOW;

  return (
    <div className="flex flex-col shrink-0 w-[260px]">
      {/* Column header */}
      <div className="px-3 py-2.5 rounded-t-xl bg-card/40 backdrop-blur-sm border border-border/20 border-b-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {isClub ? (
              <Sparkles className="w-3 h-3 text-muted-foreground" />
            ) : (
              <Building2 className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-xs font-semibold truncate max-w-[140px]">{stage.name}</span>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold tabular-nums">
            {count}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", healthColor)} />
            {avgDays}d avg
          </span>
          {!isLast && conversionRate !== undefined && (
            <>
              <span className="text-border/40">·</span>
              <span>{conversionRate}% →</span>
            </>
          )}
        </div>
      </div>

      {/* Cards area */}
      <div className="flex-1 min-h-[120px] max-h-[420px] overflow-y-auto p-2 space-y-1.5 rounded-b-xl bg-card/20 backdrop-blur-sm border border-border/20 border-t-0 scrollbar-thin">
        {visibleApps.map((app) => (
          <PipelineKanbanCard
            key={app.id}
            application={app}
            avgDaysThreshold={avgDays || 7}
            onAdvance={onAdvance}
            onReject={onReject}
            onViewProfile={onViewProfile}
          />
        ))}

        {count === 0 && (
          <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground">
            No candidates
          </div>
        )}

        {!showAll && hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-[10px] text-muted-foreground"
            onClick={() => setShowAll(true)}
          >
            <ChevronDown className="w-3 h-3 mr-1" />
            +{hiddenCount} more
          </Button>
        )}

        {showAll && hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-[10px] text-muted-foreground"
            onClick={() => setShowAll(false)}
          >
            <ChevronUp className="w-3 h-3 mr-1" />
            Show less
          </Button>
        )}
      </div>
    </div>
  );
});

PipelineKanbanColumn.displayName = 'PipelineKanbanColumn';
