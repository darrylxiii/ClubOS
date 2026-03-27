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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('messages');
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onMarkAsRead && (
          <>
            <ContextMenuItem onClick={onMarkAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              {t('context.markAsRead')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {onPin && (
          <ContextMenuItem onClick={onPin}>
            <Pin className="mr-2 h-4 w-4" />
            {isPinned ? t('context.unpinConversation') : t('context.pinConversation')}
          </ContextMenuItem>
        )}

        {onMute && (
          <ContextMenuItem onClick={onMute}>
            {isMuted ? (
              <>
                <Bell className="mr-2 h-4 w-4" />
                {t('context.unmuteNotifications')}
              </>
            ) : (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                {t('context.muteNotifications')}
              </>
            )}
          </ContextMenuItem>
        )}

        {onArchive && (
          <ContextMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            {isArchived ? t('context.unarchiveConversation') : t('context.archiveConversation')}
          </ContextMenuItem>
        )}

        {(isGroup && onLeave) && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onLeave} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('context.leaveGroup')}
            </ContextMenuItem>
          </>
        )}

        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('context.deleteConversation')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
