import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, FileText, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NextStepHelperProps {
  stageName: string;
  scheduledDate?: string;
  duration?: number | string;
  prepTasks?: Array<{ title: string; url: string }> | string[];
  onBookPrep?: () => void;
  onViewMaterials?: () => void;
}

export function NextStepHelper({ 
  stageName, 
  scheduledDate,
  duration,
  prepTasks = [],
  onBookPrep,
  onViewMaterials
}: NextStepHelperProps) {
  const hasScheduledDate = !!scheduledDate;
  const completedTasks = 0; // This would come from actual data
  
  return (
    <div className="p-4 rounded-xl bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20 h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Next Step</div>
          <h3 className="text-base font-medium">{stageName}</h3>
        </div>
        <Badge variant="outline" className="bg-muted/30 text-xs border-border/30">Active</Badge>
      </div>

      {hasScheduledDate && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/30">
          <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-medium">
              {new Date(scheduledDate).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            {duration && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {duration} min
              </div>
            )}
          </div>
        </div>
      )}

      {prepTasks.length > 0 && (
        <div className="mb-3 p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-medium">Prep Checklist</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {completedTasks}/{prepTasks.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {prepTasks.slice(0, 3).map((task, i) => {
              const taskText = typeof task === 'string' ? task : task.title;
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                  <span className="line-clamp-1">{taskText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <Button 
          size="sm" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onBookPrep?.();
          }}
        >
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Book Prep
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onViewMaterials?.();
          }}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          Materials
        </Button>
      </div>
    </div>
  );
}
