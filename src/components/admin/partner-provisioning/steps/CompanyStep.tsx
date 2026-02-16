import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Building2, Globe, Crown, Shield, Users, ChevronsUpDown, Check, DollarSign,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProvisionFormData, CompanyOption } from '../useProvisionForm';
import { INDUSTRIES, COMPANY_SIZES } from '../useProvisionForm';

interface CompanyStepProps {
  form: UseFormReturn<ProvisionFormData>;
  companies: CompanyOption[];
  onBack: () => void;
  onNext: () => void;
}

export function CompanyStep({ form, companies, onBack, onNext }: CompanyStepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const companyMode = watch('companyMode');
  const companyId = watch('companyId');
  const companyDomain = watch('companyDomain');
  const feeType = watch('feeType');
  const enableDomainAutoProvisioning = watch('enableDomainAutoProvisioning');
  const [comboOpen, setComboOpen] = useState(false);

  const selectedCompanyName = companies.find(c => c.id === companyId)?.name;

  const canContinue = companyMode === 'existing'
    ? !!companyId
    : !!(watch('companyName') && watch('companyName')!.trim().length >= 2);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Company Configuration
      </h3>

      <Tabs
        value={companyMode}
        onValueChange={(v) => {
          setValue('companyMode', v as 'existing' | 'new', { shouldDirty: true });
          if (v === 'new') setValue('companyId', '');
          if (v === 'existing') setValue('companyName', '');
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">Existing Company</TabsTrigger>
          <TabsTrigger value="new">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="space-y-4 mt-4">
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="w-full justify-between"
              >
                {selectedCompanyName || 'Search companies...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search companies..." />
                <CommandList>
                  <CommandEmpty>No company found.</CommandEmpty>
                  <CommandGroup>
                    {companies.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => {
                          setValue('companyId', c.id, { shouldDirty: true });
                          setValue('companyName', '', { shouldDirty: true });
                          setComboOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', companyId === c.id ? 'opacity-100' : 'opacity-0')} />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </TabsContent>

        <TabsContent value="new" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input
              {...register('companyName')}
              placeholder="Acme Corporation"
              aria-invalid={!!errors.companyName}
            />
            {errors.companyName && (
              <p className="text-xs text-destructive mt-1">{errors.companyName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={watch('industry')} onValueChange={(v) => setValue('industry', v, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={watch('companySize')} onValueChange={(v) => setValue('companySize', v, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>{size} employees</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Website
              </Label>
              <Input
                id="websiteUrl"
                {...register('websiteUrl')}
                placeholder="https://company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Est. Roles / Year</Label>
              <Input
                {...register('estimatedRolesPerYear')}
                placeholder="e.g. 10-25"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Company Role */}
      <div className="space-y-2">
        <Label>Company Role</Label>
        <Select
          value={watch('companyRole')}
          onValueChange={(v: any) => setValue('companyRole', v, { shouldDirty: true })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">
              <span className="flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500" /> Owner</span>
            </SelectItem>
            <SelectItem value="admin">
              <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /> Admin</span>
            </SelectItem>
            <SelectItem value="recruiter">
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-green-500" /> Recruiter</span>
            </SelectItem>
            <SelectItem value="member">
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> Member</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fee Structure (new company only) */}
      {companyMode === 'new' && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Fee Structure
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fee Type</Label>
                <Select
                  value={feeType}
                  onValueChange={(v: any) => setValue('feeType', v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(feeType === 'percentage' || feeType === 'hybrid') && (
                <div className="space-y-2">
                  <Label>Fee %</Label>
                  <Input
                    type="number"
                    {...register('placementFeePercentage')}
                    placeholder="20"
                    min={0}
                    max={100}
                  />
                </div>
              )}
              {(feeType === 'fixed' || feeType === 'hybrid') && (
                <div className="space-y-2">
                  <Label>Fixed Fee (€)</Label>
                  <Input
                    type="number"
                    {...register('placementFeeFixed')}
                    placeholder="5000"
                    min={0}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Payment Terms (days)</Label>
              <Select
                value={String(watch('defaultPaymentTermsDays') || 30)}
                onValueChange={(v) => setValue('defaultPaymentTermsDays', Number(v), { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">Net 14</SelectItem>
                  <SelectItem value="30">Net 30</SelectItem>
                  <SelectItem value="45">Net 45</SelectItem>
                  <SelectItem value="60">Net 60</SelectItem>
                  <SelectItem value="90">Net 90</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Auto-Provisioning */}
      {companyDomain && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Enable @{companyDomain} Auto-Provisioning
                </Label>
                <p className="text-xs text-muted-foreground">
                  Anyone with this email domain can self-register to this company
                </p>
              </div>
              <Switch
                checked={enableDomainAutoProvisioning}
                onCheckedChange={(v) => setValue('enableDomainAutoProvisioning', v)}
              />
            </div>
            {enableDomainAutoProvisioning && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Role</Label>
                    <Select
                      value={watch('domainDefaultRole')}
                      onValueChange={(v) => setValue('domainDefaultRole', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={watch('requireDomainApproval')}
                      onCheckedChange={(v) => setValue('requireDomainApproval', v)}
                    />
                    <Label>Require Approval</Label>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={onNext} disabled={!canContinue}>Continue</Button>
      </div>
    </div>
  );
}
