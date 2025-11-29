import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserStatus = 'online' | 'away' | 'dnd' | 'invisible' | 'offline';

interface UserPresenceExtended {
  user_id: string;
  status: UserStatus;
  custom_status: string | null;
  custom_status_emoji: string | null;
  custom_status_expires_at: string | null;
  current_activity: string | null;
  timezone: string;
  last_seen: string;
  updated_at: string;
}

export const useUserPresenceExtended = () => {
  const { user } = useAuth();
  const [presence, setPresence] = useState<UserPresenceExtended | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    loadPresence();
    subscribeToPresence();
  }, [user]);

  const loadPresence = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_presence_extended')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading presence:', error);
    } else if (data) {
      setPresence(data as UserPresenceExtended);
    } else {
      // Initialize presence if it doesn't exist
      await updateStatus('online');
    }
    setLoading(false);
  };

  const subscribeToPresence = () => {
    if (!user) return;

    const channel = supabase
      .channel(`presence-extended-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence_extended',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setPresence(payload.new as UserPresenceExtended);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateStatus = useCallback(async (status: UserStatus) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_presence_extended')
      .upsert({
        user_id: user.id,
        status,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating status:', error);
    } else {
      setPresence(data as UserPresenceExtended);
    }
  }, [user]);

  const updateCustomStatus = useCallback(async (
    customStatus: string | null,
    emoji: string | null = null,
    expiresAt: string | null = null
  ) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_presence_extended')
      .upsert({
        user_id: user.id,
        custom_status: customStatus,
        custom_status_emoji: emoji,
        custom_status_expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating custom status:', error);
    } else {
      setPresence(data as UserPresenceExtended);
    }
  }, [user]);

  const updateActivity = useCallback(async (activity: string | null) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_presence_extended')
      .upsert({
        user_id: user.id,
        current_activity: activity,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating activity:', error);
    } else {
      setPresence(data as UserPresenceExtended);
    }
  }, [user]);

  return {
    presence,
    loading,
    updateStatus,
    updateCustomStatus,
    updateActivity,
  };
};
