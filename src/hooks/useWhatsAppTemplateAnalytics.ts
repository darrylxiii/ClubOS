import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface TemplatePerformance {
  templateId: string;
  templateName: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  avgResponseTimeMinutes: number | null;
  positiveSentimentCount: number;
  negativeSentimentCount: number;
  responseRate: number;
  deliveryRate: number;
  readRate: number;
  sentimentScore: number;
  trend: 'up' | 'down' | 'stable';
  dailyData: Array<{
    date: string;
    sent: number;
    replied: number;
  }>;
}

export function useWhatsAppTemplateAnalytics(periodDays: number = 30) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-template-analytics', periodDays],
    queryFn: async () => {
      const startDate = subDays(new Date(), periodDays).toISOString();

      // Fetch templates
      const { data: templates } = await supabase
        .from('whatsapp_templates')
        .select('id, template_name');

      // Fetch messages with template data
      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('id, template_name, status, direction, sentiment_score, created_at, conversation_id')
        .gte('created_at', startDate)
        .not('template_name', 'is', null);

      // Fetch analytics data if exists
      const { data: analyticsData } = await supabase
        .from('whatsapp_template_analytics')
        .select('*')
        .gte('date', format(subDays(new Date(), periodDays), 'yyyy-MM-dd'));

      // Group messages by template
      const templateStats: Record<string, TemplatePerformance> = {};

      for (const template of templates || []) {
        const templateMessages = (messages || []).filter(
          m => m.template_name === template.template_name && m.direction === 'outbound'
        );

        const sentCount = templateMessages.length;
        const deliveredCount = templateMessages.filter(
          m => m.status === 'delivered' || m.status === 'read'
        ).length;
        const readCount = templateMessages.filter(m => m.status === 'read').length;

        // Calculate replies (inbound messages within 24h of template)
        const conversationIds = [...new Set(templateMessages.map(m => m.conversation_id))];
        let repliedCount = 0;
        let totalResponseTime = 0;
        let responseCount = 0;

        for (const convId of conversationIds) {
          const templateMsg = templateMessages.find(m => m.conversation_id === convId);
          if (templateMsg) {
            const templateTime = new Date(templateMsg.created_at).getTime();
            const replyMessages = (messages || []).filter(
              m =>
                m.conversation_id === convId &&
                m.direction === 'inbound' &&
                new Date(m.created_at).getTime() > templateTime &&
                new Date(m.created_at).getTime() - templateTime <= 24 * 60 * 60 * 1000
            );
            if (replyMessages.length > 0) {
              repliedCount++;
              const firstReply = replyMessages[0];
              const responseTime = (new Date(firstReply.created_at).getTime() - templateTime) / 60000;
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        }

        // Sentiment analysis
        const sentimentMessages = templateMessages.filter(m => m.sentiment_score !== null);
        const positiveSentimentCount = sentimentMessages.filter(m => (m.sentiment_score || 0) > 0.3).length;
        const negativeSentimentCount = sentimentMessages.filter(m => (m.sentiment_score || 0) < -0.3).length;
        const avgSentiment = sentimentMessages.length > 0
          ? sentimentMessages.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / sentimentMessages.length
          : 0;

        // Daily data for sparkline
        const dailyData: Array<{ date: string; sent: number; replied: number }> = [];
        for (let i = 0; i < Math.min(7, periodDays); i++) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const daySent = templateMessages.filter(
            m => format(new Date(m.created_at), 'yyyy-MM-dd') === date
          ).length;
          dailyData.unshift({ date, sent: daySent, replied: 0 });
        }

        // Calculate trend based on last 7 days vs previous 7 days
        const last7 = templateMessages.filter(
          m => new Date(m.created_at) >= subDays(new Date(), 7)
        ).length;
        const prev7 = templateMessages.filter(
          m =>
            new Date(m.created_at) >= subDays(new Date(), 14) &&
            new Date(m.created_at) < subDays(new Date(), 7)
        ).length;
        const trend: 'up' | 'down' | 'stable' = last7 > prev7 * 1.1 ? 'up' : last7 < prev7 * 0.9 ? 'down' : 'stable';

        templateStats[template.id] = {
          templateId: template.id,
          templateName: template.template_name,
          sentCount,
          deliveredCount,
          readCount,
          repliedCount,
          avgResponseTimeMinutes: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null,
          positiveSentimentCount,
          negativeSentimentCount,
          responseRate: sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0,
          deliveryRate: sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0,
          readRate: deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0,
          sentimentScore: avgSentiment,
          trend,
          dailyData,
        };
      }

      // Sort by sent count
      const sortedTemplates = Object.values(templateStats).sort((a, b) => b.sentCount - a.sentCount);

      return {
        templates: sortedTemplates,
        topPerformer: sortedTemplates.reduce((best, current) =>
          current.responseRate > (best?.responseRate || 0) ? current : best
        , sortedTemplates[0] || null),
        needsAttention: sortedTemplates.filter(t => t.responseRate < 10 && t.sentCount >= 5),
        averageResponseRate: sortedTemplates.length > 0
          ? Math.round(sortedTemplates.reduce((sum, t) => sum + t.responseRate, 0) / sortedTemplates.length)
          : 0,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  return {
    templates: data?.templates || [],
    topPerformer: data?.topPerformer || null,
    needsAttention: data?.needsAttention || [],
    averageResponseRate: data?.averageResponseRate || 0,
    isLoading,
    refetch,
  };
}
