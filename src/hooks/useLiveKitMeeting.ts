/**
 * LiveKit SFU Meeting Hook
 * Handles large meetings (10+ participants) via LiveKit's SFU infrastructure
 * With retry logic and exponential backoff
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Room, RoomEvent, Participant, RemoteParticipant, LocalParticipant, Track, RemoteTrack, RemoteTrackPublication } from 'livekit-client';

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

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

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

  // We keep a ref to the room instance
  const roomRef = useRef<Room | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Get LiveKit token from edge function with retry logic
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    const connectionStartTime = Date.now();
    let lastError: Error | null = null;

    console.log('[LiveKit] 🚦 getToken started at', new Date().toISOString());

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create abort controller for this request with timeout
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn(`[LiveKit] ⏰ Request timeout (attempt ${attempt})`);
          abortControllerRef.current?.abort();
        }, 10000); // 10 second timeout per attempt
        
        console.log(`[LiveKit] 🔑 Requesting token (attempt ${attempt}/${MAX_RETRIES}) at ${Date.now() - connectionStartTime}ms...`);
        
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

        clearTimeout(timeoutId);

        if (error) {
          console.error(`[LiveKit] ❌ Token request error (attempt ${attempt}):`, error);
          throw new Error(error.message);
        }

        if (!data?.token) {
          console.error(`[LiveKit] ❌ No token in response:`, data);
          throw new Error('Invalid token response - no token received');
        }

        const elapsed = Date.now() - connectionStartTime;
        console.log(`[LiveKit] ✅ Token received successfully in ${elapsed}ms`);
        return data.token;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const elapsed = Date.now() - connectionStartTime;
        console.warn(`[LiveKit] ⚠️ Token attempt ${attempt}/${MAX_RETRIES} failed at ${elapsed}ms:`, lastError.message);

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt - 1];
          console.log(`[LiveKit] ⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // CRITICAL: All retries failed - set BOTH isConnecting to false AND token to null
    const totalElapsed = Date.now() - connectionStartTime;
    const errorMsg = `Failed to get LiveKit token after ${MAX_RETRIES} attempts`;
    console.error('[LiveKit] ❌', errorMsg);
    console.error('[LiveKit] ❌ Total connection attempt time:', totalElapsed, 'ms');
    
    setState(prev => ({
      ...prev,
      isConnecting: false,  // ← CRITICAL: Must set to false to trigger fallback
      token: null,          // ← CRITICAL: Explicitly set token to null
      error: lastError?.message || errorMsg
    }));
    return null;
  }, [roomName, participantName, participantId, isHost]);

  /**
   * Connect to LiveKit room
   */
  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) {
      console.log('[LiveKit] ⏭️ Already connected or connecting, skipping...');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    onConnectionStateChange?.('connecting');

    try {
      console.log('[LiveKit] 🚀 Starting connection to room:', roomName);
      
      const token = await getToken();
      if (!token) {
        // Error already set in getToken
        setState(prev => ({ ...prev, isConnecting: false }));
        onConnectionStateChange?.('failed');
        return;
      }

      // Token obtained - LiveKitRoom component will handle actual connection
      setState(prev => ({
        ...prev,
        isConnecting: false,
        token: token,
        roomName
      }));

      console.log('[LiveKit] 🎉 Token ready, LiveKitRoom will connect');

    } catch (error) {
      console.error('[LiveKit] ❌ Connection setup failed:', error);
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
    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      token: null,
      participants: new Map(),
      localParticipant: null
    }));

    onConnectionStateChange?.('disconnected');
    console.log('[LiveKit] 👋 Disconnected');
  }, [onConnectionStateChange]);

  // Exposed controls
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
