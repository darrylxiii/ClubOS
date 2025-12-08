import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

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

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
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
    }
  };

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
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Messages
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {messages.slice(0, 3).map(msg => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                  !msg.is_read ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.sender_avatar || undefined} />
                  <AvatarFallback>{msg.sender_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{msg.sender_name}</span>
                    {!msg.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{msg.content}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/messages">
            <ArrowRight className="h-4 w-4 mr-2" />
            View All Messages
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
