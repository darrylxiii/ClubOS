import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditLock {
  id: string;
  candidate_id: string;
  section_name: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  last_heartbeat: string;
}

export function useEditLock(candidateId: string, sectionName: string) {
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [hasLock, setHasLock] = useState(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkLock();
    
    // Subscribe to lock changes
    const channel = supabase
      .channel(`edit-locks-${candidateId}-${sectionName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_edit_locks',
          filter: `candidate_id=eq.${candidateId},section_name=eq.${sectionName}`,
        },
        () => {
          checkLock();
        }
      )
      .subscribe();

    return () => {
      releaseLock();
      channel.unsubscribe();
    };
  }, [candidateId, sectionName]);

  const checkLock = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('candidate_edit_locks')
        .select('*, profiles:locked_by(full_name)')
        .eq('candidate_id', candidateId)
        .eq('section_name', sectionName)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking lock:', error);
        return;
      }

      if (data) {
        setIsLocked(true);
        setLockedBy(data.profiles?.full_name || 'Another user');
        setHasLock(data.locked_by === user.id);
      } else {
        setIsLocked(false);
        setLockedBy(null);
        setHasLock(false);
      }
    } catch (error) {
      console.error('Error checking lock:', error);
    }
  };

  const acquireLock = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to edit');
        return false;
      }

      // Try to insert lock
      const { error } = await (supabase as any)
        .from('candidate_edit_locks')
        .insert({
          candidate_id: candidateId,
          section_name: sectionName,
          locked_by: user.id,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        });

      if (error) {
        if (error.code === '23505') {
          // Already locked by someone else
          toast.error('This section is being edited by another user');
          await checkLock();
          return false;
        }
        throw error;
      }

      setHasLock(true);
      setIsLocked(true);
      startHeartbeat();
      return true;
    } catch (error) {
      console.error('Error acquiring lock:', error);
      toast.error('Failed to acquire edit lock');
      return false;
    }
  };

  const releaseLock = async () => {
    if (!hasLock) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from('candidate_edit_locks')
        .delete()
        .eq('candidate_id', candidateId)
        .eq('section_name', sectionName)
        .eq('locked_by', user.id);

      setHasLock(false);
      setIsLocked(false);
      stopHeartbeat();
    } catch (error) {
      console.error('Error releasing lock:', error);
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatInterval.current = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase as any)
          .from('candidate_edit_locks')
          .update({
            last_heartbeat: new Date().toISOString(),
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          })
          .eq('candidate_id', candidateId)
          .eq('section_name', sectionName)
          .eq('locked_by', user.id);
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 120000); // Every 2 minutes
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  return {
    isLocked,
    lockedBy,
    hasLock,
    acquireLock,
    releaseLock,
    checkLock,
  };
}
