import { useEffect, useCallback, useState } from 'react';

export interface CRMShortcut {
  key: string;
  description: string;
  action: () => void;
}

interface UseCRMKeyboardShortcutsOptions {
  onAddActivity?: () => void;
  onSearch?: () => void;
  onAddProspect?: () => void;
  onRefresh?: () => void;
  onHelp?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  onComplete?: () => void;
  enabled?: boolean;
}

export function useCRMKeyboardShortcuts(options: UseCRMKeyboardShortcutsOptions) {
  const [showHelp, setShowHelp] = useState(false);
  const { enabled = true } = options;

  const shortcuts: CRMShortcut[] = [
    { key: 'A', description: 'Add new activity', action: options.onAddActivity || (() => {}) },
    { key: 'N', description: 'Add new prospect', action: options.onAddProspect || (() => {}) },
    { key: '/', description: 'Focus search', action: options.onSearch || (() => {}) },
    { key: 'R', description: 'Refresh data', action: options.onRefresh || (() => {}) },
    { key: '?', description: 'Show keyboard shortcuts', action: () => setShowHelp(true) },
    { key: 'J', description: 'Next item', action: options.onNavigateNext || (() => {}) },
    { key: 'K', description: 'Previous item', action: options.onNavigatePrev || (() => {}) },
    { key: 'C', description: 'Complete selected', action: options.onComplete || (() => {}) },
    { key: 'Esc', description: 'Close dialog/deselect', action: () => setShowHelp(false) },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger if user is typing in an input
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Handle Cmd/Ctrl + K for search
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      options.onSearch?.();
      return;
    }

    const key = event.key.toUpperCase();

    switch (key) {
      case 'A':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          options.onAddActivity?.();
        }
        break;
      case 'N':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          options.onAddProspect?.();
        }
        break;
      case '/':
        event.preventDefault();
        options.onSearch?.();
        break;
      case 'R':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          options.onRefresh?.();
        }
        break;
      case '?':
        event.preventDefault();
        setShowHelp(prev => !prev);
        break;
      case 'J':
        event.preventDefault();
        options.onNavigateNext?.();
        break;
      case 'K':
        event.preventDefault();
        options.onNavigatePrev?.();
        break;
      case 'C':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          options.onComplete?.();
        }
        break;
      case 'ESCAPE':
        setShowHelp(false);
        break;
    }
  }, [enabled, options]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    showHelp,
    setShowHelp,
  };
}
