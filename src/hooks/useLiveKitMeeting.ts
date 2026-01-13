/**
 * LiveKit SFU Meeting Hook
 * Handles large meetings (10+ participants) via LiveKit's SFU infrastructure
 * 
 * Note: livekit-client types are defined inline to avoid eager import of the ~150KB library
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LiveKitParticipant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'lost';
  isLocal: boolean;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  screenTrack?: MediaStreamTrack;
}

interface UseLiveKitMeetingConfig {
  roomName: string;
  participantName: string;
  participantId: string;
  isHost?: boolean;
  onParticipantJoined?: (participant: LiveKitParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
  onConnectionStateChange?: (state: string) => void;
}

interface LiveKitMeetingState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  participants: Map<string, LiveKitParticipant>;
  localParticipant: LiveKitParticipant | null;
  roomName: string | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'lost';
  token: string | null;
}

export function useLiveKitMeeting({
  roomName,
  participantName,
  participantId,
  isHost = false,
  onParticipantJoined,
  onParticipantLeft,
  onConnectionStateChange
}: UseLiveKitMeetingConfig) {
  const [state, setState] = useState<LiveKitMeetingState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    participants: new Map(),
    localParticipant: null,
    roomName: null,
    connectionQuality: 'excellent',
    token: null
  });

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Room instance ref - type is generic to avoid importing livekit-client
  const roomRef = useRef<unknown>(null);

  /**
   * Get LiveKit token from edge function
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[LiveKit] Requesting token for room:', roomName);
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName,
          participantName,
          participantId,
          isHost,
          canPublish: true,
          canSubscribe: true
        }
      });

      if (error) {
        console.error('[LiveKit] Token error:', error);
        throw new Error(error.message);
      }

      if (!data?.token) {
        throw new Error('Invalid token response');
      }

      console.log('[LiveKit] ✅ Token received');
      return data.token;
    } catch (error) {
      console.error('[LiveKit] Failed to get token:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get LiveKit token'
      }));
      return null;
    }
  }, [roomName, participantName, participantId, isHost]);

  /**
   * Connect to LiveKit room
   */
  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) {
      console.log('[LiveKit] Already connected or connecting');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const token = await getToken();
      if (!token) return;

      // We don't need to manually connect here if we are using the LiveKitRoom component
      // The LiveKitRoom component handles connection when provided with a token
      // However, we expose the token so the component can use it

      setState(prev => ({
        ...prev,
        isConnecting: false,
        token: token, // This triggers the UI to render LiveKitRoom
        roomName
      }));

      onConnectionStateChange?.('connecting');
      // Actual connection happens in the UI component via useLiveKitRoom or LiveKitRoom

    } catch (error) {
      console.error('[LiveKit] Setup failed:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection setup failed'
      }));
      onConnectionStateChange?.('failed');
      toast.error('Failed to connect to meeting');
    }
  }, [getToken, state.isConnected, state.isConnecting, onConnectionStateChange, roomName]);

  /**
   * Disconnect from LiveKit room
   */
  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      token: null,
      participants: new Map(),
      localParticipant: null
    }));

    onConnectionStateChange?.('disconnected');
    console.log('[LiveKit] Disconnected');
  }, [onConnectionStateChange]);

  // Exposed controls (wrappers around room methods if room ref was available, 
  // but mostly state setters that UI components react to)
  const toggleAudio = useCallback((enabled: boolean) => setIsAudioEnabled(enabled), []);
  const toggleVideo = useCallback((enabled: boolean) => setIsVideoEnabled(enabled), []);
  const toggleScreenShare = useCallback((enabled: boolean) => setIsScreenSharing(enabled), []);

  return {
    // State
    ...state,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,

    // Actions
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,

    // LiveKit specific
    isLiveKitConfigured: true,
    sfuMode: true
  };
}
