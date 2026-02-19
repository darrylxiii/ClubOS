import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { SharedCandidateCard, type VisibilitySettings } from './SharedCandidateCard';

interface Stage {
  name: string;
  order: number;
  color?: string;
}

interface Application {
  id: string;
  full_name: string;
  current_title?: string;
  current_company?: string;
  email?: string;
  linkedin_url?: string;
  match_score?: number;
  ai_summary?: string;
  applied_at?: string;
  current_stage_index: number;
}

interface PipelineShareBoardProps {
  stages: Stage[];
  applications: Application[];
  visibility: VisibilitySettings;
}

const STAGE_COLORS = [
  'border-blue-500/30 bg-blue-500/5',
  'border-purple-500/30 bg-purple-500/5',
  'border-amber-500/30 bg-amber-500/5',
  'border-emerald-500/30 bg-emerald-500/5',
  'border-pink-500/30 bg-pink-500/5',
  'border-cyan-500/30 bg-cyan-500/5',
];

export function PipelineShareBoard({ stages, applications, visibility }: PipelineShareBoardProps) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const candidatesByStage = (stageOrder: number) =>
    applications.filter((app) => app.current_stage_index === stageOrder);

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {sortedStages.map((stage, idx) => {
          const candidates = candidatesByStage(stage.order);
          const colorClass = STAGE_COLORS[idx % STAGE_COLORS.length];

          return (
            <div
              key={stage.order}
              className={`flex flex-col rounded-2xl border-2 ${colorClass} backdrop-blur-sm p-4 min-w-[280px] max-w-[300px] flex-shrink-0`}
            >
              {/* Stage header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                  {stage.name}
                </h3>
                <Badge variant="secondary" className="text-xs font-bold px-2">
                  <Users className="w-3 h-3 mr-1" />
                  {candidates.length}
                </Badge>
              </div>

              {/* Candidate cards */}
              <div className="flex flex-col gap-3 flex-1">
                {candidates.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 text-center">
                    <p className="text-xs text-muted-foreground/60">No candidates</p>
                  </div>
                ) : (
                  candidates.map((app) => (
                    <SharedCandidateCard
                      key={app.id}
                      application={app}
                      visibility={visibility}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
