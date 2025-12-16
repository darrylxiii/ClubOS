import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMemo } from 'react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  name: string;
  shortcuts: Shortcut[];
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const isMac = useMemo(() => 
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    []
  );

  const modifier = isMac ? '⌘' : 'Ctrl';

  const categories: ShortcutCategory[] = [
    {
      name: 'Navigation',
      shortcuts: [
        { keys: [modifier, 'P'], description: 'Quick search pages' },
        { keys: [modifier, 'K'], description: 'Open command palette' },
        { keys: [modifier, '/'], description: 'Toggle sidebar' },
        { keys: ['Esc'], description: 'Close dialogs / Deselect' },
      ],
    },
    {
      name: 'Page Actions',
      shortcuts: [
        { keys: [modifier, 'N'], description: 'Create new page' },
        { keys: [modifier, '⇧', 'N'], description: 'Create new subpage' },
        { keys: [modifier, '⇧', 'D'], description: 'Duplicate page' },
        { keys: [modifier, '⇧', 'C'], description: 'Quick capture' },
      ],
    },
    {
      name: 'Editing',
      shortcuts: [
        { keys: [modifier, 'Z'], description: 'Undo' },
        { keys: [modifier, '⇧', 'Z'], description: 'Redo' },
        { keys: [modifier, 'B'], description: 'Bold' },
        { keys: [modifier, 'I'], description: 'Italic' },
        { keys: [modifier, 'U'], description: 'Underline' },
        { keys: [modifier, 'E'], description: 'Inline code' },
        { keys: [modifier, '⇧', 'K'], description: 'Add link' },
      ],
    },
    {
      name: 'Blocks',
      shortcuts: [
        { keys: ['/'], description: 'Open slash menu' },
        { keys: ['Enter'], description: 'Create new block' },
        { keys: ['Tab'], description: 'Indent block' },
        { keys: ['⇧', 'Tab'], description: 'Outdent block' },
      ],
    },
    {
      name: 'Help',
      shortcuts: [
        { keys: ['?'], description: 'Show this help' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {categories.map((category, index) => (
              <div key={category.name}>
                {index > 0 && <Separator className="mb-4" />}
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <kbd
                            key={i}
                            className="px-2 py-1 text-xs font-medium bg-muted rounded border border-border min-w-[24px] text-center"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
