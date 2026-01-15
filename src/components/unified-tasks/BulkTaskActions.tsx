import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CheckCircle2, 
  Pause, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  X,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkTaskActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function BulkTaskActions({
  selectedIds,
  onClearSelection,
  onRefresh,
}: BulkTaskActionsProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleBulkStatusUpdate = async (status: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .update({ 
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null
        })
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} tasks updated to ${status}`);
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Failed to update tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPriorityUpdate = async (priority: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .update({ priority })
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} tasks updated to ${priority} priority`);
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error("Bulk priority update error:", error);
      toast.error("Failed to update tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} tasks deleted`);
      onClearSelection();
      onRefresh();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete tasks");
    } finally {
      setLoading(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in">
        <span className="text-sm font-medium">
          {selectedIds.length} task{selectedIds.length !== 1 ? "s" : ""} selected
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Status"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate("pending")}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate("in_progress")}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate("on_hold")}>
                <Pause className="h-4 w-4 mr-2" />
                On Hold
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate("completed")}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                Set Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkPriorityUpdate("urgent")}>
                <ArrowUp className="h-4 w-4 mr-2 text-red-500" />
                Urgent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkPriorityUpdate("high")}>
                <ArrowUp className="h-4 w-4 mr-2 text-orange-500" />
                High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkPriorityUpdate("medium")}>
                Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkPriorityUpdate("low")}>
                <ArrowDown className="h-4 w-4 mr-2 text-blue-500" />
                Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected tasks and their attachments will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
