import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ListTodo, Loader2 } from 'lucide-react';
import { useCRMPilotIntegration } from '@/hooks/useCRMPilotIntegration';
import type { CRMProspect } from '@/types/crm-enterprise';

interface CreatePilotTaskButtonProps {
  prospect: CRMProspect;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function CreatePilotTaskButton({ 
  prospect, 
  variant = 'outline',
  size = 'sm',
}: CreatePilotTaskButtonProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState<'follow_up' | 'call' | 'email' | 'meeting' | 'review'>('follow_up');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const { createTaskForProspect } = useCRMPilotIntegration();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const success = await createTaskForProspect({
        prospect,
        taskType,
        title: title || undefined,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      if (success) {
        setOpen(false);
        setTitle('');
        setDescription('');
        setDueDate('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <ListTodo className="w-4 h-4" />
          {size !== 'icon' && 'Create Task'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("create_club_pilot_task", "Create Club Pilot Task")}</DialogTitle>
          <DialogDescription>
            Create a follow-up task for {prospect.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("task_type", "Task Type")}</Label>
            <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="follow_up">{t("follow_up", "Follow Up")}</SelectItem>
                <SelectItem value="call">{t("phone_call", "Phone Call")}</SelectItem>
                <SelectItem value="email">{t("send_email", "Send Email")}</SelectItem>
                <SelectItem value="meeting">{t("schedule_meeting", "Schedule Meeting")}</SelectItem>
                <SelectItem value="review">{t("review_profile", "Review Profile")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("title_optional", "Title (optional)")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${taskType === 'follow_up' ? 'Follow up with' : taskType === 'call' ? 'Call' : 'Email'} ${prospect.full_name}`}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("description_optional", "Description (optional)")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("add_notes_or_context", "Add notes or context...")}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("due_date", "Due Date")}</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
