import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  modifier?: "ctrl" | "shift" | "alt";
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        
        if (!shortcut.modifier) return keyMatches;
        
        if (shortcut.modifier === "ctrl") return keyMatches && (event.ctrlKey || event.metaKey);
        if (shortcut.modifier === "shift") return keyMatches && event.shiftKey;
        if (shortcut.modifier === "alt") return keyMatches && event.altKey;
        
        return false;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

export const EMAIL_SHORTCUTS = {
  COMPOSE: { key: "c", description: "Compose new email" },
  ARCHIVE: { key: "e", description: "Archive email" },
  DELETE: { key: "#", description: "Delete email" },
  STAR: { key: "s", description: "Toggle star" },
  REPLY: { key: "r", description: "Reply to email" },
  NEXT: { key: "j", description: "Next email" },
  PREV: { key: "k", description: "Previous email" },
  SEARCH: { key: "/", description: "Focus search" },
  HELP: { key: "?", description: "Show keyboard shortcuts" },
};
