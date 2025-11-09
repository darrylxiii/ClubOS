import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AssessmentAssignment } from '@/types/assessment';

export const useAssessmentAssignments = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createAssignment = async (params: {
    assessment_id: string;
    assessment_type: 'built-in' | 'custom';
    assigned_to: string[];
    due_date?: string;
    notes?: string;
    company_id?: string;
    job_id?: string;
  }) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const assignments = params.assigned_to.map(userId => ({
        assessment_id: params.assessment_id,
        assessment_type: params.assessment_type,
        assigned_to: userId,
        assigned_by: user.id,
        due_date: params.due_date,
        notes: params.notes,
        company_id: params.company_id,
        job_id: params.job_id,
        status: 'pending' as const,
      }));

      const { data, error } = await supabase
        .from('assessment_assignments')
        .insert(assignments)
        .select();

      if (error) throw error;

      toast({
        title: 'Assessments assigned',
        description: `Successfully assigned to ${params.assigned_to.length} candidate(s)`,
      });

      return { success: true, data };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const getAssignments = async (filters?: {
    assigned_to?: string;
    assigned_by?: string;
    status?: string;
    assessment_id?: string;
  }) => {
    try {
      let query = supabase
        .from('assessment_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.assigned_by) {
        query = query.eq('assigned_by', filters.assigned_by);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assessment_id) {
        query = query.eq('assessment_id', filters.assessment_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data as AssessmentAssignment[] };
    } catch (error: any) {
      toast({
        title: 'Error loading assignments',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const updateAssignmentStatus = async (
    assignmentId: string,
    status: 'in_progress' | 'completed' | 'expired',
    resultId?: string
  ) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        if (resultId) {
          updateData.result_id = resultId;
        }
      }

      const { error } = await supabase
        .from('assessment_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating assignment',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const sendReminder = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assessment_assignments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: 'Reminder sent',
        description: 'Assessment reminder has been sent to the candidate',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error sending reminder',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  return {
    loading,
    createAssignment,
    getAssignments,
    updateAssignmentStatus,
    sendReminder,
  };
};
