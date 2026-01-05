import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowRight, Loader2 } from "lucide-react";

interface BreakoutRoomTransitionProps {
  isVisible: boolean;
  direction: 'to-breakout' | 'to-main';
  roomName?: string;
}

export function BreakoutRoomTransition({ 
  isVisible, 
  direction,
  roomName 
}: BreakoutRoomTransitionProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10100] bg-background/95 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
            className="text-center space-y-6"
          >
            <motion.div
              animate={{ 
                x: direction === 'to-breakout' ? [0, 20, 0] : [0, -20, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5, 
                ease: "easeInOut" 
              }}
              className="flex items-center justify-center gap-4"
            >
              <div className="p-4 rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="p-4 rounded-full bg-primary/20">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {direction === 'to-breakout' 
                  ? `Joining ${roomName || 'Breakout Room'}` 
                  : 'Returning to Main Room'}
              </h2>
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Switching rooms...
              </p>
            </div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
              className="h-1 bg-primary rounded-full max-w-xs mx-auto"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
