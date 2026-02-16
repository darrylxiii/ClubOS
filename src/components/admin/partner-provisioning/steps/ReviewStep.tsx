import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Pencil, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ProvisionFormData, CompanyOption } from '../useProvisionForm';

interface ReviewStepProps {
  form: UseFormReturn<ProvisionFormData>;
  companies: CompanyOption[];
  isProvisioning: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onGoToStep: (step: number) => void;
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-right max-w-[240px] truncate">{value || '—'}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Edit ${label}`}
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ReviewStep({
  form,
  companies,
  isProvisioning,
  onBack,
  onSubmit,
  onGoToStep,
}: ReviewStepProps) {
  const v = form.getValues();
  const companyName = v.companyMode === 'existing'
    ? companies.find(c => c.id === v.companyId)?.name || '—'
    : v.companyName || '—';

  const methodLabel: Record<string, string> = {
    magic_link: 'Magic Link',
    password: 'Temporary Password',
    oauth_only: 'Google SSO Only',
  };

  const feeLabel = v.feeType === 'percentage'
    ? `${v.placementFeePercentage || 0}%`
    : v.feeType === 'fixed'
    ? `€${v.placementFeeFixed || 0}`
    : `${v.placementFeePercentage || 0}% + €${v.placementFeeFixed || 0}`;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <FileCheck className="w-4 h-4" />
        Review & Confirm
      </h3>

      {/* Contact */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
            <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => onGoToStep(1)}>Edit</Badge>
          </div>
          <Row label="Name" value={v.fullName} onEdit={() => onGoToStep(1)} />
          <Row label="Email" value={v.email} onEdit={() => onGoToStep(1)} />
          {v.phoneNumber && <Row label="Phone" value={v.phoneNumber} />}
          {v.linkedinUrl && <Row label="LinkedIn" value={v.linkedinUrl} />}
          <Row label="Email Verified" value={v.markEmailVerified ? 'Yes' : 'No'} />
        </CardContent>
      </Card>

      {/* Company */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</h4>
            <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => onGoToStep(2)}>Edit</Badge>
          </div>
          <Row label="Company" value={companyName} onEdit={() => onGoToStep(2)} />
          <Row label="Role" value={v.companyRole} />
          {v.companyMode === 'new' && (
            <>
              {v.industry && <Row label="Industry" value={v.industry} />}
              {v.companySize && <Row label="Size" value={v.companySize} />}
              <Row label="Fee" value={feeLabel} />
              <Row label="Payment Terms" value={`Net ${v.defaultPaymentTermsDays || 30}`} />
            </>
          )}
          {v.companyDomain && (
            <Row label="Domain Provisioning" value={v.enableDomainAutoProvisioning ? `@${v.companyDomain} enabled` : 'Disabled'} />
          )}
        </CardContent>
      </Card>

      {/* Access */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access</h4>
            <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => onGoToStep(3)}>Edit</Badge>
          </div>
          <Row label="Method" value={methodLabel[v.provisionMethod]} onEdit={() => onGoToStep(3)} />
          {v.welcomeMessage && <Row label="Welcome Message" value={v.welcomeMessage.substring(0, 60) + (v.welcomeMessage.length > 60 ? '...' : '')} />}
        </CardContent>
      </Card>

      {/* NDA */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
        <Switch
          checked={form.watch('agreedNda')}
          onCheckedChange={(v) => form.setValue('agreedNda', v)}
          id="nda"
        />
        <Label htmlFor="nda" className="text-sm cursor-pointer">
          NDA acknowledged and on file
        </Label>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={onSubmit} disabled={isProvisioning}>
          {isProvisioning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
              />
              Provisioning...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Provision Partner
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
