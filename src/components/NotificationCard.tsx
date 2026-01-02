import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, Mail, Calendar, Briefcase, CheckCircle, 
  AlertCircle, Info, Archive, ExternalLink, Trash2, AtSign, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
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

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'mention':
      return <AtSign className="w-5 h-5" />;
    case 'message':
      return <Mail className="w-5 h-5" />;
    case 'interview':
      return <Calendar className="w-5 h-5" />;
    case 'application':
      return <Briefcase className="w-5 h-5" />;
    case 'referral':
      return <Gift className="w-5 h-5" />;
    case 'system':
      return <Bell className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
};

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'success':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'warning':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'error':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'update':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

const getCategoryIcon = (category: string) => {
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
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "group relative p-4 rounded-lg border transition-all cursor-pointer",
        "hover:shadow-md hover:border-primary/50",
        !notification.is_read && "bg-primary/5 border-l-4 border-l-primary"
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
            
            <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true 
              })}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {notification.message}
          </p>
          
          {/* Action buttons (show on hover) */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.is_read && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Mark read
              </Button>
            )}
            
            {notification.action_url && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(notification.id);
              }}
            >
              <Archive className="w-3 h-3 mr-1" />
              Archive
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
