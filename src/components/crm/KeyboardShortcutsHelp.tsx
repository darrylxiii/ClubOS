import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: { key: string; description: string }[];
}

export function KeyboardShortcutsHelp({ open, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Keyboard Shortcuts</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {shortcuts.map(({ key, description }) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono min-w-[28px] text-center">
                  {key}
                </kbd>
                <span className="text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
