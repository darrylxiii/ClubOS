import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetingTranscription } from './useMeetingTranscription';
import { useLiveHubWebRTC } from './useLiveHubWebRTC';
import { useVirtualBackground } from './useVirtualBackground';
import { toast } from 'sonner';

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_deafened: boolean;
  is_video_on: boolean;
  is_screen_sharing: boolean;
  is_speaking: boolean;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface VoiceChannelOptions {
  pushToTalkEnabled?: boolean;
}

export const useVoiceChannel = (channelId: string, options: VoiceChannelOptions = {}) => {
  const { user } = useAuth();
  const { pushToTalkEnabled = false } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(pushToTalkEnabled); // Start muted if PTT enabled
  const initialPTTRenderRef = useRef(true); // Track initial render for PTT sync
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);

  // We use state for the stream to trigger re-renders and hook updates
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Voice Settings for Virtual Background
  const [voiceSettings, setVoiceSettings] = useState<{
    virtualBackground: { type: 'none' | 'blur' | 'image'; imageUrl?: string; blurRadius?: number }
  }>({ virtualBackground: { type: 'none' } });

  useEffect(() => {
    const loadSettings = () => {
      const stored = localStorage.getItem('livehub_voice_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.virtualBackground) {
          setVoiceSettings({ virtualBackground: parsed.virtualBackground });
        }
      }
    };

    loadSettings();

    const handleSettingsChange = () => loadSettings();
    window.addEventListener('voice-settings-changed', handleSettingsChange);

    return () => {
      window.removeEventListener('voice-settings-changed', handleSettingsChange);
    };
  }, []);

  // Apply Virtual Background
  const processedStream = useVirtualBackground(localStream, {
    enabled: isVideoOn,
    ...voiceSettings.virtualBackground
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const lastSpeakingUpdateRef = useRef<number>(0);
  const SPEAKING_UPDATE_THROTTLE = 500; // ms

  // Use WebRTC for peer connections
  // IMPORTANT: Pass processedStream if available and video is on, otherwise localStream
  // If useVirtualBackground is disabled (type='none'), it returns the input stream (localStream).
  // So we can safely pass processedStream || localStream.
  const streamToSend = processedStream || localStream;

  const { remoteStreams, isConnected: isWebRTCConnected, sendReaction, sendWhiteboardEvent } = useLiveHubWebRTC({
    channelId,
    localStream: streamToSend,
    localScreenStream, // Pass separate screen stream
    enabled: isConnected
  });

  // Use the transcription hook
  const { transcriptions, isTranscribing } = useMeetingTranscription({
    meetingId: channelId,
    participantName: user?.email || 'Unknown',
    localStream,
    enabled: isConnected && !isMuted
  });

  useEffect(() => {
    if (!channelId) return;

    loadParticipants();
    subscribeToParticipants();
  }, [channelId]);

  // Optimized Voice Activity Detection using setInterval (lower CPU than requestAnimationFrame)
  useEffect(() => {
    if (!isConnected || isMuted || isDeafened || !localStream) {
      setIsSpeaking(false);
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }
      return;
    }

    const setupVAD = async () => {
      try {
        // Use low-latency AudioContext for VAD
        const audioContext = new AudioContext({ 
          latencyHint: 'interactive',
          sampleRate: 48000 
        });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(localStream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;                    // Reduced from 512 for lower CPU
        analyzer.smoothingTimeConstant = 0.5;      // Add smoothing for stability

        source.connect(analyzer);

        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        const threshold = 25;  // Slightly lower threshold for better sensitivity

        // Use setInterval instead of requestAnimationFrame for predictable timing
        // 100ms interval = 10 checks/sec (vs 60+ with RAF) - much lower CPU
        vadIntervalRef.current = window.setInterval(() => {
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;

          analyzer.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const speaking = average > threshold;

          setIsSpeaking(prev => {
            if (prev !== speaking) {
              // Throttle database updates for speaking status
              const now = Date.now();
              if (now - lastSpeakingUpdateRef.current > SPEAKING_UPDATE_THROTTLE) {
                lastSpeakingUpdateRef.current = now;
                updateParticipantStatus({ is_speaking: speaking });
              }
            }
            return speaking;
          });
        }, 100);

        console.log('[VAD] Setup complete with optimized settings');
      } catch (error) {
        console.error('[VAD] Error setting up:', error);
      }
    };

    setupVAD();

    return () => {
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isConnected, isMuted, isDeafened, localStream]);

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('live_channel_participants')
      .select('*')
      .eq('channel_id', channelId);

    if (error) {
      console.error('Error loading participants:', error);
      setParticipants([]);
      return;
    }

    if (!data) {
      setParticipants([]);
      return;
    }

    // Fetch user data separately
    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const userMap = new Map(userData?.map(u => [u.id, u]) || []);

    const participantsWithUsers = data.map(p => ({
      ...p,
      user: userMap.get(p.user_id)
    }));

    setParticipants(participantsWithUsers);
  };

  const subscribeToParticipants = () => {
    const channel = supabase
      .channel(`participants:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_participants',
          filter: `channel_id=eq.${channelId}`
        },
        () => loadParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const joinChannel = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // First, leave any other channels the user might be in
      const { error: leaveError } = await supabase
        .from('live_channel_participants')
        .delete()
        .eq('user_id', user.id);

      if (leaveError && !leaveError.message.includes('0 rows')) {
        console.warn('Error leaving previous channels:', leaveError);
      }

      // Get microphone access
      let stream: MediaStream;
      try {
        // Optimized audio constraints for low-latency voice
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,      // Opus native rate for best quality
            channelCount: 1,        // Mono for voice (reduces bandwidth)
            sampleSize: 16          // 16-bit depth
          }
        });
        console.log('[Audio] Microphone acquired with optimized constraints');
      } catch (mediaError) {
        throw new Error('Failed to access microphone. Please check your permissions.');
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Insert new participant record using explicit insert
      const { error: insertError } = await supabase
        .from('live_channel_participants')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          role: 'speaker',
          is_muted: pushToTalkEnabled,
          is_deafened: false,
          is_video_on: false,
          is_screen_sharing: false,
          is_speaking: false
        });

      if (insertError) {
        // Clean up media stream on error
        stream.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);

        console.error('Error joining channel:', insertError);
        throw new Error('Failed to join channel. Please try again.');
      }

      setIsConnected(true);
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }, [user, channelId, pushToTalkEnabled]);

  const leaveChannel = useCallback(async () => {
    if (!user) return;

    try {
      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
        setLocalScreenStream(null);
      }

      // Remove from participants
      await supabase
        .from('live_channel_participants')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      setIsConnected(false);
      setIsMuted(false);
      setIsDeafened(false);
      setIsVideoOn(false);
      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  }, [user, channelId]);

  const updateParticipantStatus = async (updates: Partial<Participant>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('live_channel_participants')
        .update(updates)
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating participant status:', error);
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating participant status:', error);
      toast.error('Failed to update status');
    }
  };

  // CRITICAL: Sync mute state when PTT mode changes mid-session
  useEffect(() => {
    // Skip initial render - useState already handles that
    if (initialPTTRenderRef.current) {
      initialPTTRenderRef.current = false;
      return;
    }

    // Only react if we're connected
    if (!isConnected) return;

    if (pushToTalkEnabled) {
      // PTT just enabled - mute by default (user holds space to talk)
      console.log('[Controls] PTT Enabled mid-session - muting mic');
      setIsMuted(true);
      localStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      updateParticipantStatus({ is_muted: true });
    } else {
      // PTT just disabled - unmute by default (normal mic mode)
      console.log('[Controls] PTT Disabled mid-session - unmuting mic');
      setIsMuted(false);
      localStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      updateParticipantStatus({ is_muted: false });
    }
  }, [pushToTalkEnabled, isConnected]);

  const toggleMute = useCallback(() => {
    console.log('[Controls] toggleMute called', { 
      currentMuted: isMuted, 
      pushToTalkEnabled,
      hasStream: !!localStreamRef.current,
      audioTracks: localStreamRef.current?.getAudioTracks().length 
    });
    
    setIsMuted(prev => {
      const newMuted = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !newMuted;
          console.log('[Controls] Audio track enabled:', !newMuted);
        });
      }
      updateParticipantStatus({ is_muted: newMuted });
      return newMuted;
    });
  }, [isMuted, pushToTalkEnabled]);

  const setPushToTalkActive = useCallback((active: boolean) => {
    if (!pushToTalkEnabled || !localStreamRef.current) {
      console.log('[Controls] setPushToTalkActive ignored', { pushToTalkEnabled, hasStream: !!localStreamRef.current });
      return;
    }

    console.log('[Controls] setPushToTalkActive:', active);
    setIsMuted(!active);
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = active;
      console.log('[Controls] PTT track enabled:', active);
    });
    updateParticipantStatus({ is_muted: !active });
  }, [pushToTalkEnabled]);

  const toggleDeafen = useCallback(() => {
    console.log('[Controls] toggleDeafen called', { 
      currentDeafened: isDeafened, 
      pushToTalkEnabled,
      hasStream: !!localStreamRef.current 
    });
    
    setIsDeafened(prev => {
      const newDeafened = !prev;
      
      if (newDeafened) {
        // Deafening - mute mic
        console.log('[Controls] Deafening - muting mic');
        setIsMuted(true);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
      } else {
        // UN-deafening - restore mic (unless in PTT mode)
        console.log('[Controls] Undeafening - restoring mic state', { pushToTalkEnabled });
        if (!pushToTalkEnabled) {
          setIsMuted(false);
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
              track.enabled = true;
              console.log('[Controls] Audio track re-enabled after undeafen');
            });
          }
        }
        // If PTT is enabled, stay muted until user presses space
      }
      
      updateParticipantStatus({ 
        is_deafened: newDeafened, 
        is_muted: newDeafened || pushToTalkEnabled 
      });
      return newDeafened;
    });
  }, [isDeafened, pushToTalkEnabled]);

  const toggleVideo = useCallback(async () => {
    try {
      if (!isVideoOn) {
        console.log('[Video] Requesting camera access...');
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });

        const newVideoTrack = videoStream.getVideoTracks()[0];
        console.log('[Video] Camera acquired:', { 
          label: newVideoTrack.label, 
          settings: newVideoTrack.getSettings() 
        });

        // Add video track to local stream
        if (localStreamRef.current) {
          // Remove any existing video tracks first
          localStreamRef.current.getVideoTracks().forEach(track => {
            track.stop();
            localStreamRef.current?.removeTrack(track);
          });
          
          // Add new video track
          localStreamRef.current.addTrack(newVideoTrack);
          
          // CRITICAL FIX: Keep ref and state in sync with new MediaStream
          // This triggers re-renders AND ensures WebRTC gets updated
          const updatedStream = new MediaStream(localStreamRef.current.getTracks());
          localStreamRef.current = updatedStream;
          setLocalStream(updatedStream);
          
          console.log('[Video] Stream updated with video track:', {
            streamId: updatedStream.id,
            tracks: updatedStream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled }))
          });
        } else {
          // No existing stream, create new one with video
          localStreamRef.current = videoStream;
          setLocalStream(videoStream);
        }

        setIsVideoOn(true);
        await updateParticipantStatus({ is_video_on: true });
      } else {
        console.log('[Video] Turning off camera...');
        // Stop and remove video tracks
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => {
            console.log('[Video] Stopping track:', track.label);
            track.stop();
            localStreamRef.current?.removeTrack(track);
          });
          
          // CRITICAL FIX: Keep ref and state in sync
          const updatedStream = new MediaStream(localStreamRef.current.getTracks());
          localStreamRef.current = updatedStream;
          setLocalStream(updatedStream);
          
          console.log('[Video] Video track removed, remaining tracks:', {
            streamId: updatedStream.id,
            tracks: updatedStream.getTracks().map(t => ({ kind: t.kind, label: t.label }))
          });
        }

        setIsVideoOn(false);
        await updateParticipantStatus({ is_video_on: false });
      }
    } catch (error) {
      console.error('[Video] Error toggling video:', error);
      toast.error('Failed to access camera');
    }
  }, [isVideoOn]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // Request screen share with optimal settings
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor', // Prefer entire screen
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000
          }
        });

        screenStreamRef.current = screenStream;
        setLocalScreenStream(screenStream); // Set state to trigger WebRTC hook

        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = async () => {
          console.log('Screen share ended by user');
          await stopScreenShare();
        };

        // DO NOT add tracks to localStream. Keep separate.

        setIsScreenSharing(true);
        await updateParticipantStatus({ is_screen_sharing: true });

        console.log('Screen sharing started', {
          videoTrack: screenStream.getVideoTracks()[0]?.label,
          settings: screenStream.getVideoTracks()[0]?.getSettings()
        });
      } else {
        await stopScreenShare();
      }
    } catch (error: any) {
      console.error('Error toggling screen share:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Screen sharing permission denied');
      } else if (error.name === 'NotFoundError') {
        toast.error('No screen available to share');
      } else {
        toast.error('Failed to start screen sharing');
      }
    }
  }, [isScreenSharing]);

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      // Stop all screen share tracks
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      screenStreamRef.current = null;
      setLocalScreenStream(null); // Clear state
    }

    setIsScreenSharing(false);
    await updateParticipantStatus({ is_screen_sharing: false });
    console.log('Screen sharing stopped');
  };

  const startRecording = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('live_channel_recordings')
      .insert({
        channel_id: channelId,
        started_by: user.id,
        started_at: new Date().toISOString(),
        participants: participants.map(p => ({
          user_id: p.user_id,
          name: p.user?.full_name
        }))
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting recording:', error);
      throw error;
    }

    setCurrentRecordingId(data.id);
  }, [user, channelId, participants]);

  const stopRecording = useCallback(async () => {
    if (!currentRecordingId) return;

    // Save transcriptions to recording
    const { error } = await supabase
      .from('live_channel_recordings')
      .update({
        ended_at: new Date().toISOString(),
        transcript: transcriptions.map(t => ({
          id: t.id,
          text: t.text,
          speaker: t.speaker,
          timestamp: t.timestamp.toISOString(),
          isFinal: t.isFinal
        })),
        processing_status: 'processing'
      })
      .eq('id', currentRecordingId);

    if (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }

    setCurrentRecordingId(null);
  }, [currentRecordingId, transcriptions]);

  return {
    isConnected,
    isMuted,
    isDeafened,
    isVideoOn,
    isScreenSharing,
    isSpeaking,
    participants,
    transcriptions,
    isTranscribing,
    localStream: streamToSend, // Return processed stream for UI to display
    screenStream: screenStreamRef.current, // Return ref or state? Ref is fine for UI if it re-renders on isScreenSharing change
    remoteStreams, // Now Map<string, {camera, screen}>
    isWebRTCConnected,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    setPushToTalkActive,
    sendReaction,
    sendWhiteboardEvent
  };
};
