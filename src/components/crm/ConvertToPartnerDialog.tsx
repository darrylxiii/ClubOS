import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ConvertToPartnerDialogProps {
  open: boolean;
  onClose: () => void;
  prospect: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
    phone?: string;
  };
  onConvert: (data: { companyName: string; notes: string }) => Promise<void>;
}

export function ConvertToPartnerDialog({ open, onClose, prospect, onConvert }: ConvertToPartnerDialogProps) {
  const [companyName, setCompanyName] = useState(prospect.company_name || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    setLoading(true);
    try {
      await onConvert({ companyName, notes });
      toast.success('Prospect converted to partner successfully!');
      onClose();
    } catch (error) {
      console.error('Error converting prospect:', error);
      toast.error('Failed to convert prospect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Convert to Partner
          </DialogTitle>
          <DialogDescription>
            This will create a new partner company from this prospect and begin the onboarding process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conversion Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20"
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-semibold">
                  {prospect.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-medium">{prospect.full_name}</p>
              <p className="text-xs text-muted-foreground">Prospect</p>
            </div>
            <ArrowRight className="w-6 h-6 text-primary" />
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <Building className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium">{companyName || 'New Company'}</p>
              <p className="text-xs text-muted-foreground">Partner</p>
            </div>
          </motion.div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                className="bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Onboarding Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the onboarding process..."
                className="bg-muted/20 min-h-[80px]"
              />
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-muted/20 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              What happens next:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                New company record created
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                Contact linked to company
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                Prospect marked as closed_won
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                Partner onboarding email sent
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading ? 'Converting...' : 'Convert to Partner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
