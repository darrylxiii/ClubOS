import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface CRMKeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["P"], description: "Go to Pipeline" },
    { keys: ["I"], description: "Go to Inbox" },
    { keys: ["C"], description: "Go to Campaigns" },
  ]},
  { category: "Actions", items: [
    { keys: ["⌘", "K"], description: "Global search" },
    { keys: ["A"], description: "New activity" },
    { keys: ["E"], description: "Edit selected prospect" },
    { keys: ["N"], description: "New prospect" },
    { keys: ["R"], description: "Refresh data" },
  ]},
  { category: "Pipeline", items: [
    { keys: ["1-6"], description: "Move to stage" },
    { keys: ["Space"], description: "Select/deselect" },
    { keys: ["Esc"], description: "Clear selection" },
  ]},
];

export function CRMKeyboardShortcutsHelp({ open, onOpenChange }: CRMKeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <Badge 
                          key={keyIndex} 
                          variant="outline" 
                          className="px-2 py-0.5 text-xs font-mono"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Press <Badge variant="outline" className="px-1.5 py-0 text-xs">?</Badge> to toggle this help
        </p>
      </DialogContent>
    </Dialog>
  );
}
