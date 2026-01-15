import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, ArrowUp, ArrowDown, Search, Archive, Trash, PenSquare } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const groups = [
    {
      title: "Navigation",
      items: [
        { key: "j", label: "Next Email", icon: ArrowDown },
        { key: "k", label: "Previous Email", icon: ArrowUp },
        { key: "/", label: "Search", icon: Search },
        { key: "Esc", label: "Clear selection / Close" },
      ]
    },
    {
      title: "Actions",
      items: [
        { key: "e", label: "Archive", icon: Archive },
        { key: "#", label: "Delete", icon: Trash },
        { key: "c", label: "Compose", icon: PenSquare },
        { key: "r", label: "Reply" },
        { key: "a", label: "Reply All" },
        { key: "f", label: "Forward" },
        { key: "?", label: "Show this help" },
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider text-[10px]">
                {group.title}
              </h4>
              <div className="grid gap-2">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon className="h-3 w-3 text-muted-foreground" />}
                      <span>{item.label}</span>
                    </div>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center">
            Pro tip: Press <kbd className="font-mono font-bold">?</kbd> anywhere in the inbox to open this menu.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
