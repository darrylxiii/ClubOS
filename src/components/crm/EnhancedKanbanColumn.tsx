import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EnhancedProspectCard } from './EnhancedProspectCard';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import type { CRMProspect, ProspectStage } from '@/types/crm-enterprise';

interface StageConfig {
  value: ProspectStage;
  label: string;
  color: string;
}

interface EnhancedKanbanColumnProps {
  stage: StageConfig;
  prospects: CRMProspect[];
  onAddProspect?: (stage: ProspectStage) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const stageGradients: Record<string, string> = {
  gray: 'from-gray-500/20 to-gray-600/10',
  blue: 'from-blue-500/20 to-blue-600/10',
  cyan: 'from-cyan-500/20 to-cyan-600/10',
  purple: 'from-purple-500/20 to-purple-600/10',
  green: 'from-green-500/20 to-green-600/10',
  emerald: 'from-emerald-500/20 to-emerald-600/10',
  orange: 'from-orange-500/20 to-orange-600/10',
  amber: 'from-amber-500/20 to-amber-600/10',
  red: 'from-red-500/20 to-red-600/10',
  indigo: 'from-indigo-500/20 to-indigo-600/10',
};

const stageBorderColors: Record<string, string> = {
  gray: 'border-gray-500/30',
  blue: 'border-blue-500/30',
  cyan: 'border-cyan-500/30',
  purple: 'border-purple-500/30',
  green: 'border-green-500/30',
  emerald: 'border-emerald-500/30',
  orange: 'border-orange-500/30',
  amber: 'border-amber-500/30',
  red: 'border-red-500/30',
  indigo: 'border-indigo-500/30',
};

const stageTextColors: Record<string, string> = {
  gray: 'text-gray-400',
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  purple: 'text-purple-400',
  green: 'text-green-400',
  emerald: 'text-emerald-400',
  orange: 'text-orange-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  indigo: 'text-indigo-400',
};

const stageDotColors: Record<string, string> = {
  gray: 'bg-gray-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-500',
};

export function EnhancedKanbanColumn({ 
  stage, 
  prospects, 
  onAddProspect,
  isCollapsed = false,
  onToggleCollapse,
}: EnhancedKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.value,
  });

  const gradientClass = stageGradients[stage.color] || stageGradients.gray;
  const borderClass = stageBorderColors[stage.color] || stageBorderColors.gray;
  const textClass = stageTextColors[stage.color] || stageTextColors.gray;
  const dotClass = stageDotColors[stage.color] || stageDotColors.gray;

  // Calculate total deal value for this stage
  const totalDealValue = prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0);

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-shrink-0 w-12"
      >
        <button
          onClick={onToggleCollapse}
          className={cn(
            "w-full h-full min-h-[400px] rounded-lg border",
            "bg-gradient-to-b backdrop-blur-xl",
            "flex flex-col items-center justify-start pt-4 gap-3",
            "hover:border-primary/50 transition-colors",
            gradientClass,
            borderClass
          )}
        >
          <ChevronDown className={cn("w-4 h-4", textClass)} />
          <span 
            className={cn("font-medium text-sm writing-mode-vertical", textClass)}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {stage.label}
          </span>
          <motion.span
            key={prospects.length}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              "bg-background/50"
            )}
          >
            {prospects.length}
          </motion.span>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 w-80"
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-xl mb-3",
        "bg-gradient-to-r backdrop-blur-xl border",
        gradientClass,
        borderClass
      )}>
        <div className="flex items-center gap-2">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hover:bg-background/30 p-1 rounded transition-colors"
            >
              <ChevronUp className={cn("w-4 h-4", textClass)} />
            </button>
          )}
          <div className={cn("w-2 h-2 rounded-full", dotClass)} />
          <span className={cn("font-medium text-sm", textClass)}>{stage.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {totalDealValue > 0 && (
            <span className="text-[10px] text-muted-foreground font-medium">
              ${(totalDealValue / 1000).toFixed(0)}k
            </span>
          )}
          <motion.span
            key={prospects.length}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              "bg-background/40 backdrop-blur"
            )}
          >
            {prospects.length}
          </motion.span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[450px] p-2 rounded-xl transition-all duration-200",
          "bg-gradient-to-b from-muted/5 to-muted/10",
          "border border-dashed",
          isOver 
            ? "border-primary/60 bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10" 
            : "border-border/30"
        )}
      >
        <SortableContext
          items={prospects.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            <AnimatePresence>
              {prospects.map((prospect, index) => (
                <motion.div
                  key={prospect.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <EnhancedProspectCard prospect={prospect} />
                </motion.div>
              ))}
            </AnimatePresence>

            {prospects.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm"
              >
                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-2">
                  <Plus className="w-5 h-5" />
                </div>
                <p>Drop prospects here</p>
              </motion.div>
            )}
          </div>
        </SortableContext>

        {/* Add Prospect Button */}
        {onAddProspect && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 border border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5"
            onClick={() => onAddProspect(stage.value)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Prospect
          </Button>
        )}
      </div>
    </motion.div>
  );
}
