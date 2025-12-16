import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommunicationNotification {
  id: string;
  type: 'going_cold' | 'ready_to_convert' | 'needs_escalation' | 'high_engagement' | 'new_message';
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  createdAt: string;
  patternId?: string;
}

export function useCommunicationNotifications() {
  const [notifications, setNotifications] = useState<CommunicationNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active patterns as notifications
      const { data: patterns, error } = await supabase
        .from('cross_channel_patterns')
        .select('*')
        .eq('is_active', true)
        .order('detected_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifs: CommunicationNotification[] = (patterns || []).map(p => ({
        id: p.id,
        type: p.pattern_type as CommunicationNotification['type'],
        title: getPatternTitle(p.pattern_type || ''),
        message: p.details ? 
          (typeof p.details === 'string' ? p.details : JSON.stringify(p.details)) :
          getPatternMessage(p.pattern_type || ''),
        entityType: p.entity_type || '',
        entityId: p.entity_id,
        priority: (p.confidence || 0) >= 0.8 ? 'high' : (p.confidence || 0) >= 0.5 ? 'medium' : 'low',
        read: !!p.acknowledged_at,
        createdAt: p.detected_at || new Date().toISOString(),
        patternId: p.id
      }));

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('cross_channel_patterns')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('cross_channel_patterns')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: 'All notifications marked as read' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [notifications, toast]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('cross_channel_patterns')
        .update({
          is_active: false,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  // Real-time subscription for new patterns
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('communication_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cross_channel_patterns'
      }, (payload) => {
        const p = payload.new as any;
        const newNotif: CommunicationNotification = {
          id: p.id,
          type: p.pattern_type,
          title: getPatternTitle(p.pattern_type),
          message: p.pattern_details || getPatternMessage(p.pattern_type),
          entityType: p.entity_type,
          entityId: p.entity_id,
          priority: (p.confidence || 0) >= 0.8 ? 'high' : 'medium',
          read: false,
          createdAt: p.detected_at || new Date().toISOString(),
          patternId: p.id
        };

        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show toast for high priority
        if (newNotif.priority === 'high') {
          toast({
            title: newNotif.title,
            description: newNotif.message,
            variant: 'default'
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refetch: fetchNotifications
  };
}

function getPatternTitle(type: string): string {
  const titles: Record<string, string> = {
    'going_cold': 'Relationship Going Cold',
    'ready_to_convert': 'Ready to Convert',
    'needs_escalation': 'Needs Escalation',
    'high_engagement': 'High Engagement Detected',
    'new_message': 'New Message Received'
  };
  return titles[type] || 'Communication Alert';
}

function getPatternMessage(type: string): string {
  const messages: Record<string, string> = {
    'going_cold': 'This contact has been inactive. Consider reaching out.',
    'ready_to_convert': 'Strong buying signals detected. Time to move forward.',
    'needs_escalation': 'Multiple issues detected. Consider escalating.',
    'high_engagement': 'Very responsive and engaged. Good time to advance.',
    'new_message': 'You have a new message to review.'
  };
  return messages[type] || 'Review this communication pattern.';
}
