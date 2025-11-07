import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NextStepTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  action: () => void;
  taskKey: string;
}

export interface NextStepsData {
  resumeUploaded: boolean;
  calendarConnected: boolean;
  hasApplications: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasLinkedIn: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
}

export const useNextSteps = () => {
  const { user } = useAuth();
  const [data, setData] = useState<NextStepsData>({
    resumeUploaded: false,
    calendarConnected: false,
    hasApplications: false,
    emailVerified: false,
    phoneVerified: false,
    hasLinkedIn: false,
    hasBio: false,
    hasAvatar: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchCompletionStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all data in parallel
      const [profileRes, calendarRes, applicationsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('resume_url, email_verified, phone_verified, linkedin_url, career_preferences, avatar_url')
          .eq('id', user.id)
          .single(),
        supabase
          .from('calendar_connections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
      ]);

      const profile = profileRes.data;
      const calendarCount = calendarRes.count || 0;
      const applicationsCount = applicationsRes.count || 0;

      setData({
        resumeUploaded: !!profile?.resume_url,
        calendarConnected: calendarCount > 0,
        hasApplications: applicationsCount > 0,
        emailVerified: profile?.email_verified || false,
        phoneVerified: profile?.phone_verified || false,
        hasLinkedIn: !!profile?.linkedin_url,
        hasBio: !!profile?.career_preferences,
        hasAvatar: !!profile?.avatar_url,
      });
    } catch (error) {
      console.error('Error fetching next steps:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markTaskComplete = useCallback(async (taskKey: string) => {
    if (!user) return;

    try {
      // Update profile_strength_tasks table
      await supabase.from('profile_strength_tasks').upsert({
        user_id: user.id,
        task_key: taskKey,
        completed: true,
        completed_at: new Date().toISOString(),
        role: 'user',
        task_level: 1,
      });

      // Refresh completion status
      await fetchCompletionStatus();
    } catch (error) {
      console.error('Error marking task complete:', error);
    }
  }, [user, fetchCompletionStatus]);

  useEffect(() => {
    fetchCompletionStatus();
  }, [fetchCompletionStatus]);

  return {
    data,
    loading,
    refetch: fetchCompletionStatus,
    markTaskComplete,
  };
};
