import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AchievementEventType =
  | 'signup'
  | 'profile_update'
  | 'application_submit'
  | 'application_advance'
  | 'application_hired'
  | 'course_start'
  | 'course_complete'
  | 'module_complete'
  | 'assessment_complete'
  | 'assessment_perfect'
  | 'referral_join'
  | 'referral_hired'
  | 'interview_complete'
  | 'connection_made'
  | 'job_saved'
  | 'job_viewed'
  | 'message_sent'
  | 'login'
  | 'post_created'
  | 'reaction_given'
  | 'mentor_session'
  | 'document_upload'
  | 'xp_earned';

interface AchievementEvent {
  eventType: AchievementEventType;
  eventData?: Record<string, unknown>;
}

export const useAchievementTrigger = () => {
  const { user } = useAuth();

  const triggerAchievementCheck = useCallback(
    async ({ eventType, eventData = {} }: AchievementEvent) => {
      if (!user?.id) return;

      try {
        // Call the achievement evaluator edge function
        const { data, error } = await supabase.functions.invoke('achievement-evaluator', {
          body: {
            userId: user.id,
            eventType,
            eventData,
          },
        });

        if (error) {
          console.error('[Achievement Trigger] Error:', error);
          return;
        }

        // If achievements were unlocked, show notifications
        if (data?.unlockedAchievements && data.unlockedAchievements.length > 0) {
          for (const achievement of data.unlockedAchievements) {
            // Dispatch custom event for achievement unlock toast
            window.dispatchEvent(
              new CustomEvent('achievementUnlocked', {
                detail: achievement,
              })
            );
          }
        }

        return data;
      } catch (error) {
        console.error('[Achievement Trigger] Unexpected error:', error);
      }
    },
    [user?.id]
  );

  return { triggerAchievementCheck };
};
