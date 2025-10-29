import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConnectingCallOverlayProps {
  callType?: 'audio' | 'video';
}

export function ConnectingCallOverlay({ callType = 'video' }: ConnectingCallOverlayProps) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-md flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-lg font-medium text-foreground">
          Connecting to {callType} call...
        </p>
      </div>
    </motion.div>,
    document.body
  );
}
