import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Bell, Settings, Check, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { NotificationCard } from './NotificationCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { T } from '@/components/T';

interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  is_archived: boolean;
  action_url: string | null;
  metadata: unknown;
  created_at: string;
  read_at: string | null;
}

export const NotificationsPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    subscribeToNotifications();
  }, [user, filter]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const normalized: AppNotification[] = (data || []).map((n: any) => ({
        ...n,
        category: n.category ?? 'general',
        is_archived: n.is_archived ?? false,
      }));

      setNotifications(normalized);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const next: AppNotification = {
            ...(payload.new as any),
            category: (payload.new as any).category ?? 'general',
            is_archived: (payload.new as any).is_archived ?? false,
          };

          setNotifications((prev) => [next, ...prev]);
          toast.info(next.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ 
          ...n, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const archiveNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification archived');
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.is_read).length, 
    [notifications]
  );

  const groupedNotifications = useMemo(() => {
    const groups = {
      today: [] as AppNotification[],
      yesterday: [] as AppNotification[],
      thisWeek: [] as AppNotification[],
      older: [] as AppNotification[]
    };

    notifications.forEach(n => {
      const date = new Date(n.created_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) groups.today.push(n);
      else if (diffDays === 1) groups.yesterday.push(n);
      else if (diffDays <= 7) groups.thisWeek.push(n);
      else groups.older.push(n);
    });

    return groups;
  }, [notifications]);

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-background/80 border-b flex-shrink-0">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">
                <T k="common:notifications.title" fallback="Notifications" />
              </h2>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? (
                  <T k="common:notifications.unread" fallback={`${unreadCount} unread`} values={{ count: unreadCount }} />
                ) : (
                  'All caught up'
                )}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] flex-shrink-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100]">
              <DropdownMenuItem onClick={markAllAsRead} disabled={unreadCount === 0}>
                <Check className="w-4 h-4 mr-2" />
                <T k="common:notifications.markAllRead" fallback="Mark all as read" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings?tab=notifications')}>
                <Settings className="w-4 h-4 mr-2" />
                Notification settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 px-3 sm:px-4 pb-3 overflow-x-auto mobile-scroll-x">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer min-h-[36px] flex items-center whitespace-nowrap"
            onClick={() => setFilter('all')}
          >
            <T k="common:notifications.filters.all" fallback="All" />
          </Badge>
          <Badge
            variant={filter === 'unread' ? 'default' : 'outline'}
            className="cursor-pointer min-h-[36px] flex items-center whitespace-nowrap"
            onClick={() => setFilter('unread')}
          >
            <T k="common:notifications.filters.unread" fallback="Unread" /> {unreadCount > 0 && `(${unreadCount})`}
          </Badge>
          {['mention', 'message', 'interview', 'application', 'referral', 'system'].map(type => (
            <Badge
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              className="cursor-pointer capitalize min-h-[36px] flex items-center whitespace-nowrap"
              onClick={() => setFilter(type)}
            >
              {t(`common:notifications.filters.${type}`, type)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="p-3 sm:p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 sm:p-4">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8 text-center">
            <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2 text-sm sm:text-base">
              <T k="common:notifications.noNotifications" fallback="No notifications" />
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {filter === 'unread' 
                ? "You're all caught up!" 
                : "You'll see notifications here when something important happens."}
            </p>
          </div>
        ) : (
          <VirtualizedNotificationList
            groupedNotifications={groupedNotifications}
            markAsRead={markAsRead}
            archiveNotification={archiveNotification}
            deleteNotification={deleteNotification}
            handleNotificationClick={handleNotificationClick}
          />
        )}
      </div>
    </div>
  );
};

// Virtualized notification list component
function VirtualizedNotificationList({
  groupedNotifications,
  markAsRead,
  archiveNotification,
  deleteNotification,
  handleNotificationClick,
}: {
  groupedNotifications: Record<string, AppNotification[]>;
  markAsRead: (id: string) => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  handleNotificationClick: (notification: AppNotification) => Promise<void>;
}) {
  // Flatten notifications for virtualization
  const flatItems = useMemo(() => {
    const items: Array<{ type: 'header'; period: string; count: number } | { type: 'notification'; notification: AppNotification }> = [];
    
    Object.entries(groupedNotifications).forEach(([period, notifications]) => {
      if (notifications.length > 0) {
        items.push({ type: 'header', period, count: notifications.length });
        notifications.forEach(notification => {
          items.push({ type: 'notification', notification });
        });
      }
    });
    
    return items;
  }, [groupedNotifications]);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => flatItems[index].type === 'header' ? 44 : 88,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto p-3 sm:p-4"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = flatItems[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.type === 'header' ? (
                <div className="flex items-center gap-2 p-2 mb-2">
                  <ChevronDown className="w-4 h-4" />
                  <span className="font-semibold capitalize text-sm sm:text-base">{item.period}</span>
                  <Badge variant="secondary" className="ml-auto">{item.count}</Badge>
                </div>
              ) : (
                <div className="mb-2">
                  <NotificationCard
                    notification={item.notification}
                    onMarkAsRead={markAsRead}
                    onArchive={archiveNotification}
                    onDelete={deleteNotification}
                    onClick={() => handleNotificationClick(item.notification)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
