import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Flag, Lock, Sparkles } from 'lucide-react';
import { notify } from '@/lib/notify';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ClubAIBackchannelSuggestions } from './ClubAIBackchannelSuggestions';

interface BackchannelMessage {
  id: string;
  sender_id: string;
  message: string;
  is_important: boolean;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface InterviewerBackchannelProps {
  meetingId: string;
  currentUserId: string;
}

export function InterviewerBackchannel({ meetingId, currentUserId }: InterviewerBackchannelProps) {
  const [messages, setMessages] = useState<BackchannelMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    const channel = supabase
      .channel(`backchannel:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interviewer_backchannel',
          filter: `meeting_id=eq.${meetingId}`,
        },
        async (payload) => {
          const newMessage = payload.new as BackchannelMessage;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();
          
          setMessages((prev) => [...prev, { ...newMessage, sender: profile || undefined }]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('interviewer_backchannel' as any)
      .select(`
        *,
        sender:profiles!interviewer_backchannel_sender_id_fkey(full_name, avatar_url)
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading backchannel messages:', error);
      return;
    }

    setMessages(data as any || []);
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    const { error } = await supabase
      .from('interviewer_backchannel' as any)
      .insert({
        meeting_id: meetingId,
        sender_id: currentUserId,
        message: message.trim(),
        is_important: false,
      });

    if (error) {
      notify.error('Failed to send message');
    } else {
      setMessage('');
    }
    setSending(false);
  };

  const toggleImportant = async (messageId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('interviewer_backchannel' as any)
      .update({ is_important: !currentValue })
      .eq('id', messageId);

    if (!error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_important: !currentValue } : m))
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-amber-500/5 to-amber-600/5 rounded-lg border border-amber-500/20">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 bg-amber-500/5">
        <Lock className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Interviewer Notes</h3>
        <span className="text-xs text-muted-foreground">(Private)</span>
      </div>

      {/* Tabbed Content: Notes + QUIN Suggestions */}
      <Tabs defaultValue="notes" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="notes" className="text-xs gap-1">
            <Lock className="w-3 h-3" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="quin" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            QUIN Suggests
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="notes" className="flex-1 flex flex-col overflow-hidden mt-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Private coordination space for interviewers</p>
                  <p className="text-xs mt-1">Share notes and impressions here</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      msg.is_important
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-card/50 border-border/50',
                      msg.sender_id === currentUserId && 'ml-4'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {msg.sender?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {msg.sender_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleImportant(msg.id, msg.is_important)}
                          className="h-6 w-6 p-0"
                        >
                          <Flag
                            className={cn(
                              'w-3 h-3',
                              msg.is_important ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'
                            )}
                          />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-amber-500/20 bg-amber-500/5">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share notes with other interviewers..."
                className="min-h-[60px] resize-none bg-background/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                size="icon"
                className="shrink-0 bg-amber-600 hover:bg-amber-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              🔒 Only visible to interviewers • Press Enter to send
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="quin" className="flex-1 overflow-hidden mt-0">
          <ClubAIBackchannelSuggestions meetingId={meetingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
