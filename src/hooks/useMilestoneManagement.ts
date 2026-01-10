import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema for milestone form
export const milestoneSchema = z.object({
  display_name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be under 50 characters'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  threshold_amount: z.number()
    .positive('Amount must be greater than 0')
    .max(100000000, 'Amount seems too high'),
  ladder_id: z.string().uuid('Please select a track'),
  default_category: z.enum(['enablement', 'experience', 'assets', 'cash']).optional().nullable(),
  suggested_reward_min: z.number().min(0, 'Min reward cannot be negative').optional().nullable(),
  suggested_reward_max: z.number().min(0, 'Max reward cannot be negative').optional().nullable(),
  display_order: z.number().int().min(0, 'Order must be positive'),
  fiscal_year: z.number().int().min(2020).max(2100).optional().nullable(),
}).refine(data => {
  if (data.suggested_reward_min && data.suggested_reward_max) {
    return data.suggested_reward_max >= data.suggested_reward_min;
  }
  return true;
}, {
  message: 'Max reward must be greater than min',
  path: ['suggested_reward_max'],
});

export type MilestoneFormData = z.infer<typeof milestoneSchema>;

export interface MilestoneInput {
  display_name: string;
  description?: string | null;
  threshold_amount: number;
  ladder_id: string;
  default_category?: string | null;
  suggested_reward_range?: { min?: number; max?: number } | null;
  display_order: number;
  fiscal_year?: number | null;
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MilestoneInput) => {
      const { data, error } = await supabase
        .from('revenue_milestones')
        .insert({
          display_name: input.display_name,
          description: input.description,
          threshold_amount: input.threshold_amount,
          ladder_id: input.ladder_id,
          default_category: input.default_category,
          suggested_reward_range: input.suggested_reward_range || {},
          display_order: input.display_order,
          fiscal_year: input.fiscal_year,
          status: 'locked',
          progress_percentage: 0,
          achieved_revenue: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-ladders'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-milestones'] });
      toast.success('Milestone created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create milestone: ${error.message}`);
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: MilestoneInput & { id: string }) => {
      const { data, error } = await supabase
        .from('revenue_milestones')
        .update({
          display_name: input.display_name,
          description: input.description,
          threshold_amount: input.threshold_amount,
          ladder_id: input.ladder_id,
          default_category: input.default_category,
          suggested_reward_range: input.suggested_reward_range || {},
          display_order: input.display_order,
          fiscal_year: input.fiscal_year,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-ladders'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-milestones'] });
      toast.success('Milestone updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('revenue_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-ladders'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-milestones'] });
      toast.success('Milestone deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete milestone: ${error.message}`);
    },
  });
}

export function useReorderMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      // Update each milestone's order
      const promises = updates.map(({ id, display_order }) =>
        supabase
          .from('revenue_milestones')
          .update({ display_order })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error('Failed to reorder some milestones');
      
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-ladders'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-milestones'] });
      toast.success('Milestones reordered');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder: ${error.message}`);
    },
  });
}

export function useMilestoneManagement() {
  const createMutation = useCreateMilestone();
  const updateMutation = useUpdateMilestone();
  const deleteMutation = useDeleteMilestone();
  const reorderMutation = useReorderMilestones();

  return {
    createMilestone: createMutation.mutateAsync,
    updateMilestone: updateMutation.mutateAsync,
    deleteMilestone: deleteMutation.mutateAsync,
    reorderMilestones: reorderMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
