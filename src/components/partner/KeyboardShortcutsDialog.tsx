import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { JOB_KEYBOARD_SHORTCUTS } from '@/hooks/useJobsKeyboardNav';
import { Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsDialog = memo(({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) => {
  const { t } = useTranslation('partner');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Keyboard className="w-6 h-6 text-primary" />
            <DialogTitle className="text-xl">{t('keyboardShortcutsDialog.dialogTitle')}</DialogTitle>
          </div>
          <DialogDescription>{t('keyboardShortcutsDialog.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 mt-4">
          {JOB_KEYBOARD_SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-card/30 transition-colors"
            >
              <span className="text-sm text-muted-foreground">{description}</span>
              <Kbd>{key}</Kbd>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Press <Kbd>?</Kbd> anytime to show this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
});

KeyboardShortcutsDialog.displayName = 'KeyboardShortcutsDialog';
