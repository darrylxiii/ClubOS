import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  detectCandidateStage, 
  getNextStepsForStage,
  getStageCompletionPercent,
  getStageInfo,
  getCompletedTasksCount,
  getTotalTasksCount,
  CandidateStage,
  type UserJourneyData,
  type JourneyTask
} from '@/lib/candidateJourney';

export interface NextStepsState {
  tasks: JourneyTask[];
  stage: CandidateStage;
  stageInfo: {
    name: string;
    description: string;
    color: string;
  };
  stageCompletion: number;
  overallProgress: {
    completed: number;
    total: number;
    percent: number;
  };
  userData: UserJourneyData | null;
}

export const useNextSteps = () => {
  const { user } = useAuth();
  const [state, setState] = useState<NextStepsState>({
    tasks: [],
    stage: CandidateStage.NEW_USER,
    stageInfo: getStageInfo(CandidateStage.NEW_USER),
    stageCompletion: 0,
    overallProgress: { completed: 0, total: getTotalTasksCount(), percent: 0 },
    userData: null,
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
      const [profileRes, calendarRes, applicationsRes, userMetaRes, interviewsRes, referralsRes, notificationsRes, clubSyncRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('resume_url, email_verified, phone_verified, linkedin_url, career_preferences, avatar_url, created_at')
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
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('created_at, updated_at')
          .eq('id', user.id)
          .single(),
        (supabase as any)
          .from('interviews')
          .select('id', { count: 'exact', head: true })
          .eq('candidate_id', user.id)
          .in('status', ['scheduled', 'confirmed']),
        (supabase as any)
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referred_by', user.id),
        supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('club_sync_enabled')
          .eq('id', user.id)
          .single()
      ]);

      const profile = profileRes.data;
      const calendarCount = calendarRes.count || 0;
      const applicationsCount = applicationsRes.count || 0;
      const interviewsCount = interviewsRes.count || 0;
      const referralsCount = referralsRes.count || 0;
      const notificationsConfigured = !!notificationsRes.data;
      const clubSyncEnabled = clubSyncRes.data?.club_sync_enabled || false;

      // Build user journey data
      const userData: UserJourneyData = {
        userId: user.id,
        signupDate: profile?.created_at ? new Date(profile.created_at) : new Date(),
        resumeUploaded: !!profile?.resume_url,
        calendarConnected: calendarCount > 0,
        applicationsCount: applicationsCount,
        interviewsScheduled: interviewsCount,
        emailVerified: profile?.email_verified || false,
        phoneVerified: profile?.phone_verified || false,
        hasAvatar: !!profile?.avatar_url,
        hasLinkedIn: !!profile?.linkedin_url,
        hasBio: !!(profile?.career_preferences && profile.career_preferences.length > 50),
        hasCareerPreferences: !!profile?.career_preferences,
        referralsCount: referralsCount,
        notificationsConfigured: notificationsConfigured,
        clubSyncEnabled: clubSyncEnabled,
        lastActive: userMetaRes.data?.updated_at ? new Date(userMetaRes.data.updated_at) : new Date(),
      };

      // Detect current stage
      const currentStage = detectCandidateStage(userData);
      
      // Get next steps for this stage
      const nextSteps = getNextStepsForStage(currentStage, userData);
      
      // Calculate progress
      const stageCompletion = getStageCompletionPercent(currentStage, userData);
      const completedCount = getCompletedTasksCount(userData);
      const totalCount = getTotalTasksCount();
      
      setState({
        tasks: nextSteps,
        stage: currentStage,
        stageInfo: getStageInfo(currentStage),
        stageCompletion,
        overallProgress: {
          completed: completedCount,
          total: totalCount,
          percent: Math.round((completedCount / totalCount) * 100)
        },
        userData,
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
    ...state,
    loading,
    refetch: fetchCompletionStatus,
    markTaskComplete,
  };
};
