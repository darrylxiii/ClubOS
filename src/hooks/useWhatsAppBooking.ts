/**
 * Hook for WhatsApp Booking Integration
 * 
 * Manages WhatsApp-based booking sessions (for admin/testing purposes)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';

interface WhatsAppSession {
  id: string;
  phone_number: string;
  status: 'active' | 'awaiting_confirmation' | 'completed' | 'expired';
  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  extracted_data: {
    preferred_date?: string;
    preferred_time?: string;
    guest_name?: string;
    guest_email?: string;
    language?: 'en' | 'nl';
  };
  booking_id?: string;
  created_at: string;
}

export function useWhatsAppBooking() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [currentSession, setCurrentSession] = useState<WhatsAppSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_booking_sessions' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSessions((data || []) as unknown as WhatsAppSession[]);
    } catch (error) {
      console.error('Failed to fetch WhatsApp sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const simulateMessage = useCallback(async (
    phoneNumber: string,
    message: string,
    bookingLinkSlug?: string,
    language: 'en' | 'nl' = 'en'
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-booking-handler', {
        body: {
          phone_number: phoneNumber,
          message,
          booking_link_slug: bookingLinkSlug,
          language
        }
      });

      if (error) throw error;

      // Refresh sessions
      await fetchSessions();

      return data;
    } catch (error) {
      console.error('Failed to process WhatsApp message:', error);
      toast({
        title: 'Message processing failed',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, fetchSessions]);

  const getSessionByPhone = useCallback(async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_booking_sessions' as any)
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setCurrentSession(data as unknown as WhatsAppSession);
      }
      
      return data as unknown as WhatsAppSession | null;
    } catch (error) {
      console.error('Failed to fetch session:', error);
      return null;
    }
  }, []);

  const getActiveSessionsCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('whatsapp_booking_sessions' as any)
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'awaiting_confirmation']);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to count active sessions:', error);
      return 0;
    }
  }, []);

  const expireSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_booking_sessions' as any)
        .update({ status: 'expired' })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: 'expired' as const } : s)
      );

      toast({
        title: 'Session expired',
        description: 'The WhatsApp session has been marked as expired',
      });
    } catch (error) {
      console.error('Failed to expire session:', error);
    }
  }, [toast]);

  return {
    sessions,
    currentSession,
    isLoading,
    fetchSessions,
    simulateMessage,
    getSessionByPhone,
    getActiveSessionsCount,
    expireSession,
  };
}
