import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Lock, Globe, Key, Send, Users } from 'lucide-react';
import type { ProvisionFormData, Strategist } from '../useProvisionForm';

interface AccessStepProps {
  form: UseFormReturn<ProvisionFormData>;
  strategists: Strategist[];
  onBack: () => void;
  onNext: () => void;
}

export function AccessStep({ form, strategists, onBack, onNext }: AccessStepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const provisionMethod = watch('provisionMethod');

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <Key className="w-4 h-4" />
        Access Method
      </h3>

      <RadioGroup
        value={provisionMethod}
        onValueChange={(v: any) => setValue('provisionMethod', v, { shouldDirty: true })}
        className="space-y-3"
      >
        {[
          { value: 'magic_link', icon: Sparkles, label: 'Magic Link (Recommended)', desc: 'One-click login via email — expires in 72 hours', color: 'text-primary' },
          { value: 'password', icon: Lock, label: 'Temporary Password', desc: 'Set a password for first login', color: '' },
          { value: 'oauth_only', icon: Globe, label: 'Google SSO Only', desc: 'Partner can only sign in with Google OAuth', color: '' },
        ].map(({ value, icon: Icon, label, desc, color }) => (
          <Card key={value} className={`cursor-pointer transition-all ${provisionMethod === value ? 'border-primary bg-primary/5' : ''}`}>
            <CardContent className="flex items-center gap-4 p-4">
              <RadioGroupItem value={value} id={value} />
              <div className="flex-1">
                <Label htmlFor={value} className={`flex items-center gap-2 cursor-pointer ${color}`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>

      {provisionMethod === 'password' && (
        <div className="space-y-2">
          <Label>Temporary Password *</Label>
          <Input
            type="password"
            {...register('temporaryPassword')}
            placeholder="Min 12 characters"
            aria-invalid={!!errors.temporaryPassword}
          />
          {errors.temporaryPassword && (
            <p className="text-xs text-destructive mt-1">{errors.temporaryPassword.message}</p>
          )}
        </div>
      )}

      {/* Strategist Assignment */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          Strategist Assignment
        </h3>
        <Select
          value={watch('assignedStrategistId') || ''}
          onValueChange={(v) => setValue('assignedStrategistId', v === 'none' ? '' : v, { shouldDirty: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Assign a strategist (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No strategist</SelectItem>
            {strategists.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name || s.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Welcome Message */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Send className="w-4 h-4" />
          Welcome Experience
        </h3>
        <div className="space-y-2">
          <Label>Personal Welcome Message</Label>
          <Textarea
            {...register('welcomeMessage')}
            placeholder="We're excited to have you join The Quantum Club..."
            rows={3}
          />
          {errors.welcomeMessage && (
            <p className="text-xs text-destructive mt-1">{errors.welcomeMessage.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={onNext}>Review</Button>
      </div>
    </div>
  );
}
