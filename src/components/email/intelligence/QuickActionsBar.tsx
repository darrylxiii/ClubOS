import { Button } from "@/components/ui/button";
import { 
  Archive, 
  Trash2, 
  Clock, 
  Tag, 
  MailCheck, 
  MailOpen,
  X,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickActionsBarProps {
  selectedCount: number;
  onArchive: () => void;
  onDelete: () => void;
  onSnooze: () => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onClearSelection: () => void;
}

export function QuickActionsBar({
  selectedCount,
  onArchive,
  onDelete,
  onSnooze,
  onMarkAsRead,
  onMarkAsUnread,
  onClearSelection,
}: QuickActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-2">
        <div className="text-sm font-medium mr-2">
          {selectedCount} selected
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onArchive}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          Archive
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onSnooze}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Snooze
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1">
              <Tag className="h-4 w-4" />
              More
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMarkAsRead}>
              <MailCheck className="h-4 w-4 mr-2" />
              Mark as read
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMarkAsUnread}>
              <MailOpen className="h-4 w-4 mr-2" />
              Mark as unread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border ml-2" />

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="gap-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
