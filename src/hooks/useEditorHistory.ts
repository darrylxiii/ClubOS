import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface HistoryState {
  content: any[];
  timestamp: number;
}

interface UseEditorHistoryOptions {
  maxHistory?: number;
  groupingInterval?: number;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useEditorHistory({
  maxHistory = 50,
  groupingInterval = 500,
  onUndo,
  onRedo,
}: UseEditorHistoryOptions = {}) {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const lastPushTime = useRef<number>(0);
  const isUndoRedo = useRef(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Push a new state to history
  const pushState = useCallback((content: any[]) => {
    // Don't push if this is from an undo/redo operation
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    const now = Date.now();
    const shouldGroup = now - lastPushTime.current < groupingInterval;
    lastPushTime.current = now;

    setHistory(prev => {
      // If we're not at the end, truncate forward history
      const truncated = prev.slice(0, historyIndex + 1);
      
      if (shouldGroup && truncated.length > 0) {
        // Update the last state instead of creating new
        const newHistory = [...truncated];
        newHistory[newHistory.length - 1] = { content, timestamp: now };
        return newHistory;
      }

      // Add new state
      const newHistory = [...truncated, { content, timestamp: now }];
      
      // Trim to max history
      if (newHistory.length > maxHistory) {
        return newHistory.slice(-maxHistory);
      }
      
      return newHistory;
    });

    setHistoryIndex(prev => {
      const truncatedLength = Math.min(prev + 1, history.length);
      return truncatedLength;
    });
  }, [historyIndex, history.length, groupingInterval, maxHistory]);

  // Undo action
  const undo = useCallback(() => {
    if (!canUndo) return null;
    
    isUndoRedo.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    
    const state = history[newIndex];
    onUndo?.();
    toast.info('Undo', { duration: 1500 });
    
    return state.content;
  }, [canUndo, historyIndex, history, onUndo]);

  // Redo action
  const redo = useCallback(() => {
    if (!canRedo) return null;
    
    isUndoRedo.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    
    const state = history[newIndex];
    onRedo?.();
    toast.info('Redo', { duration: 1500 });
    
    return state.content;
  }, [canRedo, historyIndex, history, onRedo]);

  // Clear history (e.g., on page change)
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    lastPushTime.current = 0;
  }, []);

  // Initialize with current content
  const initializeHistory = useCallback((content: any[]) => {
    setHistory([{ content, timestamp: Date.now() }]);
    setHistoryIndex(0);
  }, []);

  // Note: Keyboard shortcuts are handled by BlockNote's built-in undo/redo
  // This hook provides programmatic access for toolbar buttons and external triggers

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    initializeHistory,
    historyLength: history.length,
    currentIndex: historyIndex,
  };
}
