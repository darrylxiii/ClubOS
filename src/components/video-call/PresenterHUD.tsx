import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, MonitorOff, Eye, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { motion, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { meetingZIndex, meetingShadows, meetingBackdrop } from '@/config/meeting-design-tokens';

interface PresenterHUDProps {
  participantName: string;
  onStopSharing: () => void;
  participantCount: number;
  stream?: MediaStream;
}

export function PresenterHUD({ participantName, onStopSharing, participantCount, stream }: PresenterHUDProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const dragControls = useDragControls();

  return (
    <>
      {/* Live Indicator Banner - Top Center */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "fixed top-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full",
          "bg-gradient-to-r from-rose-500/90 to-rose-600/90",
          meetingBackdrop.heavy,
          "border border-white/10"
        )}
        style={{ zIndex: meetingZIndex.panels, boxShadow: '0 0 24px rgba(244,63,94,0.5)' }}
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
            className="w-3 h-3 rounded-full bg-white"
          />
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">
              You're presenting to {participantCount} {participantCount === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Floating Presenter Controls - Draggable */}
      <motion.div
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          top: 0,
          left: 0,
          right: window.innerWidth - 400,
          bottom: window.innerHeight - 300,
        }}
        initial={{ opacity: 0, scale: 0.9, x: window.innerWidth - 450, y: window.innerHeight - 400 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "fixed rounded-2xl overflow-hidden",
          meetingBackdrop.medium,
          "border border-white/20"
        )}
        style={{ 
          zIndex: meetingZIndex.panels,
          width: isMinimized ? '300px' : '400px',
          boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drag Handle */}
        <div 
          className="flex items-center justify-between p-3 bg-black/30 cursor-move border-b border-white/10"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-white/60" />
            <Monitor className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">Screen Share</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview(!showPreview)}
              className="h-7 w-7 p-0 hover:bg-white/10 text-white"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-7 w-7 p-0 hover:bg-white/10 text-white"
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        {!isMinimized && showPreview && (
          <div className="p-4 space-y-4">
            {/* Screen Preview */}
            <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10">
              {stream ? (
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(video) => {
                    if (video && stream) {
                      video.srcObject = stream;
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Monitor className="h-12 w-12 text-white/30" />
                </div>
              )}
              
              {/* Preview Label */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white/80">
                Your Screen
              </div>
            </div>

            {/* Info Text */}
            <div className="text-xs text-white/70 text-center">
              This preview shows what others see
            </div>

            {/* Stop Sharing Button */}
            <Button
              onClick={onStopSharing}
              className="w-full gap-2 bg-rose-500/90 hover:bg-rose-600 text-white transition-all duration-300 hover:scale-105"
              style={{ boxShadow: '0 0 24px rgba(244,63,94,0.5)' }}
            >
              <MonitorOff className="h-4 w-4" />
              Stop Sharing
            </Button>
          </div>
        )}

        {/* Minimized View */}
        {isMinimized && (
          <div className="p-3">
            <Button
              onClick={onStopSharing}
              size="sm"
              className="w-full gap-2 bg-rose-500/90 hover:bg-rose-600 text-white"
            >
              <MonitorOff className="h-3.5 w-3.5" />
              Stop
            </Button>
          </div>
        )}
      </motion.div>
    </>
  );
}
