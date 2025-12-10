import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProspectScoreBreakdown {
  engagement: number;      // Max 40 points (opens, clicks, replies)
  companyFit: number;      // Max 25 points (size, industry match)
  roleSeniority: number;   // Max 20 points (title analysis)
  replySentiment: number;  // Max 15 points (positive/negative/neutral)
  total: number;
}

export function useCRMProspectScoring() {
  const [loading, setLoading] = useState(false);

  const calculateProspectScore = useCallback(async (prospectId: string): Promise<ProspectScoreBreakdown | null> => {
    setLoading(true);
    try {
      const scores: ProspectScoreBreakdown = {
        engagement: 0,
        companyFit: 0,
        roleSeniority: 0,
        replySentiment: 0,
        total: 0
      };

      // Fetch prospect data
      const { data: prospect, error } = await supabase
        .from('crm_prospects' as any)
        .select('*')
        .eq('id', prospectId)
        .single();

      if (error || !prospect) {
        throw new Error('Prospect not found');
      }

      // 1. Engagement Score (Max 40 points)
      const emailOpens = (prospect as any).email_opens || 0;
      const emailClicks = (prospect as any).email_clicks || 0;
      const replyCount = (prospect as any).reply_count || 0;

      scores.engagement = Math.min(40, 
        (emailOpens * 2) + 
        (emailClicks * 5) + 
        (replyCount * 15)
      );

      // 2. Company Fit Score (Max 25 points)
      const companySize = (prospect as any).company_size || '';
      const industry = (prospect as any).industry || '';
      
      // Prefer enterprise companies
      if (companySize.includes('1000+') || companySize.includes('enterprise')) {
        scores.companyFit += 15;
      } else if (companySize.includes('500') || companySize.includes('mid')) {
        scores.companyFit += 10;
      } else if (companySize.includes('100') || companySize.includes('small')) {
        scores.companyFit += 5;
      }

      // Industry bonus
      const targetIndustries = ['technology', 'finance', 'consulting', 'saas'];
      if (targetIndustries.some(i => industry.toLowerCase().includes(i))) {
        scores.companyFit += 10;
      }

      // 3. Role Seniority Score (Max 20 points)
      const title = ((prospect as any).title || '').toLowerCase();
      
      if (title.includes('ceo') || title.includes('founder') || title.includes('owner')) {
        scores.roleSeniority = 20;
      } else if (title.includes('vp') || title.includes('vice president') || title.includes('director')) {
        scores.roleSeniority = 15;
      } else if (title.includes('head') || title.includes('senior') || title.includes('lead')) {
        scores.roleSeniority = 10;
      } else if (title.includes('manager')) {
        scores.roleSeniority = 7;
      } else {
        scores.roleSeniority = 3;
      }

      // 4. Reply Sentiment Score (Max 15 points)
      const { data: replies } = await supabase
        .from('crm_email_replies' as any)
        .select('sentiment_score, classification')
        .eq('prospect_id', prospectId)
        .order('received_at', { ascending: false })
        .limit(5);

      if (replies && replies.length > 0) {
        const avgSentiment = replies.reduce((sum, r) => sum + ((r as any).sentiment_score || 0), 0) / replies.length;
        
        // Positive sentiment = high score
        if (avgSentiment > 0.5) {
          scores.replySentiment = 15;
        } else if (avgSentiment > 0) {
          scores.replySentiment = 10;
        } else if (avgSentiment > -0.3) {
          scores.replySentiment = 5;
        } else {
          scores.replySentiment = 0;
        }

        // Bonus for hot classification
        const hasHotReply = replies.some((r: any) => r.classification === 'hot');
        if (hasHotReply) {
          scores.replySentiment = 15;
        }
      }

      // Calculate total
      scores.total = Math.round(
        scores.engagement +
        scores.companyFit +
        scores.roleSeniority +
        scores.replySentiment
      );

      // Update prospect score in database
      await supabase
        .from('crm_prospects' as any)
        .update({ 
          lead_score: scores.total,
          score_breakdown: scores,
          score_updated_at: new Date().toISOString()
        })
        .eq('id', prospectId);

      return scores;
    } catch (error) {
      console.error('Error calculating prospect score:', error);
      toast.error('Failed to calculate prospect score');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkCalculateScores = useCallback(async (prospectIds: string[]) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        prospectIds.map(id => calculateProspectScore(id))
      );
      toast.success(`Updated scores for ${results.filter(Boolean).length} prospects`);
      return results;
    } finally {
      setLoading(false);
    }
  }, [calculateProspectScore]);

  return {
    calculateProspectScore,
    bulkCalculateScores,
    loading
  };
}
