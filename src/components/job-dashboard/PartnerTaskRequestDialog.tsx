import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PartnerTaskRequestDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  companyId?: string;
  jobTitle?: string;
  onTaskCreated: () => void;
}

export const PartnerTaskRequestDialog = ({
  open,
  onClose,
  jobId,
  companyId,
  jobTitle,
  onTaskCreated,
}: PartnerTaskRequestDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setLoading(true);
    try {
      // Find an admin to assign to
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "strategist"])
        .limit(1);

      const adminId = admins?.[0]?.user_id;

      // Create the task
      const { data: task, error } = await supabase
        .from("unified_tasks")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status: "pending",
          task_type: "partner_request",
          task_number: "",
          scheduling_mode: "manual",
          due_date: dueDate?.toISOString() || null,
          job_id: jobId,
          company_id: companyId || null,
          user_id: adminId || user.id,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Assign to admin
      if (task && adminId) {
        await supabase.from("unified_task_assignees").insert({
          task_id: task.id,
          user_id: adminId,
        });
      }

      toast.success("Task request submitted. The team will review it shortly.");
      resetForm();
      onClose();
      onTaskCreated();
    } catch (err) {
      console.error("Partner task request error:", err);
      toast.error("Failed to submit task request");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Task</DialogTitle>
          <DialogDescription>
            Request an action from The Quantum Club team{jobTitle ? ` for "${jobTitle}"` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="request-title">What do you need?</Label>
            <Input
              id="request-title"
              placeholder="e.g. Schedule final round interview"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="request-desc">Additional Details</Label>
            <Textarea
              id="request-desc"
              placeholder="Any context or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "MMM d") : "Optional"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-50">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
