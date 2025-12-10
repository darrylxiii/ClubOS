import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ProspectCard } from './ProspectCard';
import type { CRMProspect, ProspectStage } from '@/types/crm-enterprise';

interface StageConfig {
  value: ProspectStage;
  label: string;
  color: string;
}

interface ProspectKanbanColumnProps {
  stage: StageConfig;
  prospects: CRMProspect[];
}

const stageColorMap: Record<string, string> = {
  gray: 'bg-gray-500/20 border-gray-500/30 text-gray-400',
  blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
  purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  green: 'bg-green-500/20 border-green-500/30 text-green-400',
  emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  amber: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
  red: 'bg-red-500/20 border-red-500/30 text-red-400',
  indigo: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400',
};

export function ProspectKanbanColumn({ stage, prospects }: ProspectKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.value,
  });

  const colorClass = stageColorMap[stage.color] || stageColorMap.gray;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 w-72"
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 rounded-lg mb-3 border",
        colorClass
      )}>
        <span className="font-medium text-sm">{stage.label}</span>
        <span className="text-xs font-bold bg-background/30 px-2 py-0.5 rounded-full">
          {prospects.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[400px] p-2 rounded-lg transition-all duration-200",
          "bg-muted/5 border border-dashed border-border/30",
          isOver && "bg-primary/10 border-primary/50 scale-[1.02]"
        )}
      >
        <SortableContext
          items={prospects.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {prospects.map((prospect) => (
              <ProspectCard key={prospect.id} prospect={prospect} />
            ))}
            {prospects.length === 0 && (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                Drop prospects here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </motion.div>
  );
}
