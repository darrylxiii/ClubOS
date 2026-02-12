import { useCallback, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { RadialMenu } from "./radial-menu";
import { useRadialMenu } from "@/hooks/useRadialMenu";
import { VoiceMemoRecorder } from "@/components/voice/VoiceMemoRecorder";
import { QuickTaskDialog } from "@/components/clubpilot/QuickTaskDialog";

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
    openMenu,
    closeMenu,
    closeVoiceMemo,
    closeQuickTask,
  } = useRadialMenu();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Don't override context menus on interactive elements that might have their own
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
      <QuickTaskDialog open={showQuickTask} onClose={closeQuickTask} />
    </>
  );
};
