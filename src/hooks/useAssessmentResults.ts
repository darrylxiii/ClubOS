import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';

export interface SaveAssessmentResultParams {
  assessmentId: string;
  assessmentName: string;
  assessmentType: 'personality' | 'skills' | 'culture' | 'technical';
  resultsData: any;
  score?: number;
}

/**
 * Hook for saving and retrieving assessment results
 * Use this in any assessment component to automatically save results to the database
 * 
 * @example
 * const { saveResult, loading } = useAssessmentResults();
 * 
 * await saveResult({
 *   assessmentId: 'miljoenenjacht',
 *   assessmentName: 'Deal or No Deal Assessment',
 *   assessmentType: 'personality',
 *   resultsData: psychologicalProfile,
 *   score: 85
 * });
 */
export const useAssessmentResults = () => {
  const { user } = useAuth();

  const saveResult = async (params: SaveAssessmentResultParams) => {
    if (!user) {
      notify.error('Authentication Required', { description: 'You must be logged in to save assessment results.' });
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .insert({
          user_id: user.id,
          assessment_id: params.assessmentId,
          assessment_name: params.assessmentName,
          assessment_type: params.assessmentType,
          results_data: params.resultsData,
          score: params.score || null,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      console.error('Error saving assessment result:', error);
      notify.error('Failed to save assessment results. Please try again.');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getUserResults = async (assessmentId?: string) => {
    if (!user) return { success: false, data: [], error: 'Not authenticated' };

    try {
      let query = supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: unknown) {
      console.error('Error fetching assessment results:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return {
    saveResult,
    getUserResults,
  };
};
