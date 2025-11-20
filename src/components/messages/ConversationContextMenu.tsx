import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Pin,
  Archive,
  Bell,
  BellOff,
  Trash2,
  LogOut,
  CheckCheck,
} from 'lucide-react';
import { ReactNode } from 'react';

interface ConversationContextMenuProps {
  children: ReactNode;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  isGroup?: boolean;
  onPin?: () => void;
  onArchive?: () => void;
  onMute?: () => void;
  onMarkAsRead?: () => void;
  onLeave?: () => void;
  onDelete?: () => void;
}

export const ConversationContextMenu = ({
  children,
  isPinned,
  isMuted,
  isArchived,
  isGroup,
  onPin,
  onArchive,
  onMute,
  onMarkAsRead,
  onLeave,
  onDelete,
}: ConversationContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onMarkAsRead && (
          <>
            <ContextMenuItem onClick={onMarkAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark as read
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {onPin && (
          <ContextMenuItem onClick={onPin}>
            <Pin className="mr-2 h-4 w-4" />
            {isPinned ? 'Unpin conversation' : 'Pin conversation'}
          </ContextMenuItem>
        )}

        {onMute && (
          <ContextMenuItem onClick={onMute}>
            {isMuted ? (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Unmute notifications
              </>
            ) : (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Mute notifications
              </>
            )}
          </ContextMenuItem>
        )}

        {onArchive && (
          <ContextMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            {isArchived ? 'Unarchive conversation' : 'Archive conversation'}
          </ContextMenuItem>
        )}

        {(isGroup && onLeave) && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onLeave} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Leave group
            </ContextMenuItem>
          </>
        )}

        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete conversation
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
