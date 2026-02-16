import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { CheckCircle, Copy, ExternalLink, UserPlus, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ProvisionResult } from '@/hooks/usePartnerProvisioning';

interface ProvisionSuccessViewProps {
  result: ProvisionResult;
  partnerName: string;
  phoneNumber?: string;
  onDone: () => void;
  onAddAnother: () => void;
}

export function ProvisionSuccessView({
  result,
  partnerName,
  phoneNumber,
  onDone,
  onAddAnother,
}: ProvisionSuccessViewProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const whatsappLink = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Welcome to The Quantum Club, ${partnerName}. Your partner account is ready.`)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-6"
    >
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-500" />
      </div>

      <h2 className="text-2xl font-bold mb-1">Partner Provisioned</h2>
      <p className="text-muted-foreground mb-6">{partnerName} has been added as a partner</p>

      <div className="space-y-3 text-left bg-muted/30 rounded-lg p-4">
        {result.invite_code && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Invite Code</span>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">{result.invite_code}</code>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(result.invite_code!, 'Invite code')}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {result.magic_link && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Magic Link</span>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.magic_link!, 'Magic link')}>
              <Copy className="w-4 h-4 mr-2" /> Copy Link
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Welcome Email</span>
          <Badge variant={result.welcome_email_sent ? 'default' : 'secondary'}>
            {result.welcome_email_sent ? 'Sent' : 'Not Sent'}
          </Badge>
        </div>

        {result.company_slug && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Company Page</span>
            <Button size="sm" variant="outline" onClick={() => window.open(`/companies/${result.company_slug}`, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" /> View
            </Button>
          </div>
        )}

        {whatsappLink && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">WhatsApp Welcome</span>
            <Button size="sm" variant="outline" onClick={() => window.open(whatsappLink, '_blank')}>
              <MessageCircle className="w-4 h-4 mr-2" /> Send
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1" onClick={onDone}>Done</Button>
        <Button className="flex-1" onClick={onAddAnother}>
          <UserPlus className="w-4 h-4 mr-2" /> Add Another
        </Button>
      </div>
    </motion.div>
  );
}
