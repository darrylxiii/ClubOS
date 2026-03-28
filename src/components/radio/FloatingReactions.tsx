import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🙌', label: 'Hands' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '💜', label: 'Purple Heart' },
  { emoji: '⚡', label: 'Lightning' },
];

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number; // 0-100 percentage
  delay: number;
}

interface FloatingReactionsProps {
  sessionId: string;
  className?: string;
}

export const FloatingReactions = memo(function FloatingReactions({ sessionId, className = '' }: FloatingReactionsProps) {
  const { user } = useAuth();
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const channelRef = useRef<any>(null);
  const lastSendRef = useRef(0);

  // Set up broadcast channel
  useEffect(() => {
    const channelName = `radio-reactions-${sessionId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        addFloater(payload.emoji);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const addFloater = useCallback((emoji: string) => {
    const id = crypto.randomUUID();
    const x = 10 + Math.random() * 80; // 10-90% horizontal position
    const delay = Math.random() * 0.3;

    setFloaters((prev) => {
      // Keep max 30 active floaters
      const next = [...prev, { id, emoji, x, delay }];
      return next.slice(-30);
    });

    // Remove after animation completes
    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 3000);
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    // Rate limit: max 1 reaction per 300ms
    const now = Date.now();
    if (now - lastSendRef.current < 300) return;
    lastSendRef.current = now;

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji, user_id: user?.id },
      });
    }

    // Add locally for instant feedback
    addFloater(emoji);
  }, [user?.id, addFloater]);

  return (
    <div className={`relative ${className}`}>
      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 1, y: '100%', x: `${f.x}%`, scale: 0.5 }}
              animate={{ opacity: 0, y: '-20%', scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.5,
                delay: f.delay,
                ease: 'easeOut',
              }}
              className="absolute text-2xl"
            >
              {f.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center justify-center gap-1.5">
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            title={label}
            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});
