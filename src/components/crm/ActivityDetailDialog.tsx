import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  CheckCircle,
  X
} from 'lucide-react';
import type { CRMActivity } from '@/types/crm-activities';
import { ACTIVITY_TYPES, ACTIVITY_OUTCOMES } from '@/types/crm-activities';
import { useCRMActivities } from '@/hooks/useCRMActivities';

interface ActivityDetailDialogProps {
  activity: CRMActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function ActivityDetailDialog({ 
  activity, 
  open, 
  onOpenChange,
  onComplete 
}: ActivityDetailDialogProps) {
  const [outcome, setOutcome] = useState<string>('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  
  const { completeActivity } = useCRMActivities({});

  if (!activity) return null;

  const typeConfig = ACTIVITY_TYPES.find(t => t.value === activity.activity_type);

  const handleComplete = async () => {
    if (!outcome) return;
    
    setCompleting(true);
    try {
      await completeActivity(activity.id, outcome as any, outcomeNotes || undefined);
      onComplete?.();
      onOpenChange(false);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${typeConfig?.color}-500/20`}>
              <Calendar className={`w-5 h-5 text-${typeConfig?.color}-500`} />
            </div>
            <div>
              <DialogTitle>{activity.subject}</DialogTitle>
              <Badge variant="outline" className="mt-1">
                {typeConfig?.label || activity.activity_type}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Activity Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {activity.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(activity.due_date), 'PPP')}</span>
              </div>
            )}
            {activity.due_time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{activity.due_time}</span>
              </div>
            )}
            {activity.owner_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{activity.owner_name}</span>
              </div>
            )}
            {activity.prospect_company && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span>{activity.prospect_company}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{activity.description}</p>
            </div>
          )}

          {/* Note */}
          {activity.note && (
            <div>
              <Label className="text-xs text-muted-foreground">Note</Label>
              <p className="text-sm mt-1 bg-muted/20 p-3 rounded-lg">{activity.note}</p>
            </div>
          )}

          {/* Complete Section */}
          {!activity.is_done && (
            <div className="border-t border-border/30 pt-4 space-y-3">
              <Label>Mark as Complete</Label>
              
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OUTCOMES.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Add notes about the outcome..."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                className="min-h-20 bg-muted/20"
              />

              <div className="flex gap-2">
                <Button 
                  onClick={handleComplete}
                  disabled={!outcome || completing}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {completing ? 'Completing...' : 'Complete Activity'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Already Done */}
          {activity.is_done && (
            <div className="border-t border-border/30 pt-4">
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Completed</span>
              </div>
              {activity.outcome && (
                <Badge variant="outline" className="mb-2">
                  {ACTIVITY_OUTCOMES.find(o => o.value === activity.outcome)?.label || activity.outcome}
                </Badge>
              )}
              {activity.outcome_notes && (
                <p className="text-sm text-muted-foreground">{activity.outcome_notes}</p>
              )}
              {activity.done_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Completed {format(new Date(activity.done_at), 'PPp')}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
