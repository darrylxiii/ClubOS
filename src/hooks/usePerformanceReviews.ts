import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  status: 'draft' | 'pending' | 'completed';
  overall_rating: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  goals: string | null;
  comments: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OneOnOneNote {
  id: string;
  employee_id: string;
  manager_id: string;
  meeting_date: string;
  agenda: string | null;
  discussion_notes: string | null;
  action_items: string | null;
  created_at: string;
}

export interface TrainingRecord {
  id: string;
  employee_id: string;
  training_name: string;
  training_type: string;
  provider: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  certificate_url: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  created_at: string;
}

export interface OnboardingItem {
  id: string;
  employee_id: string;
  task_name: string;
  category: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

// Performance Reviews
export function usePerformanceReviews(employeeId?: string) {
  return useQuery({
    queryKey: ['performance-reviews', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('performance_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PerformanceReview[];
    },
  });
}

export function useCreatePerformanceReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (review: { employee_id: string; review_period: string; strengths?: string; areas_for_improvement?: string; goals?: string; comments?: string; overall_rating?: number }) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .insert({
          employee_id: review.employee_id,
          review_period: review.review_period,
          reviewer_id: user?.id,
          status: 'draft',
          strengths: review.strengths,
          areas_for_improvement: review.areas_for_improvement,
          goals: review.goals,
          comments: review.comments,
          overall_rating: review.overall_rating,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
    },
  });
}

export function useUpdatePerformanceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; overall_rating?: number; strengths?: string; areas_for_improvement?: string; goals?: string; comments?: string; completed_at?: string }) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
    },
  });
}

// 1:1 Notes
export function useOneOnOneNotes(employeeId?: string) {
  return useQuery({
    queryKey: ['one-on-one-notes', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('one_on_one_notes')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OneOnOneNote[];
    },
  });
}

export function useCreateOneOnOneNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (note: { employee_id: string; meeting_date: string; agenda?: string; discussion_notes?: string; action_items?: string }) => {
      const { data, error } = await supabase
        .from('one_on_one_notes')
        .insert({
          employee_id: note.employee_id,
          meeting_date: note.meeting_date,
          manager_id: user?.id,
          agenda: note.agenda,
          discussion_notes: note.discussion_notes,
          action_items: note.action_items,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one-notes'] });
    },
  });
}

// Training Records
export function useTrainingRecords(employeeId?: string) {
  return useQuery({
    queryKey: ['training-records', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('training_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TrainingRecord[];
    },
  });
}

export function useCreateTrainingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: { employee_id: string; training_name: string; training_type: string; provider?: string; completion_date?: string; expiry_date?: string; certificate_url?: string; status?: string }) => {
      const { data, error } = await supabase
        .from('training_records')
        .insert({
          employee_id: record.employee_id,
          training_name: record.training_name,
          training_type: record.training_type,
          provider: record.provider,
          completion_date: record.completion_date,
          expiry_date: record.expiry_date,
          certificate_url: record.certificate_url,
          status: record.status || 'not_started',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records'] });
    },
  });
}

// Onboarding Checklists
export function useOnboardingChecklists(employeeId?: string) {
  return useQuery({
    queryKey: ['onboarding-checklists', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('onboarding_checklists')
        .select('*')
        .order('due_date', { ascending: true });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OnboardingItem[];
    },
  });
}

export function useUpdateOnboardingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('onboarding_checklists')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklists'] });
    },
  });
}
