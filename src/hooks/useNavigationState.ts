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
  // Always default to false (collapsed) - only expand if user explicitly toggled
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      // Only return true if user explicitly set it to true
      return stored === "true";
    } catch {
      return false;
    }
  });

  // Persist user manual toggle to localStorage
  // When toggling, if turning off (collapsing), remove from localStorage
  // This ensures fresh page visits always show collapsed state
  const toggle = () => {
    setIsOpen((prev) => {
      const newState = !prev;
      try {
        if (newState) {
          localStorage.setItem(storageKey, "true");
        } else {
          localStorage.removeItem(storageKey); // Remove so it defaults to collapsed
        }
      } catch (error) {
        console.warn("Failed to persist navigation state:", error);
      }
      return newState;
    });
  };

  return { isOpen, toggle };
};
