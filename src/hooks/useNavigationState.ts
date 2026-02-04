import { useState, useCallback } from "react";

/**
 * Custom hook to manage navigation group expand/collapse state
 * No localStorage persistence - always starts collapsed for consistent UX
 * 
 * Error handling: This hook is designed to never throw, ensuring sidebar stability
 */
export const useNavigationState = (groupTitle: string, hasActiveItem: boolean) => {
  // isOpen controls whether to show all items (true) or just active item (false)
  // Always start collapsed on every page visit - no persistence
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Stable toggle callback to prevent unnecessary re-renders
  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return { isOpen, toggle };
};
