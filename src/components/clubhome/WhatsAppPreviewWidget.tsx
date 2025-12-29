import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/T";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface WhatsAppMessage {
  id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const WhatsAppPreviewWidget = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-preview'],
    queryFn: async () => {
      // Query messages table for WhatsApp-type messages or recent unread messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          is_read,
          sender:sender_id (
            full_name
          )
        `)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Get unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      const formattedMessages: WhatsAppMessage[] = (messages || []).map((msg: any) => ({
        id: msg.id,
        sender_name: msg.sender?.full_name || 'Unknown',
        content: msg.content || '',
        created_at: msg.created_at,
        is_read: msg.is_read,
      }));

      return {
        messages: formattedMessages,
        unreadCount: count || 0,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-full"
    >
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <T k="common:messages.whatsapp" fallback="Messages" />
              {data && data.unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                  {data.unreadCount}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/messages">
                <T k="common:actions.viewAll" fallback="View All" />
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          {data?.messages && data.messages.length > 0 ? (
            <div className="space-y-3">
              {data.messages.map((msg) => (
                <Link
                  key={msg.id}
                  to={`/messages?thread=${msg.id}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{msg.sender_name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                  </div>
                  {!msg.is_read && (
                    <div className="h-2 w-2 rounded-full bg-green-500 shrink-0 mt-2" />
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                <T k="common:messages.noUnread" fallback="No unread messages" />
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
