import { useEffect, useCallback, useRef, useState } from "react";

interface KeyboardNavOptions {
  /** All visible task IDs in display order */
  taskIds: string[];
  /** Currently selected task IDs */
  selectedTaskIds: Set<string>;
  /** Toggle selection of a task */
  toggleSelection: (taskId: string) => void;
  /** Open task detail */
  onOpenTask: (taskId: string) => void;
  /** Cycle task status */
  onCycleStatus?: (taskId: string) => void;
  /** Cycle task priority */
  onCyclePriority?: (taskId: string) => void;
  /** Whether keyboard nav is active (disable when modals/dialogs are open) */
  enabled?: boolean;
}

const STATUS_CYCLE = ['pending', 'in_progress', 'on_hold', 'completed'];
const PRIORITY_CYCLE = ['low', 'medium', 'high'];

export function useTaskKeyboardNav({
  taskIds,
  selectedTaskIds,
  toggleSelection,
  onOpenTask,
  onCycleStatus,
  onCyclePriority,
  enabled = true,
}: KeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusedTaskId = focusedIndex >= 0 && focusedIndex < taskIds.length
    ? taskIds[focusedIndex]
    : null;

  const scrollToFocused = useCallback((index: number) => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-task-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[role="dialog"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }

      if (taskIds.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j': {
          e.preventDefault();
          const next = Math.min(focusedIndex + 1, taskIds.length - 1);
          setFocusedIndex(next < 0 ? 0 : next);
          scrollToFocused(next < 0 ? 0 : next);
          break;
        }
        case 'ArrowUp':
        case 'k': {
          e.preventDefault();
          const prev = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prev);
          scrollToFocused(prev);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (focusedTaskId) {
            onOpenTask(focusedTaskId);
          }
          break;
        }
        case 'x': {
          e.preventDefault();
          if (focusedTaskId) {
            toggleSelection(focusedTaskId);
          }
          break;
        }
        case 's': {
          e.preventDefault();
          if (focusedTaskId && onCycleStatus) {
            onCycleStatus(focusedTaskId);
          }
          break;
        }
        case 'p': {
          if (e.ctrlKey || e.metaKey) return; // Don't capture Ctrl+P (print)
          e.preventDefault();
          if (focusedTaskId && onCyclePriority) {
            onCyclePriority(focusedTaskId);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setFocusedIndex(-1);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, taskIds, focusedIndex, focusedTaskId, toggleSelection, onOpenTask, onCycleStatus, onCyclePriority, scrollToFocused]);

  // Reset focus when task list changes
  useEffect(() => {
    if (focusedIndex >= taskIds.length) {
      setFocusedIndex(taskIds.length - 1);
    }
  }, [taskIds.length, focusedIndex]);

  return {
    focusedIndex,
    focusedTaskId,
    setFocusedIndex,
    containerRef,
    /** Utility to get cycle helpers */
    getNextStatus: (currentStatus: string) => {
      const idx = STATUS_CYCLE.indexOf(currentStatus);
      return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    },
    getNextPriority: (currentPriority: string) => {
      const idx = PRIORITY_CYCLE.indexOf(currentPriority);
      return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    },
  };
}
