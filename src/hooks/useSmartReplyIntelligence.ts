import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { aiService } from '@/services/aiService';

export interface ReplyIntelligence {
  id: string;
  reply_id: string;
  prospect_id: string | null;
  intent_score: number | null;
  conversion_probability: number | null;
  buying_signals: {
    budget: { mentioned: boolean; amount: number | null; currency: string | null; confidence: number };
    authority: { is_decision_maker: boolean; decision_maker_mentioned: string | null; confidence: number };
    need: { identified: boolean; pain_points: string[]; requirements: string[]; confidence: number };
    timeline: { mentioned: boolean; timeframe: string | null; urgency: string | null; confidence: number };
  };
  competitor_mentions: string[];
  competitor_sentiment: 'positive' | 'neutral' | 'negative' | null;
  referral_opportunity: boolean;
  referral_contact: { name?: string; email?: string; title?: string } | null;
  follow_up_timing: string | null;
  follow_up_priority: 'immediate' | 'same_day' | 'next_day' | 'this_week' | 'can_wait' | null;
  recommended_channel: 'email' | 'phone' | 'linkedin' | 'meeting' | null;
  objections_detected: Array<{ type: string; objection: string; suggested_response: string }>;
  questions_asked: Array<{ question: string; answer_hint: string }>;
  meeting_interest_level: 'high' | 'medium' | 'low' | 'none' | null;
  smart_replies: {
    professional: string | null;
    friendly: string | null;
    decline: string | null;
  };
  created_at: string;
  updated_at: string;
}

export function useSmartReplyIntelligence(replyId?: string) {
  const queryClient = useQueryClient();

  // Fetch intelligence for a specific reply
  const { data: intelligence, isLoading, error } = useQuery({
    queryKey: ['reply-intelligence', replyId],
    queryFn: async () => {
      if (!replyId) return null;

      const { data, error } = await supabase
        .from('crm_reply_intelligence')
        .select('*')
        .eq('reply_id', replyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as ReplyIntelligence | null;
    },
    enabled: !!replyId
  });

  // Analyze a reply with enhanced AI
  const analyzeReplyMutation = useMutation({
    mutationFn: async ({
      replyId,
      prospectId,
      fromEmail,
      subject,
      bodyText
    }: {
      replyId: string;
      prospectId?: string;
      fromEmail: string;
      subject?: string;
      bodyText: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('analyze-email-reply', {
        body: {
          reply_id: replyId,
          prospect_id: prospectId,
          from_email: fromEmail,
          subject,
          body_text: bodyText
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-intelligence', replyId] });
      queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] });
    },
    onError: (error: Error) => {
      console.error('Failed to analyze reply:', error);
      toast.error('Failed to analyze reply');
    }
  });

  // Generate personalized follow-up
  const generateFollowUpMutation = useMutation({
    mutationFn: async ({
      replyId,
      prospectId,
      originalEmail,
      replyContent,
      prospectName,
      prospectCompany,
      classification,
      tone = 'professional'
    }: {
      replyId?: string;
      prospectId?: string;
      originalEmail: string;
      replyContent: string;
      prospectName?: string;
      prospectCompany?: string;
      classification?: string;
      tone?: 'professional' | 'friendly' | 'direct';
    }) => {
      const data = await aiService.generatePersonalizedFollowUp({
        context: originalEmail,
        tone: tone,
      } as any);

      return data;
    },
    onSuccess: (data) => {
      if ((data as any)?.follow_up) {
        queryClient.invalidateQueries({ queryKey: ['reply-intelligence'] });
      }
    },
    onError: (error: Error) => {
      console.error('Failed to generate follow-up:', error);
      toast.error('Failed to generate follow-up');
    }
  });

  // Get BANT score from buying signals
  const getBantScore = (signals: ReplyIntelligence['buying_signals'] | undefined): number => {
    if (!signals) return 0;

    let score = 0;
    if (signals.budget?.mentioned) score += 25;
    if (signals.authority?.is_decision_maker) score += 25;
    if (signals.need?.identified) score += 25;
    if (signals.timeline?.mentioned) score += 25;

    return score;
  };

  // Get priority color
  const getPriorityColor = (priority: string | null | undefined): string => {
    switch (priority) {
      case 'immediate': return 'text-red-500';
      case 'same_day': return 'text-orange-500';
      case 'next_day': return 'text-amber-500';
      case 'this_week': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return {
    intelligence,
    isLoading,
    error,
    analyzeReply: analyzeReplyMutation.mutate,
    isAnalyzing: analyzeReplyMutation.isPending,
    generateFollowUp: generateFollowUpMutation.mutate,
    isGenerating: generateFollowUpMutation.isPending,
    generatedFollowUp: (generateFollowUpMutation.data as any)?.follow_up,
    getBantScore,
    getPriorityColor
  };
}

// Fetch aggregated intelligence stats
export function useReplyIntelligenceStats() {
  return useQuery({
    queryKey: ['reply-intelligence-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_reply_intelligence')
        .select('intent_score, conversion_probability, follow_up_priority, meeting_interest_level')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Calculate aggregated stats
      const stats = {
        avgIntentScore: 0,
        avgConversionProb: 0,
        hotLeads: 0,
        needsImmediateAction: 0,
        highMeetingInterest: 0,
        totalAnalyzed: data?.length || 0
      };

      if (data && data.length > 0) {
        let intentSum = 0;
        let convSum = 0;
        let intentCount = 0;
        let convCount = 0;

        data.forEach(item => {
          if (item.intent_score !== null) {
            intentSum += item.intent_score;
            intentCount++;
            if (item.intent_score >= 70) stats.hotLeads++;
          }
          if (item.conversion_probability !== null) {
            convSum += Number(item.conversion_probability);
            convCount++;
          }
          if (item.follow_up_priority === 'immediate' || item.follow_up_priority === 'same_day') {
            stats.needsImmediateAction++;
          }
          if (item.meeting_interest_level === 'high') {
            stats.highMeetingInterest++;
          }
        });

        stats.avgIntentScore = intentCount > 0 ? Math.round(intentSum / intentCount) : 0;
        stats.avgConversionProb = convCount > 0 ? Math.round(convSum / convCount) : 0;
      }

      return stats;
    },
    refetchInterval: 60000 // Refresh every minute
  });
}
