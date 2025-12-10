import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface CloseLostDialogProps {
  open: boolean;
  onClose: () => void;
  prospect: {
    id: string;
    full_name: string;
    company_name?: string;
  };
  onConfirm: (data: { 
    reason: string; 
    reasonCategory: string;
    competitorName?: string;
    notes: string;
    scheduleFollowUp: boolean;
    followUpDate?: string;
  }) => Promise<void>;
}

const LOST_REASONS = [
  { value: 'lost_competitor', label: 'Lost to Competitor', requiresCompetitor: true },
  { value: 'lost_budget', label: 'Budget/Price Issues' },
  { value: 'lost_timing', label: 'Bad Timing - Not ready yet' },
  { value: 'lost_no_decision', label: 'No Decision Made' },
  { value: 'lost_wrong_fit', label: 'Wrong Fit - Needs don\'t match' },
  { value: 'lost_unresponsive', label: 'Went Dark / Unresponsive' },
  { value: 'lost_internal', label: 'Internal Solution / Built in-house' },
  { value: 'other', label: 'Other' },
];

export function CloseLostDialog({ open, onClose, prospect, onConfirm }: CloseLostDialogProps) {
  const [reasonCategory, setReasonCategory] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedReason = LOST_REASONS.find(r => r.value === reasonCategory);
  const requiresCompetitor = selectedReason?.requiresCompetitor;

  const handleConfirm = async () => {
    if (!reasonCategory) {
      toast.error('Please select a reason for losing');
      return;
    }

    if (requiresCompetitor && !competitorName.trim()) {
      toast.error('Please enter the competitor name');
      return;
    }

    if (scheduleFollowUp && !followUpDate) {
      toast.error('Please select a follow-up date');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        reason: selectedReason?.label || '',
        reasonCategory,
        competitorName: requiresCompetitor ? competitorName : undefined,
        notes,
        scheduleFollowUp,
        followUpDate: scheduleFollowUp ? followUpDate : undefined,
      });
      
      toast.success('Prospect closed as lost');
      onClose();
    } catch (error) {
      console.error('Error closing deal:', error);
      toast.error('Failed to close deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Close as Lost
          </DialogTitle>
          <DialogDescription>
            Recording why deals are lost helps improve future performance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prospect Preview */}
          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium">{prospect.full_name}</p>
              <p className="text-sm text-muted-foreground">{prospect.company_name || 'No company'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Why did we lose? *</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger className="bg-muted/20">
                <SelectValue placeholder="Select primary reason" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Competitor field */}
          {requiresCompetitor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="competitor">Competitor Name *</Label>
              <Input
                id="competitor"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Enter competitor name"
                className="bg-muted/20"
              />
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">What happened?</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details about why this didn't work out..."
              className="bg-muted/20 min-h-[80px]"
            />
          </div>

          {/* Follow-up option */}
          <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                id="schedule-followup"
                checked={scheduleFollowUp}
                onCheckedChange={(checked) => setScheduleFollowUp(checked as boolean)}
              />
              <Label htmlFor="schedule-followup" className="flex items-center gap-2 cursor-pointer">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Schedule a follow-up for later
              </Label>
            </div>
            
            {scheduleFollowUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pl-6"
              >
                <Label htmlFor="followup-date" className="text-xs text-muted-foreground mb-1 block">
                  Re-engage date
                </Label>
                <Input
                  id="followup-date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="bg-background w-full max-w-[200px]"
                />
              </motion.div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Closing...' : 'Close as Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
