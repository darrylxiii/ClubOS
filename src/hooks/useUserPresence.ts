import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update user presence to online
    const setOnline = async () => {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status: 'online',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error setting user online:', error);
      } else {
        console.log('User presence set to online');
      }
    };

    // Set user offline when leaving
    const setOffline = async () => {
      const { error } = await supabase
        .from('user_presence')
        .update({
          status: 'offline',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error setting user offline:', error);
      }
    };

    // Set online on mount
    setOnline();

    // Update presence every 30 seconds
    const intervalId = setInterval(setOnline, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set offline on unmount/close
    window.addEventListener('beforeunload', setOffline);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', setOffline);
      setOffline();
    };
  }, [user]);
};
