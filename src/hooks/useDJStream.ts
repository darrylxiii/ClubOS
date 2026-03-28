import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LIVEKIT_SERVER_URL = 'wss://thequantumclub-os.livekit.cloud';

interface DJStreamState {
  isStreaming: boolean;
  isConnecting: boolean;
  listenerCount: number;
  roomName: string | null;
  error: string | null;
}

/**
 * Publishes a MediaStream (from useHardwareCapture) to LiveKit
 * so listeners can receive real-time audio.
 *
 * Flow:
 * 1. Request token from livekit-token edge function
 * 2. Connect to LiveKit room
 * 3. Publish audio track from the hardware capture stream
 * 4. Listeners connect to the same room and subscribe
 */
export function useDJStream() {
  const [state, setState] = useState<DJStreamState>({
    isStreaming: false,
    isConnecting: false,
    listenerCount: 0,
    roomName: null,
    error: null,
  });

  const roomRef = useRef<any>(null);
  const trackRef = useRef<any>(null);

  // ── Start streaming ──────────────────────────────────────────────────────
  const startStream = useCallback(async (
    audioStream: MediaStream,
    liveSessionId: string,
  ) => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const roomName = `dj-live-${liveSessionId}`;

      // Get LiveKit token from edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName,
          participantName: user.email?.split('@')[0] || 'DJ',
          participantId: user.id,
          isHost: true,
          canPublish: true,
          canSubscribe: false,
        },
      });

      if (tokenError || !tokenData?.token) {
        throw new Error(tokenError?.message || 'Failed to get streaming token');
      }

      // Dynamically import livekit-client to avoid loading it at startup
      const { Room, Track, RoomEvent } = await import('livekit-client');

      const room = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Track listener count
      room.on(RoomEvent.ParticipantConnected, () => {
        setState((prev) => ({ ...prev, listenerCount: room.numParticipants - 1 }));
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setState((prev) => ({ ...prev, listenerCount: room.numParticipants - 1 }));
      });
      room.on(RoomEvent.Disconnected, () => {
        setState((prev) => ({ ...prev, isStreaming: false, isConnecting: false, listenerCount: 0 }));
      });

      // Connect to room
      await room.connect(LIVEKIT_SERVER_URL, tokenData.token);

      // Publish the hardware audio track
      const audioTrack = audioStream.getAudioTracks()[0];
      if (!audioTrack) throw new Error('No audio track available from hardware');

      const publication = await room.localParticipant.publishTrack(audioTrack, {
        name: 'dj-master-output',
        source: Track.Source.Unknown,
        // High quality audio settings
        audioPreset: {
          maxBitrate: 256_000, // 256kbps Opus
        },
        dtx: false, // Disable discontinuous transmission (silence detection) for music
        red: false, // Disable redundant encoding for lower latency
      });

      roomRef.current = room;
      trackRef.current = publication;

      // Store room name in live_sessions for listeners to find
      await supabase
        .from('live_sessions')
        .update({
          current_queue_item_id: null, // Repurpose or use metadata
        })
        .eq('id', liveSessionId);

      setState({
        isStreaming: true,
        isConnecting: false,
        listenerCount: 0,
        roomName,
        error: null,
      });

      return room;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start stream';
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
      return null;
    }
  }, []);

  // ── Stop streaming ───────────────────────────────────────────────────────
  const stopStream = useCallback(async () => {
    if (trackRef.current) {
      try {
        await roomRef.current?.localParticipant?.unpublishTrack(trackRef.current.track);
      } catch {
        // Ignore unpublish errors during cleanup
      }
      trackRef.current = null;
    }

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    setState({
      isStreaming: false,
      isConnecting: false,
      listenerCount: 0,
      roomName: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    startStream,
    stopStream,
  };
}
