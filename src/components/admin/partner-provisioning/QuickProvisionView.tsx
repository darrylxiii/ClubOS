import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Building2, AlertTriangle } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import type { ProvisionFormData, CompanyOption, Strategist } from '../partner-provisioning/useProvisionForm';

interface QuickProvisionViewProps {
  form: UseFormReturn<ProvisionFormData>;
  companies: CompanyOption[];
  strategists: Strategist[];
  duplicateWarning: string | null;
  isCheckingDuplicate: boolean;
  onCheckDuplicate: (email: string) => void;
  isProvisioning: boolean;
  onSubmit: () => void;
  domainMatchedCompany?: { id: string; name: string } | null;
}

export function QuickProvisionView({
  form,
  companies,
  strategists,
  duplicateWarning,
  isCheckingDuplicate,
  onCheckDuplicate,
  isProvisioning,
  onSubmit,
  domainMatchedCompany,
}: QuickProvisionViewProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const phoneNumber = watch('phoneNumber');
  const companyMode = watch('companyMode');
  const email = watch('email');
  const fullName = watch('fullName');

  const canSubmit = !!email && !!fullName && !errors.email && !errors.fullName;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4 text-primary" />
        <span>Pre-verified account — partner logs in immediately</span>
      </div>

      {/* Name + Email */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="q-fullName">Full Name *</Label>
          <Input
            id="q-fullName"
            {...register('fullName')}
            placeholder="John Smith"
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-email">Email *</Label>
          <Input
            id="q-email"
            type="email"
            {...register('email')}
            placeholder="john@company.com"
            aria-invalid={!!errors.email}
            onBlur={(e) => {
              register('email').onBlur(e);
              onCheckDuplicate(e.target.value);
            }}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
          {isCheckingDuplicate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking…
            </p>
          )}
          {duplicateWarning && !isCheckingDuplicate && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {duplicateWarning}
              <span className="text-muted-foreground ml-1">— will update company/role</span>
            </p>
          )}
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label>Phone Number</Label>
        <PhoneInput
          international
          defaultCountry="NL"
          value={phoneNumber}
          onChange={(value) => setValue('phoneNumber', value || '', { shouldDirty: true })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Company */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Company
          </Label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setValue('companyMode', 'existing', { shouldDirty: true })}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                companyMode === 'existing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Existing
            </button>
            <button
              type="button"
              onClick={() => setValue('companyMode', 'new', { shouldDirty: true })}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                companyMode === 'new' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              New
            </button>
          </div>
        </div>

        {domainMatchedCompany && companyMode === 'existing' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
            <Badge variant="outline" className="text-xs">Auto-matched</Badge>
            Matched to <span className="font-medium text-foreground">{domainMatchedCompany.name}</span> via email domain
          </div>
        )}

        {companyMode === 'existing' ? (
          <Select
            value={watch('companyId')}
            onValueChange={(v) => setValue('companyId', v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            {...register('companyName')}
            placeholder="Company name"
          />
        )}
      </div>

      {/* Role + Strategist */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Company Role</Label>
          <Select
            value={watch('companyRole')}
            onValueChange={(v: any) => setValue('companyRole', v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assigned Strategist</Label>
          <Select
            value={watch('assignedStrategistId')}
            onValueChange={(v) => setValue('assignedStrategistId', v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select strategist" />
            </SelectTrigger>
            <SelectContent>
              {strategists.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="button"
        variant="primary"
        onClick={onSubmit}
        disabled={!canSubmit || isProvisioning}
        className="w-full"
      >
        {isProvisioning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Provisioning…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Provision Partner
          </>
        )}
      </Button>
    </div>
  );
}
