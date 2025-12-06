import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PipelineStageMapping {
  id: string;
  job_stage_pattern: string;
  deal_stage_id: string | null;
  priority: number;
  is_default: boolean;
  match_type: 'exact' | 'contains' | 'starts_with' | 'ends_with';
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deal_stage?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface DealStage {
  id: string;
  name: string;
  color: string;
  stage_order: number;
  probability_weight: number;
  stage_type: string;
  is_terminal: boolean;
}

export const usePipelineStageMappings = () => {
  const queryClient = useQueryClient();

  const { data: mappings, isLoading: mappingsLoading, error: mappingsError } = useQuery({
    queryKey: ['pipeline-stage-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stage_mappings')
        .select(`
          *,
          deal_stage:deal_stages(id, name, color)
        `)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as PipelineStageMapping[];
    }
  });

  const { data: dealStages, isLoading: stagesLoading } = useQuery({
    queryKey: ['deal-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_stages')
        .select('*')
        .order('stage_order', { ascending: true });

      if (error) throw error;
      return data as DealStage[];
    }
  });

  const createMapping = useMutation({
    mutationFn: async (mapping: Omit<PipelineStageMapping, 'id' | 'created_at' | 'updated_at' | 'deal_stage'>) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('pipeline_stage_mappings')
        .insert({
          ...mapping,
          created_by: user?.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stage-mappings'] });
      toast.success("Mapping created successfully");
    },
    onError: (error) => {
      console.error('Error creating mapping:', error);
      toast.error("Failed to create mapping");
    }
  });

  const updateMapping = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineStageMapping> & { id: string }) => {
      const { data, error } = await supabase
        .from('pipeline_stage_mappings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stage-mappings'] });
      toast.success("Mapping updated successfully");
    },
    onError: (error) => {
      console.error('Error updating mapping:', error);
      toast.error("Failed to update mapping");
    }
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pipeline_stage_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stage-mappings'] });
      toast.success("Mapping deleted successfully");
    },
    onError: (error) => {
      console.error('Error deleting mapping:', error);
      toast.error("Failed to delete mapping");
    }
  });

  const backfillDealStages = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('backfill_deal_stages');
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
      toast.success(`Updated ${count} jobs with correct deal stages`);
    },
    onError: (error) => {
      console.error('Error backfilling deal stages:', error);
      toast.error("Failed to backfill deal stages");
    }
  });

  const testMapping = (stagePattern: string): string | null => {
    if (!mappings || !dealStages) return null;

    const lowerPattern = stagePattern.toLowerCase();
    let bestMatch: { priority: number; dealStageName: string } | null = null;

    for (const mapping of mappings) {
      if (!mapping.deal_stage) continue;

      let matches = false;
      const mapPattern = mapping.job_stage_pattern.toLowerCase();

      switch (mapping.match_type) {
        case 'exact':
          matches = lowerPattern === mapPattern;
          break;
        case 'contains':
          matches = lowerPattern.includes(mapPattern);
          break;
        case 'starts_with':
          matches = lowerPattern.startsWith(mapPattern);
          break;
        case 'ends_with':
          matches = lowerPattern.endsWith(mapPattern);
          break;
      }

      if (matches && (!bestMatch || mapping.priority > bestMatch.priority)) {
        bestMatch = {
          priority: mapping.priority,
          dealStageName: mapping.deal_stage.name
        };
      }
    }

    return bestMatch?.dealStageName || 'New';
  };

  return {
    mappings,
    dealStages,
    isLoading: mappingsLoading || stagesLoading,
    error: mappingsError,
    createMapping,
    updateMapping,
    deleteMapping,
    backfillDealStages,
    testMapping
  };
};
