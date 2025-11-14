import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EmailDetail } from "./EmailDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface EmailDetailDrawerProps {
  email: any;
  open: boolean;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMarkAsUnread: () => void;
  onToggleStar: (starred: boolean) => void;
  onSnooze: () => void;
}

export function EmailDetailDrawer({
  email,
  open,
  onClose,
  onReply,
  onForward,
  onArchive,
  onDelete,
  onMarkAsUnread,
  onToggleStar,
  onSnooze,
}: EmailDetailDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="h-[90vh] max-h-[90vh]">
        <DrawerHeader className="border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DrawerTitle className="text-base truncate flex-1">
              {email?.subject || "Email"}
            </DrawerTitle>
          </div>
        </DrawerHeader>
        <div className="overflow-y-auto flex-1 px-4">
          {email && (
            <EmailDetail
              email={email}
              onReply={onReply}
              onForward={onForward}
              onArchive={onArchive}
              onDelete={onDelete}
              onMarkAsUnread={onMarkAsUnread}
              onToggleStar={onToggleStar}
              onSnooze={onSnooze}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
