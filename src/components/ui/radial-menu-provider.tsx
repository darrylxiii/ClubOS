import { useCallback, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { RadialMenu } from "./radial-menu";
import { useRadialMenu } from "@/hooks/useRadialMenu";
import { VoiceMemoRecorder } from "@/components/voice/VoiceMemoRecorder";
import { QuickTaskDialog } from "@/components/clubpilot/QuickTaskDialog";
import { CreateUnifiedTaskDialog } from "@/components/unified-tasks/CreateUnifiedTaskDialog";

interface RadialMenuProviderProps {
  children: ReactNode;
}

export const RadialMenuProvider = ({ children }: RadialMenuProviderProps) => {
  const {
    open,
    position,
    items,
    showVoiceMemo,
    showQuickTask,
    showFullTask,
    fullTaskTitle,
    fullTaskPriority,
    openMenu,
    closeMenu,
    closeVoiceMemo,
    closeQuickTask,
    openFullTask,
    closeFullTask,
  } = useRadialMenu();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const closest = target.closest(
        "[data-radix-context-menu], [data-no-radial-menu], input, textarea, [contenteditable]"
      );
      if (closest) return;

      e.preventDefault();
      openMenu(e.clientX, e.clientY);
    },
    [openMenu]
  );

  const handleExpand = useCallback(
    (title: string, priority: string) => {
      closeQuickTask();
      openFullTask(title, priority);
    },
    [closeQuickTask, openFullTask]
  );

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>

      <AnimatePresence>
        {open && (
          <RadialMenu
            items={items}
            position={position}
            onClose={closeMenu}
          />
        )}
      </AnimatePresence>

      <VoiceMemoRecorder open={showVoiceMemo} onClose={closeVoiceMemo} />
      <QuickTaskDialog open={showQuickTask} onClose={closeQuickTask} onExpand={handleExpand} />

      <CreateUnifiedTaskDialog
        objectiveId={null}
        open={showFullTask}
        onOpenChange={(v) => !v && closeFullTask()}
        onTaskCreated={closeFullTask}
        initialTitle={fullTaskTitle}
        initialPriority={fullTaskPriority}
      >
        <span />
      </CreateUnifiedTaskDialog>
    </>
  );
};
