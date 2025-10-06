import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Stage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid';
  resources?: string[];
  description?: string;
}

export const usePipelineManagement = (jobId: string) => {
  const [saving, setSaving] = useState(false);

  const logAudit = async (action: string, stageData: any, metadata?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('pipeline_audit_logs')
        .insert({
          job_id: jobId,
          user_id: user.id,
          action,
          stage_data: stageData,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  };

  const savePipeline = async (stages: Stage[], action: string = 'stage_updated') => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ pipeline_stages: stages as any })
        .eq('id', jobId);

      if (error) throw error;

      await logAudit(action, { stages });
      
      return { success: true };
    } catch (error) {
      console.error('Error saving pipeline:', error);
      toast.error("Failed to save pipeline");
      return { success: false, error };
    } finally {
      setSaving(false);
    }
  };

  const addStage = async (stages: Stage[], newStage: Stage) => {
    const updatedStages = [...stages, newStage];
    await logAudit('stage_added', { stage: newStage });
    return savePipeline(updatedStages, 'stage_added');
  };

  const removeStage = async (stages: Stage[], index: number) => {
    const removedStage = stages[index];
    const updatedStages = stages
      .filter((_, i) => i !== index)
      .map((stage, i) => ({ ...stage, order: i }));
    
    await logAudit('stage_removed', { stage: removedStage });
    return savePipeline(updatedStages, 'stage_removed');
  };

  const reorderStages = async (stages: Stage[]) => {
    await logAudit('stage_reordered', { stages });
    return savePipeline(stages, 'stage_reordered');
  };

  return {
    saving,
    savePipeline,
    addStage,
    removeStage,
    reorderStages,
  };
};
