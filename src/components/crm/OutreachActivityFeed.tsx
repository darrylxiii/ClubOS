import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  MessageSquare, 
  Calendar, 
  Zap, 
  UserPlus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'reply' | 'hot_lead' | 'meeting' | 'new_prospect' | 'campaign_milestone' | 'account_alert';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export function OutreachActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Fetch recent replies
  const { data: replies } = useQuery({
    queryKey: ['recent-replies-feed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_email_replies')
        .select('id, from_name, from_email, subject, classification, received_at')
        .order('received_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch hot leads
  const { data: hotLeads } = useQuery({
    queryKey: ['hot-leads-feed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_prospects')
        .select('id, full_name, company_name, reply_sentiment, updated_at')
        .eq('reply_sentiment', 'hot')
        .order('updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 30000
  });

  // Fetch meetings
  const { data: meetings } = useQuery({
    queryKey: ['meetings-feed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_prospects')
        .select('id, full_name, company_name, updated_at')
        .eq('stage', 'meeting_booked')
        .order('updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 30000
  });

  // Combine and sort activities
  useEffect(() => {
    const allActivities: ActivityItem[] = [];

    // Add replies
    replies?.forEach(reply => {
      allActivities.push({
        id: `reply-${reply.id}`,
        type: 'reply',
        title: `New reply from ${reply.from_name || reply.from_email}`,
        description: reply.subject || 'No subject',
        timestamp: new Date(reply.received_at),
        metadata: { classification: reply.classification }
      });
    });

    // Add hot leads
    hotLeads?.forEach(lead => {
      allActivities.push({
        id: `hot-${lead.id}`,
        type: 'hot_lead',
        title: `🔥 Hot lead detected`,
        description: `${lead.full_name} at ${lead.company_name}`,
        timestamp: new Date(lead.updated_at)
      });
    });

    // Add meetings
    meetings?.forEach(meeting => {
      allActivities.push({
        id: `meeting-${meeting.id}`,
        type: 'meeting',
        title: `Meeting booked`,
        description: `${meeting.full_name} at ${meeting.company_name}`,
        timestamp: new Date(meeting.updated_at)
      });
    });

    // Sort by timestamp
    allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setActivities(allActivities.slice(0, 20));
  }, [replies, hotLeads, meetings]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('outreach-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_email_replies' },
        (payload) => {
          const newReply = payload.new as any;
          const newActivity: ActivityItem = {
            id: `reply-${newReply.id}`,
            type: 'reply' as const,
            title: `New reply from ${newReply.from_name || newReply.from_email}`,
            description: newReply.subject || 'No subject',
            timestamp: new Date(newReply.received_at),
            metadata: { classification: newReply.classification }
          };
          setActivities(prev => [newActivity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'reply': return MessageSquare;
      case 'hot_lead': return Zap;
      case 'meeting': return Calendar;
      case 'new_prospect': return UserPlus;
      case 'campaign_milestone': return TrendingUp;
      case 'account_alert': return AlertTriangle;
      default: return Mail;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'reply': return 'text-purple-500 bg-purple-500/10';
      case 'hot_lead': return 'text-red-500 bg-red-500/10';
      case 'meeting': return 'text-green-500 bg-green-500/10';
      case 'new_prospect': return 'text-blue-500 bg-blue-500/10';
      case 'campaign_milestone': return 'text-yellow-500 bg-yellow-500/10';
      case 'account_alert': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'interested':
        return <Badge className="bg-green-500/10 text-green-500">Interested</Badge>;
      case 'not_interested':
        return <Badge className="bg-red-500/10 text-red-500">Not Interested</Badge>;
      case 'question':
        return <Badge className="bg-blue-500/10 text-blue-500">Question</Badge>;
      case 'objection':
        return <Badge className="bg-orange-500/10 text-orange-500">Objection</Badge>;
      case 'out_of_office':
        return <Badge className="bg-gray-500/10 text-gray-500">OOO</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Activity Feed
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="px-4 pb-4 space-y-2">
            <AnimatePresence>
              {activities.map((activity, index) => {
                const ActivityIcon = getActivityIcon(activity.type);
                const colorClasses = getActivityColor(activity.type);
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <Avatar className={`h-8 w-8 ${colorClasses.split(' ')[1]}`}>
                      <AvatarFallback className={colorClasses}>
                        <ActivityIcon className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        {activity.metadata?.classification && 
                          getClassificationBadge(activity.metadata.classification as string)
                        }
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {activities.length === 0 && (
              <div className="text-center py-8">
                <Mail className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
