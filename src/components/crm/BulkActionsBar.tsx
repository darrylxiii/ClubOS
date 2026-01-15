import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Archive, CheckCircle, UserPlus, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onArchive: () => void;
  onMarkActioned: () => void;
  onAssign: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onArchive,
  onMarkActioned,
  onAssign,
  onClearSelection,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-2xl flex items-center gap-3"
        >
          <span className="text-sm font-medium px-2">
            {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={onMarkActioned} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Mark Actioned
          </Button>
          <Button variant="ghost" size="sm" onClick={onArchive} className="gap-2">
            <Archive className="w-4 h-4" />
            Archive
          </Button>
          <Button variant="ghost" size="sm" onClick={onAssign} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Assign
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" onClick={onClearSelection} className="h-8 w-8" aria-label="Clear selection">
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
