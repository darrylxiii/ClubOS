import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { keys: ["↑", "↓"], desc: "Navigate tasks" },
  { keys: ["Enter"], desc: "Open task detail" },
  { keys: ["x"], desc: "Toggle selection" },
  { keys: ["s"], desc: "Cycle status" },
  { keys: ["p"], desc: "Cycle priority" },
  { keys: ["⌘", "K"], desc: "Quick add task" },
  { keys: ["?"], desc: "Show shortcuts" },
  { keys: ["Esc"], desc: "Close / deselect" },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const { t } = useTranslation('common');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-semibold">{t("keyboard_shortcuts", "Keyboard Shortcuts")}</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-5 space-y-1">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">{desc}</span>
              <div className="flex items-center gap-0.5">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-[22px] h-5 px-1.5 flex items-center justify-center rounded bg-muted border border-border/50 text-[10px] font-mono text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
