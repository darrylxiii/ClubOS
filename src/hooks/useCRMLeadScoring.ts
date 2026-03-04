import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadScoreBreakdown } from '@/types/crm';
import { toast } from 'sonner';

export const useCRMLeadScoring = (prospectId: string) => {
  const [scoreBreakdown, setScoreBreakdown] = useState<LeadScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateLeadScore = async () => {
    if (!prospectId) return null;
    setLoading(true);
    try {
      const scores: LeadScoreBreakdown = {
        assessment: 0,
        engagement: 0,
        profile: 0,
        referrals: 0,
        skills_match: 0,
        total: 0,
      };

      // Get prospect data
      const { data: prospect } = await supabase
        .from('crm_prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (!prospect) {
        throw new Error('Prospect not found');
      }

      // 1. Engagement Score (Max 40 points) — based on touchpoints and replies
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [touchpointsRes, repliesRes] = await Promise.all([
        supabase
          .from('crm_touchpoints')
          .select('*', { count: 'exact', head: true })
          .eq('prospect_id', prospectId)
          .gte('occurred_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('crm_email_replies')
          .select('*', { count: 'exact', head: true })
          .eq('prospect_id', prospectId),
      ]);

      const touchpointCount = touchpointsRes.count || 0;
      const replyCount = repliesRes.count || 0;

      // Touchpoints (20 points max, 4 points per touchpoint)
      scores.engagement += Math.min(20, touchpointCount * 4);
      // Replies (20 points max, 10 points per reply)
      scores.engagement += Math.min(20, replyCount * 10);

      // 2. Profile Completeness (Max 30 points)
      let profileFields = 0;
      if (prospect.full_name) profileFields++;
      if (prospect.email) profileFields++;
      if (prospect.company_name) profileFields++;
      if (prospect.job_title) profileFields++;
      if (prospect.phone) profileFields++;
      if (prospect.linkedin_url) profileFields++;
      if (prospect.company_domain) profileFields++;
      if (prospect.industry) profileFields++;
      scores.profile = (profileFields / 8) * 30;

      // 3. Assessment (Max 15 points) — based on stage progression
      const stageScores: Record<string, number> = {
        new: 0,
        contacted: 3,
        interested: 7,
        qualified: 10,
        meeting_booked: 13,
        proposal_sent: 14,
        won: 15,
      };
      scores.assessment = stageScores[prospect.stage] || 0;

      // 4. Source quality (Max 10 points)
      const sourceScores: Record<string, number> = {
        partner_funnel: 10,
        referral: 8,
        website: 7,
        linkedin: 5,
        instantly: 3,
        csv_import: 2,
        manual: 1,
      };
      scores.referrals = sourceScores[prospect.source || ''] || 0;

      // 5. Reply sentiment bonus (Max 5 points)
      const sentimentScores: Record<string, number> = {
        hot: 5,
        warm: 3,
        neutral: 1,
        cold: 0,
      };
      scores.skills_match = sentimentScores[prospect.reply_sentiment || ''] || 0;

      // Calculate total
      scores.total = Math.round(
        scores.assessment +
        scores.engagement +
        scores.profile +
        scores.referrals +
        scores.skills_match
      );

      setScoreBreakdown(scores);

      // Update the prospect's composite_score
      await supabase
        .from('crm_prospects')
        .update({
          composite_score: scores.total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

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
    if (prospectId) {
      calculateLeadScore();
    }
  }, [prospectId]);

  return {
    scoreBreakdown,
    loading,
    recalculateScore,
  };
};
