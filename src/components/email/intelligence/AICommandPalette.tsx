import { useMemo } from "react";
import {
  Archive,
  Trash2,
  Clock,
  Star,
  Mail,
  Zap,
} from "lucide-react";
import { Email } from "@/hooks/useEmails";
import { useRegisterCommands, CommandItem } from "@/contexts/CommandContext";

interface AICommandPaletteProps {
  // open prop is removed as it's now global
  selectedEmail: Email | null;
  onArchive?: () => void;
  onDelete?: () => void;
  onSnooze?: () => void;
  onStar?: () => void;
  onReply?: () => void;
}

// Convert to a logical component that just registers commands
export function AICommandRegistry({
  selectedEmail,
  onArchive,
  onDelete,
  onSnooze,
  onStar,
  onReply,
}: AICommandPaletteProps) {

  const commands: CommandItem[] = useMemo(() => {
    // Only register these commands if we are essentially "active" (e.g. email selected)
    // Or we can register them but they might fail if no email selected.
    // Better pattern: Only register if selectedEmail exists?
    // Actually, "Reply" might be valid contextually if we are in the detail view.

    if (!selectedEmail) return [];

    const baseCommands: CommandItem[] = [
      {
        id: "email-reply",
        label: "Reply to Email",
        icon: Mail,
        category: "Context",
        shortcut: "R",
        action: () => onReply?.(),
        priority: 100,
      },
      {
        id: "email-archive",
        label: "Archive Email",
        icon: Archive,
        category: "Context",
        shortcut: "E",
        action: () => onArchive?.(),
        priority: 99,
      },
      {
        id: "email-snooze",
        label: "Snooze Email",
        icon: Clock,
        category: "Context",
        shortcut: "H",
        action: () => onSnooze?.(),
        priority: 98,
      },
      {
        id: "email-star",
        label: selectedEmail.is_starred ? "Remove Star" : "Add Star",
        icon: Star,
        category: "Context",
        shortcut: "S",
        action: () => onStar?.(),
        priority: 97,
      },
      {
        id: "email-delete",
        label: "Delete Email",
        icon: Trash2,
        category: "Context",
        shortcut: "#",
        action: () => onDelete?.(),
        priority: 90,
      },
    ];

    if (selectedEmail.ai_category) {
      baseCommands.unshift({
        id: "ai-suggest",
        label: `AI Action: ${selectedEmail.ai_category}`,
        icon: Zap,
        category: "AI & Tools",
        action: () => console.log('AI Action triggered'), // Placeholder
        priority: 101,
      });
    }

    return baseCommands;
  }, [selectedEmail, onArchive, onDelete, onSnooze, onStar, onReply]);

  useRegisterCommands(commands, [commands]);

  return null; // Headless component
}
