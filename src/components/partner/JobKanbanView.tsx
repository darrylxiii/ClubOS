import { memo, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Clock, Lock, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDaysOpenColor } from '@/lib/jobUtils';

interface JobWithMetrics {
  id: string;
  title: string;
  status: string;
  location: string;
  created_at: string;
  club_sync_status: 'accepted' | 'pending' | 'not_offered' | null;
  candidate_count: number;
  active_stage_count: number;
  last_activity: string | null;
  last_activity_user: { name: string; avatar: string | null } | null;
  days_since_opened: number;
  conversion_rate: number | null;
  company_name: string;
  company_logo: string | null;
  is_stealth: boolean;
  is_continuous: boolean;
  hired_count: number;
  target_hire_count: number | null;
}

interface JobKanbanViewProps {
  jobs: JobWithMetrics[];
  selectedIds: Set<string>;
  focusedIndex: number;
  onToggleSelect: (jobId: string) => void;
  onNavigate: (jobId: string) => void;
  onStatusChange: (jobId: string, newStatus: string) => Promise<void>;
  isSelected: (jobId: string) => boolean;
}

const KANBAN_COLUMNS = [
  { id: 'draft', label: 'Draft', color: 'bg-muted' },
  { id: 'published', label: 'Published', color: 'bg-success/20' },
  { id: 'closed', label: 'Closed', color: 'bg-warning/20' },
  { id: 'archived', label: 'Archived', color: 'bg-destructive/20' },
] as const;

const KanbanJobCard = memo(({ job, isSelected, onToggleSelect, onNavigate }: {
  job: JobWithMetrics;
  isSelected: boolean;
  onToggleSelect: () => void;
  onNavigate: () => void;
}) => (
  <Card className={cn(
    'border border-border/20 bg-card/30 backdrop-blur-sm cursor-pointer transition-all hover:border-border/40',
    isSelected && 'ring-2 ring-primary border-primary/40'
  )}>
    <CardContent className="p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} onClick={(e) => e.stopPropagation()} className="mt-0.5" />
        <div className="flex-1 min-w-0" onClick={onNavigate}>
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-6 w-6 border border-border/20">
              <AvatarImage src={job.company_logo || undefined} alt={job.company_name} />
              <AvatarFallback className="text-[10px] bg-card/40">{job.company_name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{job.company_name}</span>
          </div>
          <p className="font-semibold text-sm truncate">{job.title}</p>
          <p className="text-xs text-muted-foreground truncate">{job.location}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {job.is_stealth && <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-amber-500/10 text-amber-600 border-amber-500/30"><Lock className="h-2.5 w-2.5 mr-0.5" />Stealth</Badge>}
        {job.club_sync_status === 'accepted' && <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-primary/10 text-primary border-primary/30"><Zap className="h-2.5 w-2.5 mr-0.5" />Sync</Badge>}
        {job.is_continuous && <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-blue-500/10 text-blue-600 border-blue-500/30"><Target className="h-2.5 w-2.5 mr-0.5" />{job.hired_count}/{job.target_hire_count || '∞'}</Badge>}
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" /><span>{job.candidate_count}</span></div>
        <div className={cn('flex items-center gap-1', getDaysOpenColor(job.days_since_opened))}><Clock className="h-3 w-3" /><span>{job.days_since_opened}d</span></div>
        {job.conversion_rate !== null && <span className="text-success">{job.conversion_rate}%</span>}
      </div>
    </CardContent>
  </Card>
));

KanbanJobCard.displayName = 'KanbanJobCard';

const KanbanColumn = memo(({ columnId, label, color, jobs, onToggleSelect, onNavigate, isSelected }: {
  columnId: string;
  label: string;
  color: string;
  jobs: JobWithMetrics[];
  onToggleSelect: (jobId: string) => void;
  onNavigate: (jobId: string) => void;
  isSelected: (jobId: string) => boolean;
}) => (
  <div className="flex flex-col min-w-[280px] w-[280px] h-full">
    <div className={cn('rounded-t-lg px-3 py-2 flex items-center justify-between', color)}>
      <span className="font-semibold text-sm">{label}</span>
      <Badge variant="secondary" className="text-xs">{jobs.length}</Badge>
    </div>
    <Droppable droppableId={columnId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn('flex-1 p-2 space-y-2 overflow-y-auto rounded-b-lg border border-t-0 border-border/20 bg-card/10', snapshot.isDraggingOver && 'bg-primary/5 border-primary/30')}
          style={{ minHeight: 200 }}
        >
          {jobs.map((job, index) => (
            <Draggable key={job.id} draggableId={job.id} index={index}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn(snapshot.isDragging && 'opacity-75')}>
                  <KanbanJobCard job={job} isSelected={isSelected(job.id)} onToggleSelect={() => onToggleSelect(job.id)} onNavigate={() => onNavigate(job.id)} />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
          {jobs.length === 0 && <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">No jobs</div>}
        </div>
      )}
    </Droppable>
  </div>
));

KanbanColumn.displayName = 'KanbanColumn';

export const JobKanbanView = memo(({ jobs, selectedIds, focusedIndex, onToggleSelect, onNavigate, onStatusChange, isSelected }: JobKanbanViewProps) => {
  const jobsByStatus = useMemo(() => {
    const grouped: Record<string, JobWithMetrics[]> = { draft: [], published: [], closed: [], archived: [] };
    jobs.forEach(job => { if (grouped[job.status.toLowerCase()]) grouped[job.status.toLowerCase()].push(job); });
    return grouped;
  }, [jobs]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    if (destination.droppableId !== source.droppableId) await onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {KANBAN_COLUMNS.map(col => (
          <KanbanColumn key={col.id} columnId={col.id} label={col.label} color={col.color} jobs={jobsByStatus[col.id] || []} onToggleSelect={onToggleSelect} onNavigate={onNavigate} isSelected={isSelected} />
        ))}
      </div>
    </DragDropContext>
  );
});

JobKanbanView.displayName = 'JobKanbanView';
