import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from 'framer-motion';

interface CRMKeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: 'A', description: 'Add new activity', modifier: '' },
  { key: 'N', description: 'Add new prospect', modifier: '' },
  { key: 'E', description: 'Edit selected item', modifier: '' },
  { key: 'M', description: 'Move to next stage', modifier: '' },
  { key: 'D', description: 'Mark activity as done', modifier: '' },
  { key: '/', description: 'Focus search', modifier: '' },
  { key: 'F', description: 'Go to Focus View', modifier: '' },
  { key: 'P', description: 'Go to Pipeline', modifier: '' },
  { key: 'I', description: 'Go to Inbox', modifier: '' },
  { key: 'K', description: 'Global search', modifier: '⌘' },
  { key: '?', description: 'Show keyboard shortcuts', modifier: '' },
  { key: 'Esc', description: 'Close dialog / Cancel', modifier: '' },
];

export function CRMKeyboardShortcutsDialog({ open, onOpenChange }: CRMKeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate and manage your CRM faster with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 mt-4 max-h-96 overflow-y-auto">
          {shortcuts.map((shortcut, index) => (
            <motion.div
              key={shortcut.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/20"
            >
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.modifier && (
                  <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border/50">
                    {shortcut.modifier}
                  </kbd>
                )}
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border/50">
                  {shortcut.key}
                </kbd>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">?</kbd> anywhere to show this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}
