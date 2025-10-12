import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar, Sparkles, Clock } from "lucide-react";

interface UnifiedTaskDetailDialogProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export const UnifiedTaskDetailDialog = ({ 
  task, 
  open, 
  onClose, 
  onTaskUpdated,
  onStatusChange 
}: UnifiedTaskDetailDialogProps) => {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DialogTitle>{task.title}</DialogTitle>
              {task.auto_scheduled && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Scheduled
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{task.task_number}</p>
              {task.migration_status !== 'new' && (
                <Badge variant="secondary" className="text-xs">
                  {task.migration_status === 'migrated_from_club' && 'Migrated from Club Tasks'}
                  {task.migration_status === 'migrated_from_pilot' && 'Migrated from Task Pilot'}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {task.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">Status</h4>
            <Select 
              value={task.status} 
              onValueChange={(value) => {
                onStatusChange(task.id, value);
                onClose();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                <SelectItem value="completed">✅ Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Priority</h4>
              <Badge variant={
                task.priority === 'high' ? 'destructive' :
                task.priority === 'medium' ? 'default' : 'secondary'
              }>
                {task.priority}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium mb-2">Scheduling Mode</h4>
              <Badge variant="outline">
                {task.scheduling_mode === 'ai' && '🤖 AI'}
                {task.scheduling_mode === 'manual' && '✋ Manual'}
                {task.scheduling_mode === 'hybrid' && '🔄 Hybrid'}
              </Badge>
            </div>
          </div>

          {task.assignees && task.assignees.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Assigned To</h4>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={assignee.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {assignee.profiles?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{assignee.profiles?.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.scheduled_start && (
            <div>
              <h4 className="font-medium mb-2">Scheduled</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(new Date(task.scheduled_start), "MMMM d, yyyy 'at' HH:mm")}
              </div>
            </div>
          )}

          {task.due_date && (
            <div>
              <h4 className="font-medium mb-2">Due Date</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(task.due_date), "MMMM d, yyyy")}
              </div>
            </div>
          )}

          {task.blockers_count > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-destructive">Blocked By</h4>
              <p className="text-sm text-muted-foreground">
                This task is blocked by {task.blockers_count} other task(s)
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
