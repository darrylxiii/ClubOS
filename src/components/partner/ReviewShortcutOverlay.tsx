import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const INTERNAL_SHORTCUTS: ShortcutEntry[] = [
  { keys: ['A'], description: 'Approve selected candidate' },
  { keys: ['R'], description: 'Reject selected candidate' },
  { keys: ['J'], description: 'Move selection down' },
  { keys: ['K'], description: 'Move selection up' },
  { keys: ['Space'], description: 'Toggle selection' },
  { keys: ['⌘', 'A'], description: 'Select all' },
  { keys: ['?'], description: 'Show this overlay' },
];

const PARTNER_SHORTCUTS: ShortcutEntry[] = [
  { keys: ['→'], description: 'Approve candidate' },
  { keys: ['←'], description: 'Start/confirm rejection' },
  { keys: ['↓'], description: 'Hold candidate' },
  { keys: ['?'], description: 'Show this overlay' },
];

interface ReviewShortcutOverlayProps {
  mode: 'internal' | 'partner';
}

export function ReviewShortcutOverlay({ mode }: ReviewShortcutOverlayProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.getAttribute('role') === 'combobox';
      if (isTyping) return;

      if (e.key === '?') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const shortcuts = mode === 'internal' ? INTERNAL_SHORTCUTS : PARTNER_SHORTCUTS;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your review workflow with these shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, ki) => (
                  <kbd
                    key={ki}
                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-muted border border-border text-[11px] font-mono font-semibold"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">?</kbd> to toggle
        </p>
      </DialogContent>
    </Dialog>
  );
}
