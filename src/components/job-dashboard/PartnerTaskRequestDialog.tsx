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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('jobs');
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
      // Find all admins/strategists to notify
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "strategist"]);

      const adminIds = (admins || []).map((a: any) => a.user_id);
      const primaryAdminId = adminIds[0];

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
          user_id: primaryAdminId || user.id,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Assign to all admins/strategists so everyone gets notified via trigger
      if (task && adminIds.length > 0) {
        const assigneeInserts = adminIds.map((aid: string) => ({
          task_id: task.id,
          user_id: aid,
        }));
        await supabase.from("unified_task_assignees").insert(assigneeInserts);
      }

      toast.success(t('jobdashboard.partnertaskrequestdialog.taskRequestSubmittedTheTeamWill', 'Task request submitted. The team will review it shortly.'));
      resetForm();
      onClose();
      onTaskCreated();
    } catch (err) {
      console.error("Partner task request error:", err);
      toast.error(t('jobdashboard.partnertaskrequestdialog.failedToSubmitTaskRequest', 'Failed to submit task request'));
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
          <DialogTitle>{t('jobdashboard.partnertaskrequestdialog.requestATask', 'Request a Task')}</DialogTitle>
          <DialogDescription>
            Request an action from The Quantum Club team{jobTitle ? ` for "${jobTitle}"` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="request-title">{t('jobdashboard.partnertaskrequestdialog.whatDoYouNeed', 'What do you need?')}</Label>
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
            <Label htmlFor="request-desc">{t('jobdashboard.partnertaskrequestdialog.additionalDetails', 'Additional Details')}</Label>
            <Textarea
              id="request-desc"
              placeholder={t('jobdashboard.partnertaskrequestdialog.anyContextOrNotes', 'Any context or notes...')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('jobdashboard.partnertaskrequestdialog.priority', 'Priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="low">{t('jobdashboard.partnertaskrequestdialog.low', 'Low')}</SelectItem>
                  <SelectItem value="medium">{t('jobdashboard.partnertaskrequestdialog.medium', 'Medium')}</SelectItem>
                  <SelectItem value="high">{t('jobdashboard.partnertaskrequestdialog.high', 'High')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('jobdashboard.partnertaskrequestdialog.preferredDueDate', 'Preferred Due Date')}</Label>
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
            <Button type="button" variant="outline" onClick={onClose}>{t('jobdashboard.partnertaskrequestdialog.cancel', 'Cancel')}</Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? t('jobdashboard.partnertaskrequestdialog.submitting', 'Submitting...') : t('jobdashboard.partnertaskrequestdialog.submitRequest', 'Submit Request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
