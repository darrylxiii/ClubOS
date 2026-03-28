import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  timestamp: number;
}

interface LiveChatProps {
  sessionId: string;
  className?: string;
}

export const LiveChat = memo(function LiveChat({ sessionId, className = '' }: LiveChatProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Fetch user profile once
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setUserProfile(data));
  }, [user?.id]);

  // Set up realtime chat channel
  useEffect(() => {
    const channelName = `radio-chat-${sessionId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => {
          const next = [...prev, payload as ChatMessage];
          // Keep last 100 messages
          return next.slice(-100);
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !user || !channelRef.current) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      display_name: userProfile?.full_name || user.email?.split('@')[0] || 'Anonymous',
      avatar_url: userProfile?.avatar_url || null,
      content: input.trim(),
      timestamp: Date.now(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: message,
    });

    // Also add locally for instant feedback
    setMessages((prev) => [...prev, message].slice(-100));
    setInput('');
  }, [input, user, userProfile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm font-medium">{t('liveChat.title', 'Live Chat')}</span>
        <span className="text-xs text-muted-foreground">{t('liveChat.messagesCount', '{{count}} messages', { count: messages.length })}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[300px]">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2"
            >
              <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                <AvatarImage src={msg.avatar_url || undefined} />
                <AvatarFallback className="text-[9px] bg-primary/20">
                  {msg.display_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-xs font-medium text-primary/80">{msg.display_name}</span>
                <p className="text-sm text-foreground/90 break-words">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">{t('liveChat.beFirst', 'Be the first to say something...')}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('liveChat.typePlaceholder', 'Type a message...')}
            maxLength={200}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
