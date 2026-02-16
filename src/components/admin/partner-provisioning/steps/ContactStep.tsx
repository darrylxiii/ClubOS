import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Shield, Linkedin, AlertTriangle, Loader2 } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import type { ProvisionFormData } from '../useProvisionForm';

interface ContactStepProps {
  form: UseFormReturn<ProvisionFormData>;
  duplicateWarning: string | null;
  isCheckingDuplicate: boolean;
  onCheckDuplicate: (email: string) => void;
  onNext: () => void;
}

export function ContactStep({
  form,
  duplicateWarning,
  isCheckingDuplicate,
  onCheckDuplicate,
  onNext,
}: ContactStepProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const email = watch('email');
  const phoneNumber = watch('phoneNumber');

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <Mail className="w-4 h-4" />
        Contact Information
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            {...register('fullName')}
            placeholder="John Smith"
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
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
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
          {isCheckingDuplicate && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking...
            </p>
          )}
          {duplicateWarning && !isCheckingDuplicate && (
            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {duplicateWarning}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <PhoneInput
            international
            defaultCountry="NL"
            value={phoneNumber}
            onChange={(value) => setValue('phoneNumber', value || '', { shouldDirty: true })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl" className="flex items-center gap-1.5">
            <Linkedin className="w-3.5 h-3.5" /> LinkedIn
          </Label>
          <Input
            id="linkedinUrl"
            {...register('linkedinUrl')}
            placeholder="https://linkedin.com/in/..."
          />
          {errors.linkedinUrl && (
            <p className="text-xs text-destructive mt-1">{errors.linkedinUrl.message}</p>
          )}
        </div>
      </div>

      {/* Pre-verification Toggles */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Mark Email as Verified
              </Label>
              <p className="text-xs text-muted-foreground">Skip email confirmation step</p>
            </div>
            <Switch
              checked={watch('markEmailVerified')}
              onCheckedChange={(v) => setValue('markEmailVerified', v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" />
                Mark Phone as Verified
              </Label>
              <p className="text-xs text-muted-foreground">Skip phone verification step</p>
            </div>
            <Switch
              checked={watch('markPhoneVerified')}
              onCheckedChange={(v) => setValue('markPhoneVerified', v)}
              disabled={!phoneNumber}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onNext}
          disabled={!email || !watch('fullName') || !!duplicateWarning}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
