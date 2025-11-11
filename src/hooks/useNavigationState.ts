import { useState, useEffect } from "react";

interface NavigationState {
  [key: string]: boolean;
}

/**
 * Custom hook to manage navigation group expand/collapse state with localStorage persistence
 * Handles user manual toggles while respecting active route auto-expansion
 */
export const useNavigationState = (groupTitle: string, hasActiveItem: boolean) => {
  // isOpen controls whether to show all items (true) or just active item (false)
  // Always start collapsed on every page visit - no persistence
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Toggle between showing all items and just active item
  const toggle = () => {
    setIsOpen((prev) => !prev);
  };

  return { isOpen, toggle };
};
