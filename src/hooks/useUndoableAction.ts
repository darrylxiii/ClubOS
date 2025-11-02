import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void>;
  execute: () => Promise<void>;
}

export function useUndoableAction() {
  const { toast } = useToast();
  const [pendingActions, setPendingActions] = useState<Map<string, UndoableAction>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const executeWithUndo = useCallback(
    async (action: Omit<UndoableAction, "id">) => {
      const actionId = `action-${Date.now()}`;
      const undoableAction: UndoableAction = { ...action, id: actionId };

      // Add to pending actions
      setPendingActions((prev) => new Map(prev).set(actionId, undoableAction));

      // Show immediate feedback
      toast({
        title: action.description,
        description: "Press Ctrl+Z within 5 seconds to undo",
        duration: 5000,
      });

      // Schedule execution after 5 seconds
      const timeout = setTimeout(async () => {
        await undoableAction.execute();
        setPendingActions((prev) => {
          const newMap = new Map(prev);
          newMap.delete(actionId);
          return newMap;
        });
        timeoutRefs.current.delete(actionId);
      }, 5000);

      timeoutRefs.current.set(actionId, timeout);

      // Return undo function for manual invocation
      return async () => {
        const timeout = timeoutRefs.current.get(actionId);
        if (timeout) {
          clearTimeout(timeout);
          timeoutRefs.current.delete(actionId);
        }

        await undoableAction.undo();
        
        setPendingActions((prev) => {
          const newMap = new Map(prev);
          newMap.delete(actionId);
          return newMap;
        });

        toast({
          title: "Action undone",
          description: `${action.description} was cancelled`,
        });
      };
    },
    [toast]
  );

  return { executeWithUndo };
}
