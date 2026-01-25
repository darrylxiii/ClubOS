/**
 * Hook for Voice Booking via ElevenLabs
 * 
 * Manages voice-based booking sessions
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';

interface VoiceSession {
  sessionId: string;
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'confirming';
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
  extractedData: {
    date?: string;
    time?: string;
    name?: string;
    email?: string;
  };
  bookingId?: string;
}

interface UseVoiceBookingOptions {
  bookingLinkSlug?: string;
  onBookingComplete?: (bookingId: string) => void;
}

export function useVoiceBooking(options: UseVoiceBookingOptions = {}) {
  const { toast } = useToast();
  const [session, setSession] = useState<VoiceSession>({
    sessionId: '',
    status: 'idle',
    transcript: [],
    extractedData: {},
  });
  const [isActive, setIsActive] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>('');

  const generateSessionId = () => `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const startSession = useCallback(async () => {
    const sessionId = generateSessionId();

    try {
      const { data, error } = await supabase.functions.invoke('voice-booking-handler', {
        body: {
          session_id: sessionId,
          action: 'start',
          booking_link_slug: options.bookingLinkSlug
        }
      });

      if (error) throw error;

      setSession({
        sessionId,
        status: 'speaking',
        transcript: [{ role: 'assistant', content: data.response_text }],
        extractedData: {},
      });
      setIsActive(true);
      setLastResponse(data.response_text);

      return data.response_text;
    } catch (error) {
      console.error('Failed to start voice session:', error);
      toast({
        title: 'Voice booking unavailable',
        description: 'Please try booking online instead',
        variant: 'destructive',
      });
      return null;
    }
  }, [options.bookingLinkSlug, toast]);

  const processTranscript = useCallback(async (userTranscript: string) => {
    if (!session.sessionId) return null;

    setSession(prev => ({
      ...prev,
      status: 'processing',
      transcript: [...prev.transcript, { role: 'user', content: userTranscript }]
    }));

    try {
      const { data, error } = await supabase.functions.invoke('voice-booking-handler', {
        body: {
          session_id: session.sessionId,
          action: 'process',
          transcript: userTranscript,
          user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (error) throw error;

      setSession(prev => ({
        ...prev,
        status: data.ready_to_confirm ? 'confirming' : 'speaking',
        transcript: [...prev.transcript, { role: 'assistant', content: data.response_text }],
        extractedData: data.extracted_data || prev.extractedData
      }));
      setLastResponse(data.response_text);

      return data;
    } catch (error) {
      console.error('Failed to process transcript:', error);
      setSession(prev => ({ ...prev, status: 'speaking' }));
      return null;
    }
  }, [session.sessionId]);

  const confirmBooking = useCallback(async () => {
    if (!session.sessionId) return null;

    setSession(prev => ({ ...prev, status: 'processing' }));

    try {
      const { data, error } = await supabase.functions.invoke('voice-booking-handler', {
        body: {
          session_id: session.sessionId,
          action: 'confirm'
        }
      });

      if (error) throw error;

      if (data.success && data.booking_id) {
        setSession(prev => ({
          ...prev,
          status: 'idle',
          bookingId: data.booking_id,
          transcript: [...prev.transcript, { role: 'assistant', content: data.response_text }]
        }));
        setLastResponse(data.response_text);
        setIsActive(false);

        toast({
          title: 'Booking confirmed!',
          description: 'You\'ll receive a confirmation email shortly',
        });

        options.onBookingComplete?.(data.booking_id);
      } else {
        setSession(prev => ({
          ...prev,
          status: 'speaking',
          transcript: [...prev.transcript, { role: 'assistant', content: data.response_text || 'Please provide the missing information.' }]
        }));
        setLastResponse(data.response_text);
      }

      return data;
    } catch (error) {
      console.error('Failed to confirm booking:', error);
      setSession(prev => ({ ...prev, status: 'speaking' }));
      return null;
    }
  }, [session.sessionId, options, toast]);

  const endSession = useCallback(async () => {
    if (!session.sessionId) return;

    try {
      await supabase.functions.invoke('voice-booking-handler', {
        body: {
          session_id: session.sessionId,
          action: 'end'
        }
      });
    } catch (error) {
      console.error('Failed to end session:', error);
    }

    setSession({
      sessionId: '',
      status: 'idle',
      transcript: [],
      extractedData: {},
    });
    setIsActive(false);
    setLastResponse('');
  }, [session.sessionId]);

  // Start listening with browser speech recognition
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: 'Speech recognition not supported',
        description: 'Please use Chrome or Safari',
        variant: 'destructive',
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setSession(prev => ({ ...prev, status: 'listening' }));
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      processTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setSession(prev => ({ ...prev, status: 'speaking' }));
    };

    recognition.onend = () => {
      if (session.status === 'listening') {
        setSession(prev => ({ ...prev, status: 'speaking' }));
      }
    };

    recognition.start();
  }, [session.status, processTranscript, toast]);

  return {
    session,
    isActive,
    lastResponse,
    startSession,
    processTranscript,
    confirmBooking,
    endSession,
    startListening,
  };
}
