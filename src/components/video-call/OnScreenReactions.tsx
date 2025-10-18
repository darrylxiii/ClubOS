import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface OnScreenReactionsProps {
  reactions: any[];
}

export function OnScreenReactions({ reactions }: OnScreenReactionsProps) {
  const [displayReactions, setDisplayReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    if (reactions.length === 0) return;

    const latestReaction = reactions[reactions.length - 1];
    const newReaction: Reaction = {
      id: latestReaction.id,
      emoji: latestReaction.reaction_type,
      x: Math.random() * 80 + 10, // 10-90% of screen width
      y: Math.random() * 30 + 20  // 20-50% from bottom
    };

    setDisplayReactions(prev => [...prev, newReaction]);

    // Remove after animation
    setTimeout(() => {
      setDisplayReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  }, [reactions]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {displayReactions.map(reaction => (
          <motion.div
            key={reaction.id}
            initial={{ 
              opacity: 0,
              scale: 0,
              x: `${reaction.x}vw`,
              y: '100vh'
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 1.5, 0],
              y: [`${100 - reaction.y}vh`, `${50 - reaction.y}vh`, `${30 - reaction.y}vh`, '0vh']
            }}
            exit={{ 
              opacity: 0,
              scale: 0
            }}
            transition={{ 
              duration: 3,
              times: [0, 0.1, 0.8, 1],
              ease: 'easeOut'
            }}
            className="absolute text-6xl filter drop-shadow-lg"
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}