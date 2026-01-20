import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { MessageSquare, Send, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_instructor: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface SharedModuleChatProps {
  moduleId: string;
  moduleName: string;
}

export function SharedModuleChat({ moduleId, moduleName }: SharedModuleChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchMessages();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [moduleId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('module_chat_messages')
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq('module_id', moduleId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const setupRealtimeSubscription = async () => {
    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`module-chat:${moduleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'module_chat_messages',
          filter: `module_id=eq.${moduleId}`,
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data } = await supabase
            .from('module_chat_messages')
            .select(`
              *,
              profiles(full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as ChatMessage]);
          }
        }
      )
      .subscribe();

    // Track presence
    const presenceChannel = supabase.channel(`module-presence:${moduleId}`, {
      config: {
        presence: {
          key: user?.id || 'anonymous',
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user?.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = messageChannel;
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim() || loading) return;

    setLoading(true);
    try {
      // Check if user is an instructor
      const { data: expertData } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('module_chat_messages')
        .insert({
          module_id: moduleId,
          user_id: user.id,
          message: newMessage.trim(),
          is_instructor: !!expertData,
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      notify.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="squircle flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Module Discussion</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {moduleName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="squircle-sm">
              {onlineUsers} online
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.user_id === user?.id ? 'flex-row-reverse' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.profiles?.avatar_url} />
                  <AvatarFallback>
                    {msg.profiles?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`flex-1 max-w-[70%] ${
                    msg.user_id === user?.id ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {msg.profiles?.full_name || 'Unknown User'}
                    </span>
                    {msg.is_instructor && (
                      <Badge
                        variant="outline"
                        className="squircle-sm text-xs h-5"
                      >
                        Instructor
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-lg text-sm ${
                      msg.user_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={loading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
