import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, CheckCheck, Clock, TrendingUp } from 'lucide-react';
import { subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function WhatsAppMetricsBar() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['whatsapp-quick-metrics'],
    queryFn: async () => {
      const last7Days = subDays(new Date(), 7).toISOString();
      
      const [messagesRes, conversationsRes] = await Promise.all([
        supabase
          .from('whatsapp_messages')
          .select('direction, status, created_at')
          .gte('created_at', last7Days),
        supabase
          .from('whatsapp_conversations')
          .select('conversation_status, unread_count'),
      ]);

      const messages = messagesRes.data || [];
      const conversations = conversationsRes.data || [];

      const sent = messages.filter(m => m.direction === 'outbound').length;
      const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'read').length;
      const read = messages.filter(m => m.status === 'read').length;
      const activeConversations = conversations.filter(c => c.conversation_status === 'active').length;
      const needsResponse = conversations.filter(c => (c.unread_count || 0) > 0).length;

      return {
        totalConversations: conversations.length,
        activeConversations,
        needsResponse,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="h-10 border-b border-border bg-muted/30 flex items-center gap-6 px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
    );
  }

  const stats = [
    { 
      icon: MessageSquare, 
      label: 'Conversations', 
      value: metrics?.totalConversations || 0,
      color: 'text-blue-500' 
    },
    { 
      icon: TrendingUp, 
      label: 'Active', 
      value: metrics?.activeConversations || 0,
      color: 'text-green-500' 
    },
    { 
      icon: Clock, 
      label: 'Awaiting Reply', 
      value: metrics?.needsResponse || 0,
      color: 'text-amber-500' 
    },
    { 
      icon: Send, 
      label: 'Delivery Rate', 
      value: `${metrics?.deliveryRate || 0}%`,
      color: 'text-purple-500' 
    },
    { 
      icon: CheckCheck, 
      label: 'Read Rate', 
      value: `${metrics?.readRate || 0}%`,
      color: 'text-emerald-500' 
    },
  ];

  return (
    <div className="h-10 border-b border-border bg-muted/30 flex items-center gap-6 px-4 overflow-x-auto shrink-0">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex items-center gap-2 text-xs whitespace-nowrap">
            <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
            <span className="text-muted-foreground">{stat.label}:</span>
            <span className="font-semibold">{stat.value}</span>
          </div>
        );
      })}
    </div>
  );
}
