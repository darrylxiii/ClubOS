import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetingTranscription } from './useMeetingTranscription';
import { useLiveHubWebRTC } from './useLiveHubWebRTC';
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
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const lastSpeakingUpdateRef = useRef<number>(0);
  const SPEAKING_UPDATE_THROTTLE = 500; // ms

  // Use WebRTC for peer connections
  const { remoteStreams, isConnected: isWebRTCConnected } = useLiveHubWebRTC({
    channelId,
    localStream: localStreamRef.current,
    enabled: isConnected
  });

  // Use the transcription hook
  const { transcriptions, isTranscribing } = useMeetingTranscription({
    meetingId: channelId,
    participantName: user?.email || 'Unknown',
    localStream: localStreamRef.current,
    enabled: isConnected && !isMuted
  });

  useEffect(() => {
    if (!channelId) return;
    
    loadParticipants();
    subscribeToParticipants();
  }, [channelId]);

  // Voice activity detection
  useEffect(() => {
    if (!isConnected || isMuted || isDeafened || !localStreamRef.current) {
      setIsSpeaking(false);
      return;
    }

    const setupVAD = async () => {
      try {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(localStreamRef.current!);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 512;
        
        source.connect(analyzer);
        
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        const threshold = 30; // Adjust based on testing
        
        const checkAudio = () => {
          if (!isConnected) return;
          
          analyzer.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          
          const speaking = average > threshold;
          setIsSpeaking(speaking);
          
          // Throttle database updates for speaking status
          const now = Date.now();
          if (speaking !== isSpeaking && now - lastSpeakingUpdateRef.current > SPEAKING_UPDATE_THROTTLE) {
            lastSpeakingUpdateRef.current = now;
            updateParticipantStatus({ is_speaking: speaking });
          }
          
          requestAnimationFrame(checkAudio);
        };
        
        checkAudio();
      } catch (error) {
        console.error('Error setting up VAD:', error);
      }
    };

    setupVAD();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isConnected, isMuted, isDeafened]);

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
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (mediaError) {
        throw new Error('Failed to access microphone. Please check your permissions.');
      }
      
      localStreamRef.current = stream;

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

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !newMuted;
        });
      }
      updateParticipantStatus({ is_muted: newMuted });
      return newMuted;
    });
  }, []);

  const setPushToTalkActive = useCallback((active: boolean) => {
    if (!pushToTalkEnabled || !localStreamRef.current) return;
    
    setIsMuted(!active);
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = active;
    });
    updateParticipantStatus({ is_muted: !active });
  }, [pushToTalkEnabled]);

  const toggleDeafen = useCallback(() => {
    setIsDeafened(prev => {
      const newDeafened = !prev;
      if (newDeafened) {
        setIsMuted(true);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
      }
      updateParticipantStatus({ is_deafened: newDeafened, is_muted: newDeafened });
      return newDeafened;
    });
  }, []);

  const toggleVideo = useCallback(async () => {
    try {
      if (!isVideoOn) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (localStreamRef.current) {
          videoStream.getVideoTracks().forEach(track => {
            localStreamRef.current?.addTrack(track);
          });
        }
        setIsVideoOn(true);
      } else {
        localStreamRef.current?.getVideoTracks().forEach(track => {
          track.stop();
          localStreamRef.current?.removeTrack(track);
        });
        setIsVideoOn(false);
      }
      updateParticipantStatus({ is_video_on: !isVideoOn });
    } catch (error) {
      console.error('Error toggling video:', error);
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
        
        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = async () => {
          console.log('Screen share ended by user');
          await stopScreenShare();
        };
        
        // Add screen share track to existing peer connections
        if (localStreamRef.current) {
          screenStream.getTracks().forEach(track => {
            localStreamRef.current?.addTrack(track);
          });
        }
        
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
        localStreamRef.current?.removeTrack(track);
      });
      screenStreamRef.current = null;
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
    localStream: localStreamRef.current,
    screenStream: screenStreamRef.current,
    remoteStreams,
    isWebRTCConnected,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    setPushToTalkActive
  };
};
