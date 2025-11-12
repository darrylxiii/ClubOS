import { Circle } from 'lucide-react';
import { motion } from 'framer-motion';

export function RecordingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 
                bg-gradient-to-r from-rose-500/90 to-rose-600/90 
                backdrop-blur-xl px-6 py-3 rounded-full 
                shadow-[0_0_24px_rgba(244,63,94,0.6)] 
                border border-rose-400/20"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [1, 0.6, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Circle className="h-3 w-3 fill-white text-white" />
        </motion.div>
        <span className="text-white font-semibold text-sm">
          Club AI is Recording
        </span>
      </div>
    </motion.div>
  );
}
