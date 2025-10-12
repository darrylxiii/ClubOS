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
    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Next Step</div>
          <h3 className="text-lg font-bold">{stageName}</h3>
        </div>
        <Badge variant="outline" className="bg-background/50">Active</Badge>
      </div>

      {hasScheduledDate && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded bg-background/50">
          <Calendar className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <div className="text-sm font-semibold">
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
                {duration} minutes
              </div>
            )}
          </div>
        </div>
      )}

      {prepTasks.length > 0 && (
        <div className="mb-3 p-2 rounded bg-background/50">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Preparation Checklist</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {completedTasks}/{prepTasks.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {prepTasks.slice(0, 3).map((task, i) => {
              const taskText = typeof task === 'string' ? task : task.title;
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  {taskText}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
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
