import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for security tracking functions - login attempts and session management
 */
export function useSecurityTracking() {
  /**
   * Record a login attempt (successful or failed)
   */
  const recordLoginAttempt = useCallback(async (
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('record_login_attempt', {
        p_email: email,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || navigator.userAgent,
        p_success: success,
      });
      
      if (error) {
        console.error('[SecurityTracking] Failed to record login attempt:', error);
      }
      
      return data;
    } catch (err) {
      console.error('[SecurityTracking] Error recording login attempt:', err);
      return null;
    }
  }, []);

  /**
   * Create a new user session entry
   */
  const createSession = useCallback(async (
    userId: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('create_user_session', {
        p_user_id: userId,
        p_session_id: sessionId || null,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || navigator.userAgent,
        p_device_fingerprint: deviceFingerprint || null,
      });
      
      if (error) {
        console.error('[SecurityTracking] Failed to create session:', error);
      }
      
      return data;
    } catch (err) {
      console.error('[SecurityTracking] Error creating session:', err);
      return null;
    }
  }, []);

  /**
   * End a user session
   */
  const endSession = useCallback(async (
    userId: string,
    sessionId?: string
  ) => {
    try {
      const { error } = await supabase.rpc('end_user_session', {
        p_user_id: userId,
        p_session_id: sessionId || null,
      });
      
      if (error) {
        console.error('[SecurityTracking] Failed to end session:', error);
      }
    } catch (err) {
      console.error('[SecurityTracking] Error ending session:', err);
    }
  }, []);

  /**
   * Update session last activity
   */
  const updateSessionActivity = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase.rpc('update_session_activity', {
        p_session_id: sessionId,
      });
      
      if (error) {
        console.error('[SecurityTracking] Failed to update session activity:', error);
      }
    } catch (err) {
      console.error('[SecurityTracking] Error updating session activity:', err);
    }
  }, []);

  return {
    recordLoginAttempt,
    createSession,
    endSession,
    updateSessionActivity,
  };
}

/**
 * Generate a simple device fingerprint for session tracking
 */
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.width + 'x' + screen.height,
    screen.colorDepth.toString(),
  ];
  
  // Simple hash function
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16);
}
