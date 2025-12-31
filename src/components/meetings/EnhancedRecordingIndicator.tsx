/**
 * Enhanced Recording Indicator
 * Shows recording status with participant count and duration
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Circle, Users, Clock, Grid, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedRecordingIndicatorProps {
  isRecording: boolean;
  startTime: number | null;
  participantCount: number;
  layout: 'grid' | 'spotlight';
  onLayoutChange?: (layout: 'grid' | 'spotlight') => void;
  className?: string;
}

export function EnhancedRecordingIndicator({
  isRecording,
  startTime,
  participantCount,
  layout,
  onLayoutChange,
  className
}: EnhancedRecordingIndicatorProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isRecording || !startTime) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        "bg-gradient-to-r from-rose-600/95 to-rose-700/95",
        "backdrop-blur-xl px-4 py-2.5 rounded-full",
        "shadow-[0_4px_24px_rgba(244,63,94,0.4)]",
        "border border-rose-400/30",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Recording Indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Circle className="h-3 w-3 fill-white text-white" />
          </motion.div>
          <span className="text-white font-semibold text-sm">REC</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/30" />

        {/* Duration */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-white/90 text-sm">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono tabular-nums">{formatDuration(duration)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Recording duration</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Divider */}
        <div className="w-px h-4 bg-white/30" />

        {/* Participant Count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-white/90 text-sm">
                <Users className="h-3.5 w-3.5" />
                <span>{participantCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Participants being recorded</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Layout Toggle */}
        {onLayoutChange && (
          <>
            <div className="w-px h-4 bg-white/30" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onLayoutChange(layout === 'grid' ? 'spotlight' : 'grid')}
                    className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                  >
                    {layout === 'grid' ? (
                      <Grid className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {layout === 'grid' ? 'Switch to spotlight' : 'Switch to grid'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </motion.div>
  );
}
