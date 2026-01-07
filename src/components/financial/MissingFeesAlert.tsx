import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface MissingFee {
  job_id: string;
  title: string;
  company_name: string;
  company_id: string;
  hired_application_id: string;
  candidate_id: string;
  actual_salary: number;
  placement_fee: number;
  actual_closing_date: string;
  sourced_by: string | null;
  sourcer_name: string | null;
  closed_by: string | null;
  closer_name: string | null;
}

export function MissingFeesAlert() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: missingFees, isLoading } = useQuery({
    queryKey: ['missing-placement-fees'],
    queryFn: async () => {
      // Query job_closures for hired jobs
      const { data: closures, error: closuresError } = await supabase
        .from('job_closures')
        .select(`
          job_id,
          hired_application_id,
          actual_salary,
          placement_fee,
          actual_closing_date,
          sourced_by,
          sourcer_name,
          closed_by,
          closer_name,
          jobs!inner (
            title,
            company_id,
            companies!inner (name)
          )
        `)
        .eq('closure_type', 'hired')
        .not('hired_application_id', 'is', null);

      if (closuresError) throw closuresError;

      // Filter out jobs that already have placement fees
      const { data: existingFees } = await supabase
        .from('placement_fees')
        .select('job_id');

      const existingJobIds = new Set((existingFees || []).map(f => f.job_id));
      
      return (closures || [])
        .filter((jc: any) => !existingJobIds.has(jc.job_id))
        .map((jc: any) => ({
          job_id: jc.job_id,
          title: jc.jobs?.title,
          company_name: jc.jobs?.companies?.name,
          company_id: jc.jobs?.company_id,
          hired_application_id: jc.hired_application_id,
          actual_salary: jc.actual_salary,
          placement_fee: jc.placement_fee,
          actual_closing_date: jc.actual_closing_date,
          sourced_by: jc.sourced_by,
          sourcer_name: jc.sourcer_name,
          closed_by: jc.closed_by,
          closer_name: jc.closer_name,
        })) as MissingFee[];
    },
  });

  const generateMissingFees = async () => {
    if (!missingFees?.length) return;

    setIsGenerating(true);
    try {
      // Get candidate_id for each application
      const appIds = missingFees.map(f => f.hired_application_id);
      const { data: applications } = await supabase
        .from('applications')
        .select('id, candidate_id')
        .in('id', appIds);

      const appMap = new Map((applications || []).map(a => [a.id, a.candidate_id]));

      // Insert placement fees
      const feesToInsert = missingFees.map(fee => ({
        job_id: fee.job_id,
        candidate_id: appMap.get(fee.hired_application_id),
        application_id: fee.hired_application_id,
        partner_company_id: fee.company_id,
        fee_percentage: 20,
        candidate_salary: fee.actual_salary,
        fee_amount: fee.placement_fee,
        currency_code: 'EUR',
        status: 'pending' as const,
        hired_date: fee.actual_closing_date,
        payment_due_date: new Date(new Date(fee.actual_closing_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        sourced_by: fee.sourced_by,
        sourcer_name: fee.sourcer_name,
        closed_by: fee.closed_by,
        closer_name: fee.closer_name,
      }));

      const { error } = await supabase
        .from('placement_fees')
        .insert(feesToInsert);

      if (error) throw error;

      toast.success(`Generated ${feesToInsert.length} placement fee(s)`);
      queryClient.invalidateQueries({ queryKey: ['missing-placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fee-health'] });
    } catch (error) {
      console.error('Error generating fees:', error);
      toast.error('Failed to generate placement fees');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || !missingFees?.length) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Missing Placement Fees Detected</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {missingFees.length} job(s) were closed as "hired" but don't have placement fee records:{' '}
          {missingFees.map(f => f.title).join(', ')}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateMissingFees}
          disabled={isGenerating}
          className="ml-4 shrink-0"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Generate Fees
        </Button>
      </AlertDescription>
    </Alert>
  );
}
