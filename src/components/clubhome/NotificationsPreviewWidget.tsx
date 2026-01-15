import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowRight, CheckCheck, Mail, Briefcase, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { T } from "@/components/T";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message':
      return MessageSquare;
    case 'match':
    case 'job':
      return Briefcase;
    case 'referral':
      return Users;
    default:
      return Mail;
  }
};

export const NotificationsPreviewWidget = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const recentNotifications = notifications.slice(0, 3);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="relative">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <T k="common:notifications.title" fallback="Notifications" />
          </CardTitle>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline"><T k="common:notifications.markAllRead" fallback="Mark all read" /></span>
            </Button>
          )}
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {unreadCount > 0 
            ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
            : 'You\'re all caught up!'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentNotifications.length > 0 ? (
          <>
            {recentNotifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg cursor-pointer
                    transition-colors hover:bg-muted/50
                    ${!notification.is_read ? 'bg-primary/5 border border-primary/20' : 'bg-muted/20'}
                  `}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className={`
                    p-2 rounded-lg shrink-0
                    ${!notification.is_read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                  `}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!notification.is_read ? 'font-medium' : ''}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </motion.div>
              );
            })}

            <Button asChild variant="ghost" size="sm" className="w-full mt-2">
              <Link to="/notifications">
                <T k="common:notifications.viewAll" fallback="View All Notifications" />
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              <T k="common:notifications.empty" fallback="No notifications yet" />
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
