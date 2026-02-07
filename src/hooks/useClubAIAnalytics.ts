import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QUINAnalytics {
  totalInteractions: number;
  uniqueUsers: number;
  recommendationsSent: number;
  recommendationsClicked: number;
  clickThroughRate: number;
  avgSessionDuration: number;
  helpfulRatio: number;
  trend: number;
}

export function useClubAIAnalytics() {
  return useQuery({
    queryKey: ['quin-analytics'],
    queryFn: async (): Promise<QUINAnalytics> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get AI conversations for the last 30 days
      const { data: conversations, error: convError } = await supabase
        .from('ai_conversations')
        .select('id, user_id, conversation_type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (convError) throw convError;

      // Get previous period for trend calculation
      const { count: prevPeriodCount } = await supabase
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Get AI session scores for quality metrics
      const { data: sessionScores } = await supabase
        .from('ai_session_scores')
        .select('helpfulness_score, quality_score, response_time_ms')
        .gte('session_date', thirtyDaysAgo.toISOString());

      // Get AI suggestions (recommendations)
      const { data: suggestions } = await supabase
        .from('ai_suggestions')
        .select('id, shown, acted_upon')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalInteractions = conversations?.length || 0;
      const uniqueUsers = new Set(conversations?.map(c => c.user_id)).size;
      const recommendationsSent = suggestions?.filter(s => s.shown).length || 0;
      const recommendationsClicked = suggestions?.filter(s => s.acted_upon).length || 0;
      const clickThroughRate = recommendationsSent > 0 
        ? (recommendationsClicked / recommendationsSent) * 100 
        : 0;

      // Calculate helpful ratio from session scores
      const helpfulScores = sessionScores?.filter(s => s.helpfulness_score !== null) || [];
      const avgHelpfulness = helpfulScores.length > 0
        ? helpfulScores.reduce((sum, s) => sum + (s.helpfulness_score || 0), 0) / helpfulScores.length
        : 0;
      const helpfulRatio = (avgHelpfulness / 5) * 100; // Assuming 5-point scale

      // Trend calculation
      const trend = prevPeriodCount && prevPeriodCount > 0
        ? ((totalInteractions - prevPeriodCount) / prevPeriodCount) * 100
        : totalInteractions > 0 ? 100 : 0;

      return {
        totalInteractions,
        uniqueUsers,
        recommendationsSent,
        recommendationsClicked,
        clickThroughRate: Math.round(clickThroughRate * 10) / 10,
        avgSessionDuration: 0, // Would need session duration tracking
        helpfulRatio: Math.round(helpfulRatio),
        trend: Math.round(trend),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
