import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  id: string;
  user_id: string | null;
  display_name: string;
  role: string | null;
  is_muted: boolean | null;
  is_video_off: boolean | null;
  is_screen_sharing: boolean | null;
  is_hand_raised: boolean | null;
  is_speaking: boolean | null;
  stream?: MediaStream;
}

interface VideoCallSession {
  id: string;
  conversation_id: string | null;
  host_id: string | null;
  title: string | null;
  meeting_code: string | null;
  is_recording: boolean | null;
  status: string | null;
  settings: any;
}

export function useVideoCall(conversationId: string) {
  const { user } = useAuth();
  const [session, setSession] = useState<VideoCallSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);

  // Create or join session
  const startSession = useCallback(async () => {
    if (!user) return null;

    // Check if session exists
    const { data: existingSession } = await supabase
      .from('video_call_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .single();

    if (existingSession) {
      setSession(existingSession as VideoCallSession);
      await joinSession(existingSession.id, existingSession.host_id || '');
      return existingSession;
    }

    // Create new session
    const meetingCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data: newSession, error } = await supabase
      .from('video_call_sessions')
      .insert({
        conversation_id: conversationId,
        host_id: user.id,
        title: `Call - ${new Date().toLocaleTimeString()}`,
        meeting_code: meetingCode,
        settings: {
          allow_screen_share: true,
          allow_recording: true,
          require_password: false,
          waiting_room_enabled: false,
          max_participants: 100
        }
      })
      .select()
      .single();

    if (error) throw error;

    setSession(newSession as VideoCallSession);
    await joinSession(newSession.id, newSession.host_id || '');
    return newSession;
  }, [user, conversationId]);

  // Join session as participant
  const joinSession = useCallback(async (sessionId: string, hostId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('video_call_participants')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        display_name: user.user_metadata?.full_name || user.email || 'Guest',
        role: hostId === user.id ? 'host' : 'participant'
      });

    if (error) console.error('Error joining session:', error);
  }, [user]);

  // Load participants
  const loadParticipants = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from('video_call_participants')
      .select('*')
      .eq('session_id', sessionId)
      .is('left_at', null);

    if (error) {
      console.error('Error loading participants:', error);
      return;
    }

    setParticipants((data || []) as Participant[]);
  }, []);

  // Subscribe to participant changes
  useEffect(() => {
    if (!session) return;

    loadParticipants(session.id);

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_call_participants',
          filter: `session_id=eq.${session.id}`
        },
        () => loadParticipants(session.id)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_call_reactions',
          filter: `session_id=eq.${session.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReactions(prev => [...prev, payload.new]);
            setTimeout(() => {
              setReactions(prev => prev.filter(r => r.id !== payload.new.id));
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session, loadParticipants]);

  // Update participant state
  const updateParticipantState = useCallback(async (participantId: string, updates: Partial<Participant>) => {
    const { error } = await supabase
      .from('video_call_participants')
      .update(updates)
      .eq('id', participantId);

    if (error) console.error('Error updating participant:', error);
  }, []);

  // Send reaction
  const sendReaction = useCallback(async (reactionType: string) => {
    if (!session || !user) return;

    const participant = participants.find(p => p.user_id === user.id);
    if (!participant) return;

    await supabase.from('video_call_reactions').insert({
      session_id: session.id,
      participant_id: participant.id,
      reaction_type: reactionType
    });
  }, [session, user, participants]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (!session) return;

    const newRecordingState = !isRecording;
    await supabase
      .from('video_call_sessions')
      .update({ is_recording: newRecordingState })
      .eq('id', session.id);

    setIsRecording(newRecordingState);
  }, [session, isRecording]);

  // End session
  const endSession = useCallback(async () => {
    if (!session || !user) return;

    // Mark participant as left
    const participant = participants.find(p => p.user_id === user.id);
    if (participant) {
      await supabase
        .from('video_call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('id', participant.id);
    }

    // If host, end session for everyone
    if (session.host_id === user.id) {
      await supabase
        .from('video_call_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    setSession(null);
  }, [session, user, participants]);

  return {
    session,
    participants,
    reactions,
    transcripts,
    isRecording,
    startSession,
    updateParticipantState,
    sendReaction,
    toggleRecording,
    endSession
  };
}