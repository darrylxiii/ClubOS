import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import type { CRMActivity, ActivityType, ACTIVITY_TYPES } from '@/types/crm-activities';

interface ActivityEditDialogProps {
  activity: CRMActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'note', label: 'Note' },
  { value: 'sms', label: 'SMS' },
];

const PRIORITY_OPTIONS = [
  { value: '0', label: 'Normal' },
  { value: '1', label: 'High' },
  { value: '2', label: 'Urgent' },
];

export function ActivityEditDialog({ 
  activity, 
  open, 
  onOpenChange,
  onSuccess 
}: ActivityEditDialogProps) {
  const { updateActivity } = useCRMActivities();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    activity_type: 'task' as ActivityType,
    priority: 0,
    due_date: null as Date | null,
    due_time: '',
  });

  // Populate form when activity changes
  useEffect(() => {
    if (activity) {
      setFormData({
        subject: activity.subject || '',
        description: activity.description || '',
        activity_type: activity.activity_type,
        priority: activity.priority || 0,
        due_date: activity.due_date ? new Date(activity.due_date) : null,
        due_time: activity.due_time || '',
      });
    }
  }, [activity]);

  const handleSave = async () => {
    if (!activity) return;

    setSaving(true);
    try {
      const updates: Partial<CRMActivity> = {
        subject: formData.subject,
        description: formData.description || null,
        activity_type: formData.activity_type,
        priority: formData.priority,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        due_time: formData.due_time || null,
      };

      const success = await updateActivity(activity.id, updates);
      if (success) {
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogDescription>
            Make changes to this activity. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Activity subject..."
            />
          </div>

          {/* Type & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.activity_type}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  activity_type: value as ActivityType 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={String(formData.priority)}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  priority: parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.due_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_time">Time</Label>
              <Input
                id="due_time"
                type="time"
                value={formData.due_time}
                onChange={(e) => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.subject.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
