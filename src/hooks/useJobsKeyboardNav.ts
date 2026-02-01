import { useState, useCallback, useEffect } from 'react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface UseJobsKeyboardNavOptions {
  jobs: { id: string }[];
  onNavigateToJob: (jobId: string) => void;
  onPublishJob?: (jobId: string) => void;
  onCloseJob?: (jobId: string) => void;
  onToggleSelect?: (jobId: string) => void;
  onSelectAll?: () => void;
  onFocusSearch?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

export interface UseJobsKeyboardNavReturn {
  focusedIndex: number;
  focusedJobId: string | null;
  setFocusedIndex: (index: number) => void;
  moveFocusUp: () => void;
  moveFocusDown: () => void;
}

/**
 * Hook for vim-style keyboard navigation on jobs list
 * J/K for navigation, Enter to open, Space to select, etc.
 */
export function useJobsKeyboardNav({
  jobs,
  onNavigateToJob,
  onPublishJob,
  onCloseJob,
  onToggleSelect,
  onSelectAll,
  onFocusSearch,
  onShowHelp,
  enabled = true,
}: UseJobsKeyboardNavOptions): UseJobsKeyboardNavReturn {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const focusedJobId = focusedIndex >= 0 && focusedIndex < jobs.length
    ? jobs[focusedIndex].id
    : null;

  const moveFocusUp = useCallback(() => {
    setFocusedIndex(prev => Math.max(0, prev - 1));
  }, []);

  const moveFocusDown = useCallback(() => {
    setFocusedIndex(prev => Math.min(jobs.length - 1, prev + 1));
  }, [jobs.length]);

  // Reset focus when jobs change
  useEffect(() => {
    if (focusedIndex >= jobs.length) {
      setFocusedIndex(jobs.length > 0 ? 0 : -1);
    }
  }, [jobs.length, focusedIndex]);

  // Define keyboard shortcuts
  const shortcuts = [
    {
      key: 'j',
      description: 'Move focus down',
      action: moveFocusDown,
    },
    {
      key: 'k',
      description: 'Move focus up',
      action: moveFocusUp,
    },
    {
      key: 'Enter',
      description: 'Open focused job',
      action: () => {
        if (focusedJobId) {
          onNavigateToJob(focusedJobId);
        }
      },
    },
    {
      key: ' ',
      description: 'Toggle selection',
      action: () => {
        if (focusedJobId && onToggleSelect) {
          onToggleSelect(focusedJobId);
        }
      },
    },
    {
      key: 'a',
      description: 'Select/deselect all',
      modifier: 'ctrl' as const,
      action: () => {
        if (onSelectAll) {
          onSelectAll();
        }
      },
    },
    {
      key: 'p',
      description: 'Publish focused job',
      action: () => {
        if (focusedJobId && onPublishJob) {
          onPublishJob(focusedJobId);
        }
      },
    },
    {
      key: 'x',
      description: 'Close focused job',
      action: () => {
        if (focusedJobId && onCloseJob) {
          onCloseJob(focusedJobId);
        }
      },
    },
    {
      key: '/',
      description: 'Focus search',
      action: () => {
        if (onFocusSearch) {
          onFocusSearch();
        }
      },
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => {
        if (onShowHelp) {
          onShowHelp();
        }
      },
    },
    {
      key: 'Escape',
      description: 'Clear focus',
      action: () => {
        setFocusedIndex(-1);
      },
    },
  ];

  useKeyboardShortcuts(shortcuts, enabled);

  return {
    focusedIndex,
    focusedJobId,
    setFocusedIndex,
    moveFocusUp,
    moveFocusDown,
  };
}

// Export shortcuts list for help dialog
export const JOB_KEYBOARD_SHORTCUTS = [
  { key: 'J', description: 'Move down' },
  { key: 'K', description: 'Move up' },
  { key: 'Enter', description: 'Open job dashboard' },
  { key: 'Space', description: 'Toggle selection' },
  { key: 'Ctrl+A', description: 'Select/deselect all' },
  { key: 'P', description: 'Publish job' },
  { key: 'X', description: 'Close job' },
  { key: '/', description: 'Focus search' },
  { key: '?', description: 'Show shortcuts' },
  { key: 'Esc', description: 'Clear focus' },
];
