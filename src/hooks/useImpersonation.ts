import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImpersonationSession {
  id: string;
  admin_id: string;
  target_user_id: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  reason: string | null;
  is_active?: boolean;
}

const IMPERSONATION_STORAGE_KEY = 'tqc_impersonation_session';

export function useImpersonation() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ImpersonationSession | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Check for active impersonation session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        // Check if session is still valid
        if (new Date(session.expires_at) > new Date() && session.is_active) {
          setActiveSession(session);
          setIsImpersonating(true);
        } else {
          sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        }
      } catch {
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      }
    }
  }, []);

  const startImpersonation = useCallback(async (targetUserId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('start_impersonation_session', {
        p_target_user_id: targetUserId,
        p_reason: reason || undefined,
      });

      if (error) throw error;

      // Fetch the created session
      const { data: session, error: fetchError } = await supabase
        .from('admin_impersonation_sessions')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      // Store in session storage
      sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(session));
      setActiveSession(session);
      setIsImpersonating(true);

      toast.success('Impersonation started - viewing as user (read-only)');
      return true;
    } catch (error: any) {
      console.error('Error starting impersonation:', error);
      toast.error(error.message || 'Failed to start impersonation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endImpersonation = useCallback(async (): Promise<boolean> => {
    if (!activeSession) return false;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('end_impersonation_session', {
        p_session_id: activeSession.id,
      });

      if (error) throw error;

      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setActiveSession(null);
      setIsImpersonating(false);

      toast.success('Impersonation ended');
      return true;
    } catch (error: any) {
      console.error('Error ending impersonation:', error);
      toast.error(error.message || 'Failed to end impersonation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeSession]);

  const getTargetUserInfo = useCallback(async () => {
    if (!activeSession) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', activeSession.target_user_id)
      .single();

    if (error) return null;
    return data;
  }, [activeSession]);

  return {
    isLoading,
    isImpersonating,
    activeSession,
    startImpersonation,
    endImpersonation,
    getTargetUserInfo,
  };
}
