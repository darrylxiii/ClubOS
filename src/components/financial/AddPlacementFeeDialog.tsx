import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export function AddPlacementFeeDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    job_id: '',
    candidate_salary: '',
    fee_percentage: '20',
    hired_date: new Date().toISOString().split('T')[0],
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

      const salary = parseFloat(formData.candidate_salary);
      const feePercentage = parseFloat(formData.fee_percentage);
      const feeAmount = salary * (feePercentage / 100);

      const { error } = await supabase.from('placement_fees').insert({
        job_id: formData.job_id,
        partner_company_id: (selectedJob as any).company_id,
        candidate_salary: salary,
        fee_percentage: feePercentage,
        fee_amount: feeAmount,
        currency_code: 'EUR',
        status: 'pending',
        hired_date: formData.hired_date,
        payment_due_date: new Date(new Date(formData.hired_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Candidate Salary (€)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="hired_date">Hired Date</Label>
            <Input
              id="hired_date"
              type="date"
              value={formData.hired_date}
              onChange={(e) => setFormData(prev => ({ ...prev, hired_date: e.target.value }))}
            />
          </div>

          {formData.candidate_salary && formData.fee_percentage && (
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Calculated Fee: </span>
              <span className="font-semibold">
                €{(parseFloat(formData.candidate_salary || '0') * parseFloat(formData.fee_percentage || '0') / 100).toLocaleString('nl-NL')}
              </span>
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
