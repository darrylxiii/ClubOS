import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadScoreBreakdown } from '@/types/crm';
import { toast } from 'sonner';

export const useCRMLeadScoring = (contactId: string) => {
  const [scoreBreakdown, setScoreBreakdown] = useState<LeadScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateLeadScore = async () => {
    setLoading(true);
    try {
      const scores: LeadScoreBreakdown = {
        assessment: 0,      // Max 40 points
        engagement: 0,      // Max 30 points
        profile: 0,         // Max 15 points
        referrals: 0,       // Max 10 points
        skills_match: 0,    // Max 5 points
        total: 0
      };

      // Get contact and profile data
      const { data: contact } = await supabase
        .from('crm_contacts' as any)
        .select('profile_id')
        .eq('id', contactId)
        .single();

      if (!contact) {
        throw new Error('Contact not found');
      }

      const userId = (contact as any).profile_id;

      // 1. Assessment Score (Max 40 points)
      const { data: assessments } = await supabase
        .from('candidate_assessment_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (assessments) {
        // Pressure Cooker score (15 points)
        if (assessments.prioritization_skill) {
          scores.assessment += assessments.prioritization_skill * 0.15;
        }
        // Self-awareness score (15 points)
        if (assessments.self_awareness_score) {
          scores.assessment += assessments.self_awareness_score * 0.15;
        }
        // Value consistency (10 points)
        if (assessments.value_consistency_score) {
          scores.assessment += assessments.value_consistency_score * 0.10;
        }
      }

      // 2. Engagement Score (Max 30 points)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [messagesRes, activitiesRes, loginsRes] = await Promise.all([
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('crm_activities' as any)
          .select('*', { count: 'exact', head: true })
          .eq('created_by', userId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('profiles')
          .select('updated_at')
          .eq('id', userId)
          .single()
      ]);

      const messageCount = messagesRes.count || 0;
      const activityCount = activitiesRes.count || 0;
      
      // Messages (10 points, 1 point per 2 messages)
      scores.engagement += Math.min(10, messageCount * 0.5);
      
      // Activities (10 points, 2 points per activity)
      scores.engagement += Math.min(10, activityCount * 2);
      
      // Recent activity (10 points if active in last 7 days)
      if (loginsRes.data?.updated_at) {
        const lastSeen = new Date(loginsRes.data.updated_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (lastSeen > sevenDaysAgo) {
          scores.engagement += 10;
        }
      }

      // 3. Profile Completeness (Max 15 points)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        let profileFields = 0;
        if (profile.full_name) profileFields++;
        if (profile.email) profileFields++;
        if (profile.avatar_url) profileFields++;
        if (profile.location) profileFields++;
        
        scores.profile = (profileFields / 4) * 15;
      }

      // 4. Referrals (Max 10 points)
      const { count: referralCount } = await supabase
        .from('referrals' as any)
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', userId)
        .eq('status', 'hired');

      scores.referrals = Math.min(10, (referralCount || 0) * 5);

      // 5. Skills Match (Max 5 points) - placeholder for now
      // This would compare skills against open jobs
      scores.skills_match = 0;

      // Calculate total
      scores.total = Math.round(
        scores.assessment +
        scores.engagement +
        scores.profile +
        scores.referrals +
        scores.skills_match
      );

      setScoreBreakdown(scores);

      // Update the contact's lead score in the database
      await supabase
        .from('crm_contacts' as any)
        .update({ 
          lead_score: scores.total,
          engagement_score: Math.round(scores.engagement)
        })
        .eq('id', contactId);

      return scores;
    } catch (error) {
      console.error('Error calculating lead score:', error);
      toast.error('Failed to calculate lead score');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const recalculateScore = () => {
    calculateLeadScore();
  };

  useEffect(() => {
    if (contactId) {
      calculateLeadScore();
    }
  }, [contactId]);

  return {
    scoreBreakdown,
    loading,
    recalculateScore
  };
};
