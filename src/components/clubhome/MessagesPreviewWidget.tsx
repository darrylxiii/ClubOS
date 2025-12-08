import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
  is_read: boolean;
}

export const MessagesPreviewWidget = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMessages = useCallback(async (isManualRefresh = false) => {
    if (!user) return;
    if (isManualRefresh) setIsRefreshing(true);
    if (!user) return;

    try {
      // Get user's conversations
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participants?.length) {
        setLoading(false);
        return;
      }

      const conversationIds = participants.map(p => p.conversation_id);

      // Get recent messages
      const { data: recentMessages } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          is_read,
          sender_id
        `)
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentMessages) {
        // Get sender profiles
        const senderIds = [...new Set(recentMessages.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const messagesWithSenders = recentMessages.map(msg => {
          const sender = profileMap.get(msg.sender_id);
          return {
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            is_read: msg.is_read,
            sender_name: sender?.full_name || 'Unknown',
            sender_avatar: sender?.avatar_url
          };
        });

        setMessages(messagesWithSenders);
        setUnreadCount(messagesWithSenders.filter(m => !m.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMessages();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('messages-preview')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          fetchMessages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchMessages]);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Messages
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto animate-pulse">
              {unreadCount} new
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={() => fetchMessages(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-muted-foreground"
          >
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2 mb-4">
              {messages.slice(0, 3).map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-start gap-2 sm:gap-3 p-2 rounded-lg transition-all hover:scale-[1.01] ${
                    !msg.is_read ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={msg.sender_avatar || undefined} />
                    <AvatarFallback className="text-xs">{msg.sender_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs sm:text-sm truncate">{msg.sender_name}</span>
                      {!msg.is_read && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{msg.content}</p>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/messages" className="flex items-center justify-center">
            <ArrowRight className="h-4 w-4 mr-2" />
            View All Messages
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
