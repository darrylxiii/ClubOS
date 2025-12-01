import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Reaction {
    id: string;
    emoji: string;
    x: number; // Random x position (0-100%)
}

interface LiveReactionsProps {
    channelId: string;
    onReaction?: (emoji: string) => void;
}

export const LiveReactions = ({ channelId }: LiveReactionsProps) => {
    const [reactions, setReactions] = useState<Reaction[]>([]);

    // Listen for custom event to trigger reaction (from signaling)
    useEffect(() => {
        const handleReaction = (event: CustomEvent<{ emoji: string }>) => {
            addReaction(event.detail.emoji);
        };

        window.addEventListener(`reaction:${channelId}`, handleReaction as EventListener);
        return () => {
            window.removeEventListener(`reaction:${channelId}`, handleReaction as EventListener);
        };
    }, [channelId]);

    const addReaction = (emoji: string) => {
        const id = Math.random().toString(36).substring(7);
        const x = Math.random() * 80 + 10; // 10% to 90%

        setReactions(prev => [...prev, { id, emoji, x }]);

        // Remove after animation
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
        }, 2000);
    };

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            <AnimatePresence>
                {reactions.map(reaction => (
                    <motion.div
                        key={reaction.id}
                        initial={{ y: '100%', opacity: 0, scale: 0.5, x: `${reaction.x}%` }}
                        animate={{
                            y: '20%',
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1.5, 1],
                            x: `${reaction.x + (Math.random() * 20 - 10)}%` // Slight drift
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="absolute bottom-0 text-4xl"
                    >
                        {reaction.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
