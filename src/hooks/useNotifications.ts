import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  action_url: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string;
  content?: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user]);

  const createNotification = useCallback(async (
    targetUserId: string,
    type: string,
    title: string,
    actionUrl: string | null = null,
    metadata: any = {}
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type,
          title,
          action_url: actionUrl,
          metadata,
        } as any);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    loadNotifications();

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            toast(newNotification.title, {
              description: newNotification.content || undefined,
            });
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new as Notification : n))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
}
