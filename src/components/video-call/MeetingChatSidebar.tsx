import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface MeetingChatSidebarProps {
  meetingId: string;
  participantId: string;
  participantName: string;
}

export function MeetingChatSidebar({ meetingId, participantId, participantName }: MeetingChatSidebarProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing messages
  useEffect(() => {
    loadMessages();
  }, [meetingId]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-chat-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload: any) => {
          const signal = payload.new;
          if (signal.signal_type === 'chat') {
      const chatMessage: Message = {
        id: signal.id,
        sender_id: signal.sender_id,
        sender_name: (signal.signal_data as any)?.senderName || 'Unknown',
        content: (signal.signal_data as any)?.message || '',
        created_at: signal.created_at
      };
            setMessages(prev => [...prev, chatMessage]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [meetingId]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('webrtc_signals')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('signal_type', 'chat')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Chat] Failed to load messages:', error);
      return;
    }

    if (data) {
      const chatMessages: Message[] = data.map(signal => ({
        id: signal.id,
        sender_id: signal.sender_id,
        sender_name: (signal.signal_data as any)?.senderName || 'Unknown',
        content: (signal.signal_data as any)?.message || '',
        created_at: signal.created_at
      }));
      setMessages(chatMessages);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await supabase.from('webrtc_signals').insert({
        meeting_id: meetingId,
        sender_id: participantId,
        signal_type: 'chat',
        signal_data: {
          message: message.trim(),
          senderName: participantName
        }
      });

      setMessage('');
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender_id === participantId ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.sender_id === participantId 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                {msg.sender_id !== participantId && (
                  <div className="text-xs font-semibold mb-1">{msg.sender_name}</div>
                )}
                <div className="text-sm break-words">{msg.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/10 flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="bg-white/5"
        />
        <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
