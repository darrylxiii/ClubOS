import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Member {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'away' | 'offline';
}

export const useLiveHubPresence = () => {
  const [onlineMembers, setOnlineMembers] = useState<Member[]>([]);

  useEffect(() => {
    loadMembers();
    subscribeToPresence();
  }, []);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .limit(50);

    if (error) {
      console.error('Error loading members:', error);
      return;
    }

    // For now, mark all as online - in production, you'd check actual presence
    setOnlineMembers((data || []).map(member => ({
      ...member,
      status: 'online' as const
    })));
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence state:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    onlineMembers
  };
};
