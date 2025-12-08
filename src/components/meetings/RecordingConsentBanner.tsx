import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecordingConsentBannerProps {
  isRecording: boolean;
}

export function RecordingConsentBanner({ isRecording }: RecordingConsentBannerProps) {
  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <Badge 
        variant="destructive" 
        className="px-4 py-2 text-sm font-medium flex items-center gap-2 bg-destructive/90 backdrop-blur-sm shadow-lg"
      >
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Circle className="h-3 w-3 fill-current" />
        </motion.div>
        Club AI is Recording
      </Badge>
    </motion.div>
  );
}
