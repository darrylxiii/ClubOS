import { useState, useEffect } from "react";

interface NavigationState {
  [key: string]: boolean;
}

/**
 * Custom hook to manage navigation group expand/collapse state with localStorage persistence
 * Handles user manual toggles while respecting active route auto-expansion
 */
export const useNavigationState = (groupTitle: string, hasActiveItem: boolean) => {
  const storageKey = `nav-group-${groupTitle}`;
  
  // isOpen controls whether to show all items (true) or just active item (false)
  // When hasActiveItem, group is always visible, isOpen just controls item count
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (!hasActiveItem) return false; // Collapsed if no active item
    
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? stored === "true" : false; // Default: show only active
    } catch {
      return false;
    }
  });

  // Persist user manual toggle to localStorage
  const toggle = () => {
    setIsOpen((prev) => {
      const newState = !prev;
      try {
        localStorage.setItem(storageKey, String(newState));
      } catch (error) {
        console.warn("Failed to persist navigation state:", error);
      }
      return newState;
    });
  };

  return { isOpen, toggle };
};
