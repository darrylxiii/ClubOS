import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GestureReaction {
  id: string;
  gesture: string;
  participantName: string;
  timestamp: number;
}

interface GestureReactionOverlayProps {
  currentGesture: string | null;
  participantName?: string;
  confidence?: number;
}

const GESTURE_EMOJIS: Record<string, string> = {
  'thumbs_up': '👍',
  'thumbs_down': '👎',
  'wave': '👋',
  'raised_hand': '✋',
  'clap': '👏',
  'peace': '✌️',
  'ok': '👌',
  'point_up': '☝️',
  'fist': '✊',
  'rock': '🤘'
};

const GESTURE_LABELS: Record<string, string> = {
  'thumbs_up': 'Thumbs Up',
  'thumbs_down': 'Thumbs Down',
  'wave': 'Wave',
  'raised_hand': 'Raised Hand',
  'clap': 'Clapping',
  'peace': 'Peace',
  'ok': 'OK',
  'point_up': 'Point Up',
  'fist': 'Fist',
  'rock': 'Rock On'
};

export function GestureReactionOverlay({
  currentGesture,
  participantName = 'You',
  confidence = 0
}: GestureReactionOverlayProps) {
  const [reactions, setReactions] = useState<GestureReaction[]>([]);
  const [lastGesture, setLastGesture] = useState<string | null>(null);

  // Add new reaction when gesture changes
  useEffect(() => {
    if (currentGesture && currentGesture !== 'none' && currentGesture !== lastGesture && confidence > 0.7) {
      const newReaction: GestureReaction = {
        id: `${Date.now()}-${Math.random()}`,
        gesture: currentGesture,
        participantName,
        timestamp: Date.now()
      };
      
      setReactions(prev => [...prev, newReaction]);
      setLastGesture(currentGesture);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 3000);
    }

    // Reset last gesture after debounce
    if (!currentGesture || currentGesture === 'none') {
      const timeout = setTimeout(() => {
        setLastGesture(null);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentGesture, confidence, participantName, lastGesture]);

  return (
    <div className="fixed bottom-24 right-4 z-50 pointer-events-none">
      <AnimatePresence>
        {reactions.map((reaction, index) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: -index * 70 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.5, 
              x: 50 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 30 
            }}
            className="absolute bottom-0 right-0 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-3 py-2 shadow-lg"
          >
            <span className="text-2xl">
              {GESTURE_EMOJIS[reaction.gesture] || '👋'}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium">
                {reaction.participantName}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {GESTURE_LABELS[reaction.gesture] || reaction.gesture}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Current gesture indicator (subtle) */}
      <AnimatePresence>
        {currentGesture && currentGesture !== 'none' && confidence > 0.5 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/50 backdrop-blur-sm border rounded-full px-3 py-1.5"
          >
            <span className="text-lg">
              {GESTURE_EMOJIS[currentGesture] || '👋'}
            </span>
            <span className="text-xs text-muted-foreground">
              Detected: {GESTURE_LABELS[currentGesture] || currentGesture}
            </span>
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${confidence * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Aggregated gesture reactions from all participants
interface AggregatedGestureReactionsProps {
  reactions: Array<{
    participantId: string;
    participantName: string;
    gesture: string;
    confidence: number;
  }>;
}

export function AggregatedGestureReactions({ reactions }: AggregatedGestureReactionsProps) {
  // Count gestures
  const gestureCounts = reactions.reduce((acc, r) => {
    if (r.confidence > 0.7) {
      acc[r.gesture] = (acc[r.gesture] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const activeGestures = Object.entries(gestureCounts)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (activeGestures.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-background/80 backdrop-blur-sm border rounded-full px-4 py-2 shadow-lg"
    >
      {activeGestures.slice(0, 3).map(([gesture, count]) => (
        <div key={gesture} className="flex items-center gap-1">
          <span className="text-xl">{GESTURE_EMOJIS[gesture] || '👋'}</span>
          {count > 1 && (
            <span className="text-xs font-medium text-primary">×{count}</span>
          )}
        </div>
      ))}
    </motion.div>
  );
}
