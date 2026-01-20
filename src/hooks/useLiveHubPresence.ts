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
    // Get all profiles with their presence status
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .limit(50);

    if (profileError) {
      console.error('Error loading members:', profileError);
      return;
    }

    // Get user presence data
    const { data: presenceData } = await supabase
      .from('user_presence')
      .select('user_id, status, last_seen')
      .in('user_id', profiles?.map(p => p.id) || []);

    const presenceMap = new Map(presenceData?.map(p => [p.user_id, p]) || []);

    // Determine status based on last_seen and status
    const now = new Date();
    const membersWithStatus = (profiles || []).map(member => {
      const presence = presenceMap.get(member.id);
      let status: 'online' | 'away' | 'offline' = 'offline';

      if (presence) {
        if (presence.status === 'online') {
          const lastSeen = new Date(presence.last_seen);
          const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
          
          if (minutesSinceLastSeen < 5) {
            status = 'online';
          } else if (minutesSinceLastSeen < 15) {
            status = 'away';
          } else {
            status = 'offline';
          }
        }
      }

      return {
        ...member,
        status
      };
    });

    setOnlineMembers(membersWithStatus);
  };

  const subscribeToPresence = () => {
    // Subscribe to user_presence table changes for real-time updates
    const presenceChannel = supabase
      .channel('user_presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        () => {
          // Reload members when presence changes
          loadMembers();
        }
      )
      .subscribe();

    // Track current user's presence
    const trackingChannel = supabase.channel('livehub-presence');
    
    trackingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = trackingChannel.presenceState();
        console.log('LiveHub presence state:', state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackingChannel.track({
            online_at: new Date().toISOString(),
            location: 'livehub'
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(trackingChannel);
    };
  };

  return {
    onlineMembers
  };
};
