import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Sparkles, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
interface CloseWonDialogProps {
  open: boolean;
  onClose: () => void;
  prospect: {
    id: string;
    full_name: string;
    company_name?: string;
    deal_value?: number;
  };
  onConfirm: (data: { 
    dealValue: number; 
    reason: string; 
    reasonCategory: string;
    notes: string;
  }) => Promise<void>;
}

const WON_REASONS = [
  { value: 'great_fit', label: 'Great Fit - Their needs match our offering' },
  { value: 'price_competitive', label: 'Price Competitive - We offered the best value' },
  { value: 'timing_perfect', label: 'Perfect Timing - They were ready to move' },
  { value: 'relationship', label: 'Relationship - Strong rapport with decision maker' },
  { value: 'referral', label: 'Referral - Came through trusted source' },
  { value: 'product_features', label: 'Product Features - Key features won them over' },
  { value: 'other', label: 'Other' },
];

export function CloseWonDialog({ open, onClose, prospect, onConfirm }: CloseWonDialogProps) {
  const [dealValue, setDealValue] = useState(prospect.deal_value?.toString() || '');
  const [reasonCategory, setReasonCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const triggerConfetti = async () => {
    const confetti = (await import('canvas-confetti')).default;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#10b981', '#059669', '#fbbf24', '#f59e0b'],
    });
  };

  const handleConfirm = async () => {
    if (!reasonCategory) {
      toast.error('Please select a reason for winning');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        dealValue: parseFloat(dealValue) || 0,
        reason: WON_REASONS.find(r => r.value === reasonCategory)?.label || '',
        reasonCategory,
        notes,
      });
      
      setShowSuccess(true);
      triggerConfetti();
      
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
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
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <Trophy className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold mb-2"
              >
                Deal Won! 🎉
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                Congratulations on closing {prospect.full_name}!
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PartyPopper className="w-5 h-5 text-emerald-500" />
                  Close as Won
                </DialogTitle>
                <DialogDescription>
                  Congratulations! Record the details of this winning deal.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Deal Preview */}
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium">{prospect.full_name}</p>
                    <p className="text-sm text-muted-foreground">{prospect.company_name || 'No company'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deal-value">Deal Value (€)</Label>
                    <Input
                      id="deal-value"
                      type="number"
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      placeholder="0"
                      className="bg-muted/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Why did we win? *</Label>
                  <Select value={reasonCategory} onValueChange={setReasonCategory}>
                    <SelectTrigger className="bg-muted/20">
                      <SelectValue placeholder="Select primary reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {WON_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any insights or learnings from this deal..."
                    className="bg-muted/20 min-h-[80px]"
                  />
                </div>

                {/* What happens */}
                <div className="bg-muted/20 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    This will:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Mark prospect as closed_won</li>
                    <li>Record win reason for analytics</li>
                    <li>Update pipeline metrics</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirm} 
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? 'Closing...' : 'Close as Won'}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
