import { motion } from '@/lib/motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  AlertCircle, Info, Archive, ExternalLink, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}


const getCategoryStyles = (category: string | null) => {
  switch (category) {
    case 'success':
      return 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]';
    case 'warning':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]';
    case 'error':
      return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
    case 'update':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
    default:
      return 'bg-white/5 text-muted-foreground border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]';
  }
};

const getCategoryIcon = (category: string | null) => {
  switch (category) {
    case 'success':
      return <CheckCircle className="w-5 h-5" />;
    case 'warning':
    case 'error':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
};

export function NotificationCard({
  notification,
  onMarkAsRead,
  onArchive,
  onDelete,
  onClick
}: NotificationCardProps) {
  const { t } = useTranslation('common');
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "group relative p-4 rounded-xl border border-b-0 border-l-0 border-r-0 border-t-white/5 backdrop-blur-md bg-white/[0.02] transition-all duration-300 cursor-pointer overflow-hidden",
        "hover:bg-white-[0.04] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
        !notification.is_read ? "bg-primary/5 border-l-2 border-l-primary border-t-primary/20" : ""
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
          getCategoryStyles(notification.category)
        )}>
          {getCategoryIcon(notification.category)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn(
              "text-sm leading-tight",
              !notification.is_read ? "font-semibold" : "font-medium"
            )}>
              {notification.title}
            </h3>
            
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap shrink-0 mt-0.5">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true 
              })}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground/80 line-clamp-2 md:pl-0 pr-12">
            {notification.message}
          </p>
          
          {/* Floating Action Dock */}
          <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 bg-background/80 backdrop-blur-md rounded-full border border-white/5 shadow-lg p-0.5">
            {!notification.is_read && (
              <Button 
                variant="ghost" 
                size="icon"
                className="w-7 h-7 rounded-full hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                title={t('notifications.markAsRead', 'Mark as read')}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="sr-only">Mark read</span>
              </Button>
            )}
            
            {notification.action_url && (
              <Button 
                variant="ghost" 
                size="icon"
                className="w-7 h-7 rounded-full hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                title={t('notifications.openLink', 'Open link')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="sr-only">Open</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              className="w-7 h-7 rounded-full hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(notification.id);
              }}
              title={t('notifications.archive', 'Archive')}
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="sr-only">Archive</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="w-7 h-7 rounded-full hover:bg-red-500/20 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              title={t('notifications.delete', 'Delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
