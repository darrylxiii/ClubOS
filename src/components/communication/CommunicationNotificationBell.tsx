import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, AlertTriangle, TrendingUp, MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCommunicationNotifications } from '@/hooks/useCommunicationNotifications';
import { useNavigate } from 'react-router-dom';

export function CommunicationNotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    dismissNotification 
  } = useCommunicationNotifications();

  const typeIcons = {
    'going_cold': Clock,
    'ready_to_convert': TrendingUp,
    'needs_escalation': AlertTriangle,
    'high_engagement': TrendingUp,
    'new_message': MessageSquare
  };

  const typeColors = {
    'going_cold': 'text-orange-500',
    'ready_to_convert': 'text-green-500',
    'needs_escalation': 'text-red-500',
    'high_engagement': 'text-blue-500',
    'new_message': 'text-primary'
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    setOpen(false);
    
    // Navigate based on entity type
    if (notification.entityType === 'candidate') {
      navigate(`/candidates/${notification.entityId}`);
    } else if (notification.entityType === 'company') {
      navigate(`/companies/${notification.entityId}`);
    } else {
      navigate('/admin/communication-hub');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Communication Alerts</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {notifications.map((notification, index) => {
                  const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Bell;
                  const color = typeColors[notification.type as keyof typeof typeColors] || 'text-primary';

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-1.5 rounded-lg bg-muted", !notification.read && "bg-primary/10")}>
                          <Icon className={cn("h-4 w-4", color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              "text-xs font-medium truncate",
                              !notification.read && "text-foreground",
                              notification.read && "text-muted-foreground"
                            )}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1">
                              {notification.priority === 'high' && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                  High
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotification(notification.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              navigate('/admin/communication-hub');
            }}
          >
            View all communication insights
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
