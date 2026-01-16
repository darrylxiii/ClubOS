import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContinuousHireInput {
  jobId: string;
  applicationId: string;
  candidateId?: string;
  actualSalary: number;
  placementFee: number;
  notes?: string;
}

interface ContinuousHireResult {
  hireId: string;
  hireNumber: number;
  placementFeeId?: string;
}

export function useContinuousPipelineHire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContinuousHireInput): Promise<ContinuousHireResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current hired_count to determine hire_number
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('hired_count, company_id, title, created_at')
        .eq('id', input.jobId)
        .single();

      if (jobError) throw jobError;
      
      const hireNumber = (job.hired_count || 0) + 1;
      const createdAt = job.created_at ?? new Date().toISOString();
      const daysToFill = Math.floor(
        (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Insert continuous hire record (trigger will increment hired_count)
      const { data: hire, error: hireError } = await (supabase as any)
        .from('continuous_pipeline_hires')
        .insert({
          job_id: input.jobId,
          application_id: input.applicationId,
          candidate_id: input.candidateId,
          hire_number: hireNumber,
          actual_salary: input.actualSalary,
          placement_fee: input.placementFee,
          days_to_fill: daysToFill,
          created_by: user.id,
          notes: input.notes,
        })
        .select()
        .single();

      if (hireError) throw hireError;

      // Create placement fee record linked to continuous hire
      const { data: placementFee, error: feeError } = await supabase
        .from('placement_fees')
        .insert({
          job_id: input.jobId,
          application_id: input.applicationId,
          candidate_id: input.candidateId,
          company_id: job.company_id,
          fee_percentage: 0, // Will be calculated from actual values
          base_salary: input.actualSalary,
          fee_amount: input.placementFee,
          status: 'pending',
          continuous_hire_id: hire.id,
          hire_sequence: hireNumber,
        } as any)
        .select()
        .single();

      if (feeError) {
        console.error('Failed to create placement fee:', feeError);
      }

      // Update application status to hired
      await supabase
        .from('applications')
        .update({ status: 'hired' })
        .eq('id', input.applicationId);

      // Log audit event
      await supabase
        .from('pipeline_audit_logs')
        .insert({
          job_id: input.jobId,
          user_id: user.id,
          action: 'continuous_hire_made',
          stage_data: {
            hire_number: hireNumber,
            application_id: input.applicationId,
            candidate_id: input.candidateId,
            actual_salary: input.actualSalary,
            placement_fee: input.placementFee,
          },
        });

      return {
        hireId: hire.id,
        hireNumber,
        placementFeeId: placementFee?.id,
      };
    },
    onSuccess: (data) => {
      toast.success(`Hire #${data.hireNumber} recorded successfully`);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['continuous-hires'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fees'] });
    },
    onError: (error) => {
      console.error('Continuous hire error:', error);
      toast.error("Failed to record hire");
    },
  });
}

export function useContinuousPipelineHires(jobId: string | undefined) {
  const queryClient = useQueryClient();
  
  return {
    data: [] as any[], // Placeholder - would use useQuery
    isLoading: false,
  };
}
