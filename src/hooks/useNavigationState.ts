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
  const itemsStorageKey = `nav-group-items-${groupTitle}`;
  
  // Initialize state: expand if has active item, otherwise check localStorage
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (hasActiveItem) return true; // Always expand if contains active route
    
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? stored === "true" : false; // Default to collapsed
    } catch {
      return false; // Fallback if localStorage unavailable
    }
  });

  // Initialize items expanded state: collapse items by default, show only active
  const [showAllItems, setShowAllItems] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(itemsStorageKey);
      return stored !== null ? stored === "true" : false; // Default to collapsed items
    } catch {
      return false;
    }
  });

  // Auto-expand when route changes and becomes active
  useEffect(() => {
    if (hasActiveItem && !isOpen) {
      setIsOpen(true);
    }
  }, [hasActiveItem, isOpen]);

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

  // Toggle showing all items vs only active item
  const toggleItems = () => {
    setShowAllItems((prev) => {
      const newState = !prev;
      try {
        localStorage.setItem(itemsStorageKey, String(newState));
      } catch (error) {
        console.warn("Failed to persist navigation items state:", error);
      }
      return newState;
    });
  };

  return { isOpen, toggle, showAllItems, toggleItems };
};
