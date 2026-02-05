import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building, CheckCircle, ArrowRight, Sparkles, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { usePartnerProvisioning } from '@/hooks/usePartnerProvisioning';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
  const [phone, setPhone] = useState(prospect.phone || '');
  const [markEmailVerified, setMarkEmailVerified] = useState(false);
  const [markPhoneVerified, setMarkPhoneVerified] = useState(false);
  const [useNewProvisioning, setUseNewProvisioning] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { provisionPartner } = usePartnerProvisioning();

  const handleConvert = async () => {
    if (!companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    setLoading(true);
    try {
      if (useNewProvisioning) {
        // Use new provisioning system
        const result = await provisionPartner({
          email: prospect.email,
          fullName: prospect.full_name,
          phoneNumber: phone,
          markEmailVerified,
          markPhoneVerified,
          companyName,
          companyRole: 'admin',
          provisionMethod: 'magic_link',
          welcomeMessage: notes,
        });

        if (!result.success) {
          throw new Error(result.error || 'Provisioning failed');
        }

        toast.success('Partner account provisioned successfully!');
      } else {
        // Use legacy conversion
        await onConvert({ companyName, notes });
        toast.success('Prospect converted to partner successfully!');
      }

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

          <div className="space-y-4">
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
              <Label htmlFor="phone">Phone Number</Label>
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry="US"
                value={phone}
                onChange={(value) => setPhone(value || '')}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="bg-muted/20 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">Pre-Verify Contact Information</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markEmailVerified}
                  onChange={(e) => setMarkEmailVerified(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Mark email as verified</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markPhoneVerified}
                  onChange={(e) => setMarkPhoneVerified(e.target.checked)}
                  disabled={!phone}
                  className="w-4 h-4"
                />
                <span className="text-sm">Mark phone as verified</span>
              </label>
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
