import { memo, useState, useMemo } from "react";
import { PipelineKanbanColumn } from "./PipelineKanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";
import { useTranslation } from 'react-i18next';

interface PipelineKanbanBoardProps {
  stages: any[];
  applications: any[];
  metrics: any;
  onAddStage: () => void;
  onAdvanceCandidate: (app: any) => void;
  onRejectCandidate: (app: any) => void;
  onViewProfile: (app: any) => void;
}

export const PipelineKanbanBoard = memo(({
  stages,
  applications,
  metrics,
  onAddStage,
  onAdvanceCandidate,
  onRejectCandidate,
  onViewProfile,
}: PipelineKanbanBoardProps) => {
  const { t } = useTranslation('jobs');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order),
    [stages]
  );

  const filteredApplicationsByStage = useMemo(() => {
    const map: Record<number, any[]> = {};
    const query = debouncedSearch.toLowerCase();

    sortedStages.forEach(stage => {
      const stageApps = applications.filter(app => {
        if (app.current_stage_index !== stage.order) return false;
        // Exclude partner-rejected candidates from pipeline view
        if (app.partner_review_status && app.partner_review_status !== 'approved' && app.partner_review_status !== 'pending') return false;
        if (!query) return true;
        const name = (app.full_name || '').toLowerCase();
        const title = (app.current_title || '').toLowerCase();
        return name.includes(query) || title.includes(query);
      });
      map[stage.order] = stageApps;
    });

    return map;
  }, [sortedStages, applications, debouncedSearch]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-card/30 border-border/20"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddStage}
          className="h-8 gap-1.5 text-xs border-border/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Stage
        </Button>
      </div>

      {/* Kanban columns */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-min">
          {sortedStages.map((stage, i) => (
            <PipelineKanbanColumn
              key={`col-${stage.order}`}
              stage={stage}
              applications={filteredApplicationsByStage[stage.order] || []}
              avgDays={metrics?.avgDaysInStage[stage.order] || 0}
              conversionRate={metrics?.conversionRates[`${stage.order}-${stage.order + 1}`]}
              isLast={i === sortedStages.length - 1}
              onAdvance={onAdvanceCandidate}
              onReject={onRejectCandidate}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
});

PipelineKanbanBoard.displayName = 'PipelineKanbanBoard';
