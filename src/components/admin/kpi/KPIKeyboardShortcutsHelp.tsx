import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'views';
}

const shortcuts: ShortcutItem[] = [
  // Navigation
  { keys: ['←', '→'], description: 'Navigate between KPI cards', category: 'navigation' },
  { keys: ['↑', '↓'], description: 'Navigate between domains', category: 'navigation' },
  { keys: ['Tab'], description: 'Move focus to next element', category: 'navigation' },
  { keys: ['Esc'], description: 'Close dialogs / deselect', category: 'navigation' },
  
  // Actions
  { keys: ['P'], description: 'Pin / unpin selected KPI', category: 'actions' },
  { keys: ['A'], description: 'Configure alert for KPI', category: 'actions' },
  { keys: ['R'], description: 'Refresh KPI data', category: 'actions' },
  { keys: ['E'], description: 'Export selected KPI', category: 'actions' },
  { keys: ['D'], description: 'View KPI details / drill-down', category: 'actions' },
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'actions' },
  
  // Views
  { keys: ['1'], description: 'Switch to Overview', category: 'views' },
  { keys: ['2'], description: 'Switch to Executive view', category: 'views' },
  { keys: ['3'], description: 'Switch to Department view', category: 'views' },
  { keys: ['4'], description: 'Switch to OKRs view', category: 'views' },
  { keys: ['5'], description: 'Switch to Lineage view', category: 'views' },
  { keys: ['6'], description: 'Switch to Audit view', category: 'views' },
];

interface KPIKeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KPIKeyboardShortcutsHelp({ isOpen, onClose }: KPIKeyboardShortcutsHelpProps) {
  // Listen for ? key to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if typing in input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
      }
      
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const categoryTitles = {
    navigation: 'Navigation',
    actions: 'Actions',
    views: 'View Switching'
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Keyboard className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                  <p className="text-xs text-muted-foreground">Press ? anytime to show this</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      {categoryTitles[category as keyof typeof categoryTitles]}
                    </h3>
                    <div className="space-y-2">
                      {items.map((shortcut, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between py-1.5"
                        >
                          <span className="text-sm text-foreground">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIdx) => (
                              <span key={keyIdx} className="flex items-center">
                                <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border/50 min-w-[28px] text-center">
                                  {key}
                                </kbd>
                                {keyIdx < shortcut.keys.length - 1 && (
                                  <span className="text-muted-foreground mx-0.5">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border border-border/50">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
