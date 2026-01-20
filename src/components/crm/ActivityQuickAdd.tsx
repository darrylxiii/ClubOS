import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Plus,
  Phone,
  Mail,
  Users,
  CheckSquare,
  Clock,
  ArrowRight,
  Linkedin,
  FileText,
  MessageSquare,
  CalendarIcon,
  Loader2,
} from 'lucide-react';
import { ACTIVITY_TYPES, type ActivityType } from '@/types/crm-activities';
import { useCRMActivities } from '@/hooks/useCRMActivities';

const iconMap: Record<string, React.ReactNode> = {
  Phone: <Phone className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  CheckSquare: <CheckSquare className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  ArrowRight: <ArrowRight className="w-4 h-4" />,
  Linkedin: <Linkedin className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
};

interface ActivityQuickAddProps {
  prospectId?: string;
  prospectName?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ActivityQuickAdd({ prospectId, prospectName, onSuccess, trigger }: ActivityQuickAddProps) {
  const [open, setOpen] = useState(false);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [selectedType, setSelectedType] = useState<ActivityType>('call');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [dueTime, setDueTime] = useState('09:00');
  const [priority, setPriority] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const { createActivity } = useCRMActivities();

  const handleTypeSelect = (type: ActivityType) => {
    setSelectedType(type);
    setShowTypeSelect(false);
    
    // Auto-fill subject based on type
    const typeConfig = ACTIVITY_TYPES.find(t => t.value === type);
    if (typeConfig && !subject) {
      setSubject(`${typeConfig.label}${prospectName ? ` with ${prospectName}` : ''}`);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) return;

    setSaving(true);
    try {
      await createActivity({
        prospect_id: prospectId || null,
        activity_type: selectedType,
        subject: subject.trim(),
        description: description.trim() || null,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        due_time: dueTime || null,
        priority,
      });

      setOpen(false);
      resetForm();
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setDueDate(undefined);
    setDueTime('09:00');
    setPriority(0);
    setSelectedType('call');
    setShowTypeSelect(false);
  };

  const selectedTypeConfig = ACTIVITY_TYPES.find(t => t.value === selectedType);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Activity
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Activity</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Activity Type Selector */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Activity Type</Label>
              <div className="grid grid-cols-5 gap-2">
                {ACTIVITY_TYPES.slice(0, 5).map((type) => (
                  <motion.button
                    key={type.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTypeSelect(type.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                      selectedType === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 hover:border-border hover:bg-muted/50'
                    )}
                  >
                    {iconMap[type.icon]}
                    <span className="text-[10px] font-medium">{type.label}</span>
                  </motion.button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {ACTIVITY_TYPES.slice(5).map((type) => (
                  <motion.button
                    key={type.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTypeSelect(type.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                      selectedType === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 hover:border-border hover:bg-muted/50'
                    )}
                  >
                    {iconMap[type.icon]}
                    <span className="text-[10px] font-medium">{type.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`${selectedTypeConfig?.label || 'Activity'} details...`}
                className="mt-1"
              />
            </div>

            {/* Due Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal mt-1',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <Label>Priority</Label>
              <div className="flex gap-2 mt-1">
                {[
                  { value: 0, label: 'Normal' },
                  { value: 1, label: 'High' },
                  { value: 2, label: 'Urgent' },
                ].map((p) => (
                  <Button
                    key={p.value}
                    variant={priority === p.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      priority === p.value && p.value === 2 && 'bg-red-500 hover:bg-red-600'
                    )}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Notes (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any notes..."
                className="mt-1 min-h-[80px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!subject.trim() || saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Schedule Activity'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
