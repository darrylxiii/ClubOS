import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFinancialAuditLog } from '@/hooks/useFinancialAuditLog';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Currency, CURRENCY_SYMBOLS, convertCurrency } from '@/lib/currencyConversion';

const SALARY_CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'AED'];

export function AddPlacementFeeDialog() {
  const queryClient = useQueryClient();
  const { logAction } = useFinancialAuditLog();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    job_id: '',
    candidate_salary: '',
    fee_percentage: '20',
    hired_date: new Date().toISOString().split('T')[0],
    currency_code: 'EUR' as Currency,
    legal_entity: 'tqc_nl',
  });

  // Fetch closed jobs without fees
  const { data: availableJobs } = useQuery({
    queryKey: ['jobs-without-fees'],
    queryFn: async () => {
      const { data: closedJobs } = await supabase
        .from('jobs')
        .select(`
          id, 
          title, 
          company_id,
          companies!inner (name)
        `)
        .eq('status', 'closed');

      const { data: existingFees } = await supabase
        .from('placement_fees')
        .select('job_id');

      const existingJobIds = new Set((existingFees || []).map(f => f.job_id));
      
      return (closedJobs || []).filter((j: any) => !existingJobIds.has(j.id));
    },
    enabled: open,
  });

  const salary = parseFloat(formData.candidate_salary || '0');
  const feePercentage = parseFloat(formData.fee_percentage || '0');
  const feeAmount = salary * (feePercentage / 100);
  const feeAmountEur = useMemo(() => {
    if (formData.currency_code === 'EUR') return feeAmount;
    return convertCurrency(feeAmount, formData.currency_code, 'EUR');
  }, [feeAmount, formData.currency_code]);

  const currencySymbol = CURRENCY_SYMBOLS[formData.currency_code];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.job_id || !formData.candidate_salary) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedJob = availableJobs?.find((j: any) => j.id === formData.job_id);
      if (!selectedJob) throw new Error('Job not found');

      const { error } = await supabase.from('placement_fees').insert({
        job_id: formData.job_id,
        partner_company_id: (selectedJob as any).company_id,
        candidate_salary: salary,
        fee_percentage: feePercentage,
        fee_amount: feeAmount,
        fee_amount_eur: feeAmountEur,
        currency_code: formData.currency_code,
        legal_entity: formData.legal_entity,
        status: 'pending',
        hired_date: formData.hired_date,
        payment_due_date: new Date(new Date(formData.hired_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      // Audit log the fee creation
      logAction({
        action: 'expense.created',
        entityType: 'placement_fee',
        newValue: {
          job_id: formData.job_id,
          fee_amount: feeAmount,
          fee_percentage: feePercentage,
          currency_code: formData.currency_code,
          legal_entity: formData.legal_entity,
        },
      });

      toast.success('Placement fee created successfully');
      queryClient.invalidateQueries({ queryKey: ['placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fee-health'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-without-fees'] });
      setOpen(false);
      setFormData({
        job_id: '',
        candidate_salary: '',
        fee_percentage: '20',
        hired_date: new Date().toISOString().split('T')[0],
        currency_code: 'EUR',
        legal_entity: 'tqc_nl',
      });
    } catch (error) {
      console.error('Error creating fee:', error);
      toast.error('Failed to create placement fee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Fee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Placement Fee</DialogTitle>
          <DialogDescription>
            Manually create a placement fee record for a closed role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job">Role</Label>
            <Select
              value={formData.job_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, job_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a closed role" />
              </SelectTrigger>
              <SelectContent>
                {availableJobs?.map((job: any) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} - {job.companies?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-1">
              <Label>Currency</Label>
              <Select
                value={formData.currency_code}
                onValueChange={(v) => setFormData(prev => ({ ...prev, currency_code: v as Currency }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CURRENCY_SYMBOLS[c]} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary ({currencySymbol})</Label>
              <Input
                id="salary"
                type="number"
                placeholder="e.g. 75000"
                value={formData.candidate_salary}
                onChange={(e) => setFormData(prev => ({ ...prev, candidate_salary: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee_percentage">Fee %</Label>
              <Input
                id="fee_percentage"
                type="number"
                value={formData.fee_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, fee_percentage: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hired_date">Hired Date</Label>
              <Input
                id="hired_date"
                type="date"
                value={formData.hired_date}
                onChange={(e) => setFormData(prev => ({ ...prev, hired_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Office</Label>
              <Select
                value={formData.legal_entity}
                onValueChange={(v) => setFormData(prev => ({ ...prev, legal_entity: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tqc_nl">🇳🇱 Amsterdam</SelectItem>
                  <SelectItem value="tqc_dubai">🇦🇪 Dubai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {salary > 0 && feePercentage > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Calculated Fee</span>
                <span className="font-semibold">
                  {currencySymbol}{feeAmount.toLocaleString('nl-NL')}
                </span>
              </div>
              {formData.currency_code !== 'EUR' && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">EUR equivalent</span>
                  <span className="text-xs text-muted-foreground">
                    ~€{feeAmountEur.toLocaleString('nl-NL')}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Fee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
