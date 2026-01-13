import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, ThermometerSun, Target, Users, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CandidateCard } from './CandidateCard';
import { TalentPoolCandidate, TalentTier } from '@/hooks/useTalentPool';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface TalentPoolKanbanProps {
  candidates: TalentPoolCandidate[];
  isLoading?: boolean;
  onTierChange?: (candidateId: string, newTier: TalentTier) => void;
  onCandidateClick?: (candidate: TalentPoolCandidate) => void;
  onLogTouchpoint?: (candidate: TalentPoolCandidate) => void;
  onAddToList?: (candidate: TalentPoolCandidate) => void;
  onViewProfile?: (candidate: TalentPoolCandidate) => void;
}

const columns: { id: TalentTier; title: string; icon: React.ElementType; colorClass: string }[] = [
  { id: 'hot', title: 'Hot', icon: Flame, colorClass: 'text-red-400 border-red-500/30' },
  { id: 'warm', title: 'Warm', icon: ThermometerSun, colorClass: 'text-orange-400 border-orange-500/30' },
  { id: 'strategic', title: 'Strategic', icon: Target, colorClass: 'text-purple-400 border-purple-500/30' },
  { id: 'pool', title: 'Pool', icon: Users, colorClass: 'text-muted-foreground border-border' },
  { id: 'dormant', title: 'Dormant', icon: Moon, colorClass: 'text-slate-400 border-slate-500/30' },
];

interface SortableCandidateProps {
  candidate: TalentPoolCandidate;
  onCandidateClick?: (candidate: TalentPoolCandidate) => void;
  onLogTouchpoint?: (candidate: TalentPoolCandidate) => void;
  onAddToList?: (candidate: TalentPoolCandidate) => void;
  onViewProfile?: (candidate: TalentPoolCandidate) => void;
}

function SortableCandidate({ candidate, onCandidateClick, onLogTouchpoint, onAddToList, onViewProfile }: SortableCandidateProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'rotate-2 shadow-lg opacity-50')}
    >
      <CandidateCard
        candidate={candidate}
        onClick={() => onCandidateClick?.(candidate)}
        onLogTouchpoint={() => onLogTouchpoint?.(candidate)}
        onAddToList={() => onAddToList?.(candidate)}
        onViewProfile={() => onViewProfile?.(candidate)}
      />
    </div>
  );
}

interface DroppableColumnProps {
  column: typeof columns[0];
  candidates: TalentPoolCandidate[];
  onCandidateClick?: (candidate: TalentPoolCandidate) => void;
  onLogTouchpoint?: (candidate: TalentPoolCandidate) => void;
  onAddToList?: (candidate: TalentPoolCandidate) => void;
  onViewProfile?: (candidate: TalentPoolCandidate) => void;
}

function DroppableColumn({ column, candidates, onCandidateClick, onLogTouchpoint, onAddToList, onViewProfile }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;

  return (
    <div className="min-w-[280px]">
      <Card className="h-[calc(100vh-320px)] flex flex-col">
        <CardHeader className={cn('py-3 px-4 border-b-2', column.colorClass)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {column.title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {candidates.length}
            </Badge>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent
            ref={setNodeRef}
            className={cn(
              'p-2 min-h-[200px] transition-colors',
              isOver && 'bg-primary/5'
            )}
          >
            <SortableContext items={candidates.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {candidates.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                  No candidates
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.map((candidate) => (
                    <SortableCandidate
                      key={candidate.id}
                      candidate={candidate}
                      onCandidateClick={onCandidateClick}
                      onLogTouchpoint={onLogTouchpoint}
                      onAddToList={onAddToList}
                      onViewProfile={onViewProfile}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}

export function TalentPoolKanban({
  candidates,
  isLoading,
  onTierChange,
  onCandidateClick,
  onLogTouchpoint,
  onAddToList,
  onViewProfile,
}: TalentPoolKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const candidateId = active.id as string;
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    // Determine the target tier
    let newTier: TalentTier | null = null;
    
    // Check if dropped on a column
    if (columns.some(col => col.id === over.id)) {
      newTier = over.id as TalentTier;
    } else {
      // Dropped on another candidate - find which column it belongs to
      const targetCandidate = candidates.find(c => c.id === over.id);
      if (targetCandidate) {
        newTier = targetCandidate.talent_tier;
      }
    }

    if (newTier && newTier !== candidate.talent_tier) {
      onTierChange?.(candidateId, newTier);
    }
  };

  const getCandidatesByTier = (tier: TalentTier) => {
    return candidates.filter((c) => c.talent_tier === tier);
  };

  const activeCandidate = activeId ? candidates.find(c => c.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {columns.map((col) => (
          <Card key={col.id} className="min-h-[500px]">
            <CardHeader className="py-3 px-4">
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto">
        {columns.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            candidates={getCandidatesByTier(column.id)}
            onCandidateClick={onCandidateClick}
            onLogTouchpoint={onLogTouchpoint}
            onAddToList={onAddToList}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCandidate ? (
          <div className="rotate-2 shadow-lg">
            <CandidateCard candidate={activeCandidate} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
