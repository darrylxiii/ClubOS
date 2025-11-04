import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Archive, 
  Trash2, 
  Clock, 
  Tag, 
  Star, 
  Mail, 
  Search,
  Zap,
  Command
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Email } from "@/hooks/useEmails";

interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "action" | "navigation" | "ai";
  shortcut?: string;
  action: () => void;
}

interface AICommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmail: Email | null;
  onArchive?: () => void;
  onDelete?: () => void;
  onSnooze?: () => void;
  onStar?: () => void;
  onReply?: () => void;
}

export function AICommandPalette({
  open,
  onOpenChange,
  selectedEmail,
  onArchive,
  onDelete,
  onSnooze,
  onStar,
  onReply,
}: AICommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      {
        id: "archive",
        label: "Archive Email",
        icon: Archive,
        category: "action",
        shortcut: "E",
        action: () => {
          onArchive?.();
          onOpenChange(false);
        },
      },
      {
        id: "delete",
        label: "Delete Email",
        icon: Trash2,
        category: "action",
        shortcut: "#",
        action: () => {
          onDelete?.();
          onOpenChange(false);
        },
      },
      {
        id: "snooze",
        label: "Snooze Email",
        icon: Clock,
        category: "action",
        shortcut: "H",
        action: () => {
          onSnooze?.();
          onOpenChange(false);
        },
      },
      {
        id: "star",
        label: selectedEmail?.is_starred ? "Remove Star" : "Add Star",
        icon: Star,
        category: "action",
        shortcut: "S",
        action: () => {
          onStar?.();
          onOpenChange(false);
        },
      },
      {
        id: "reply",
        label: "Reply",
        icon: Mail,
        category: "action",
        shortcut: "R",
        action: () => {
          onReply?.();
          onOpenChange(false);
        },
      },
    ];

    // Add AI suggestions based on email content
    if (selectedEmail?.ai_category) {
      baseCommands.push({
        id: "ai-suggest",
        label: `This looks like ${selectedEmail.ai_category} - Quick actions available`,
        icon: Zap,
        category: "ai",
        action: () => {},
      });
    }

    return baseCommands;
  }, [selectedEmail, onArchive, onDelete, onSnooze, onStar, onReply, onOpenChange]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    return commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [commands, search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        filteredCommands[selectedIndex]?.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredCommands, selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl">
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-3">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No commands found
              </div>
            ) : (
              <>
                {["action", "ai", "navigation"].map((category) => {
                  const categoryCommands = filteredCommands.filter(
                    (cmd) => cmd.category === category
                  );
                  if (categoryCommands.length === 0) return null;

                  return (
                    <div key={category} className="mb-2">
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                        {category}
                      </div>
                      {categoryCommands.map((cmd, index) => {
                        const globalIndex = filteredCommands.indexOf(cmd);
                        return (
                          <button
                            key={cmd.id}
                            onClick={cmd.action}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                              globalIndex === selectedIndex
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-accent"
                            }`}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                          >
                            <cmd.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left">{cmd.label}</span>
                            {cmd.shortcut && (
                              <kbd className="px-2 py-0.5 text-xs bg-muted rounded border border-border">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Navigate with ↑↓ • Select with ↵</span>
          <span>Press ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
