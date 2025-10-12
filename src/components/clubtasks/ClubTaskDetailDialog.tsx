import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Hand, Calendar } from "lucide-react";

interface ClubTaskDetailDialogProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export const ClubTaskDetailDialog = ({ 
  task, 
  open, 
  onClose, 
  onTaskUpdated,
  onStatusChange 
}: ClubTaskDetailDialogProps) => {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DialogTitle>{task.title}</DialogTitle>
              {task.status === "blocked" && (
                <Badge variant="destructive">
                  <Hand className="h-3 w-3 mr-1" />
                  Blocked
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{task.task_number}</p>
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
                <SelectItem value="blocked">🚫 Blocked</SelectItem>
                <SelectItem value="parking_lot">🅿️ Parking Lot</SelectItem>
                <SelectItem value="to_do">📋 To Do</SelectItem>
                <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                <SelectItem value="completed">✅ Completed</SelectItem>
              </SelectContent>
            </Select>
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

          {task.blockers && task.blockers.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-destructive">Blocked By</h4>
              <div className="space-y-2">
                {task.blockers.map((blocker: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-mono text-destructive">
                      {blocker.blocking_task?.task_number}
                    </p>
                    <p className="text-sm">{blocker.blocking_task?.title}</p>
                  </div>
                ))}
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
