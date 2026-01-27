import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, ArrowRight, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface UnreadMessage {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export function UnreadMessagesWidget({ companyId, userId }: { companyId: string; userId?: string }) {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['unread-messages-preview', companyId, userId],
    queryFn: async (): Promise<UnreadMessage[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('messages' as any)
        .select('id, content, created_at, sender_id')
        .eq('recipient_id', userId)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      
      const msgList = (data || []) as any[];
      const senderIds = [...new Set(msgList.map(m => m.sender_id).filter(Boolean))];
      
      let senders: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);
        
        if (profiles) {
          senders = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      return msgList.map(m => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        sender: senders[m.sender_id] || null
      }));
    },
    enabled: !!userId,
    refetchInterval: 30000
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-messages-count', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('messages' as any)
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            Messages
          </div>
          {unreadCount && unreadCount > 0 && (
            <Badge variant="default" className="bg-primary">
              {unreadCount} New
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!messages || messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-muted/30"
          >
            <div className="p-2 rounded-full bg-muted">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Inbox Zero</p>
              <p className="text-sm text-muted-foreground">No unread messages</p>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="space-y-2">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender?.avatar_url || ''} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {message.sender?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {message.sender?.full_name || 'Unknown'}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {message.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button 
              variant="ghost" 
              className="w-full justify-between text-sm hover:bg-primary/5"
              asChild
            >
              <Link to="/messages">
                View All Messages
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
