import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { meetingZIndex, meetingAnimations, meetingShadows, meetingBackdrop } from '@/config/meeting-design-tokens';

export type PanelType = 'chat' | 'participants' | 'settings' | 'notes' | 'intelligence' | 'voting' | 'backchannel' | null;

interface UnifiedMeetingSidebarProps {
  activePanel: PanelType;
  onClose: () => void;
  children: ReactNode;
  title: string;
}

export function UnifiedMeetingSidebar({ activePanel, onClose, children, title }: UnifiedMeetingSidebarProps) {
  return (
    <AnimatePresence mode="wait">
      {activePanel && (
        <motion.div
          key="sidebar-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={meetingAnimations.quick}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: meetingZIndex.panels }}
          onClick={onClose}
        />
      )}
      
      {activePanel && (
        <motion.div
          key={`sidebar-${activePanel}`}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className={cn(
            "fixed right-0 top-0 bottom-0 w-[420px]",
            meetingBackdrop.dark,
            "border-l border-white/10",
            `shadow-[${meetingShadows.xl}]`,
            "flex flex-col"
          )}
          style={{ zIndex: meetingZIndex.panels + 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-white/10 text-white rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePanel}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={meetingAnimations.smooth}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
