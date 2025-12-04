import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Volume2, Monitor, Video, VideoOff, Loader2 } from 'lucide-react';
import { SpeakingBadge } from '@/components/shared/AudioLevelIndicator';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_speaking: boolean;
  is_video_on: boolean;
  is_screen_sharing: boolean;
  stream?: MediaStream;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface RemoteStreamBundle {
  camera: MediaStream | null;
  screen: MediaStream | null;
}

interface ParticipantGridProps {
  participants: Participant[];
  channelType: 'voice' | 'video' | 'stage';
  currentUserId?: string;
  currentUserSpeaking?: boolean;
  localStream?: MediaStream | null;
  remoteStreams?: Map<string, RemoteStreamBundle>;
}

type VideoState = 'loading' | 'ready' | 'no-tracks' | 'error';

const ParticipantGrid = ({
  participants,
  channelType,
  currentUserId,
  currentUserSpeaking,
  localStream,
  remoteStreams
}: ParticipantGridProps) => {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [videoStates, setVideoStates] = useState<Map<string, VideoState>>(new Map());
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mountedRef = useRef(true);

  // Helper to verify video tracks in a stream
  const verifyVideoTracks = useCallback((stream: MediaStream | null, participantId: string): boolean => {
    if (!stream) {
      console.log('[Video] No stream for', participantId);
      return false;
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn('[Video] Stream has no video tracks', { participantId, streamId: stream.id });
      return false;
    }

    const activeTrack = videoTracks.find(t => t.enabled && t.readyState === 'live');
    if (!activeTrack) {
      console.warn('[Video] No active video track', { 
        participantId, 
        tracks: videoTracks.map(t => ({ label: t.label, enabled: t.enabled, readyState: t.readyState }))
      });
      return false;
    }

    console.log('[Video] Valid video track found', { 
      participantId, 
      trackLabel: activeTrack.label,
      settings: activeTrack.getSettings?.()
    });
    return true;
  }, []);

  // Attach stream to video element with verification and retry
  const attachStream = useCallback((videoEl: HTMLVideoElement, stream: MediaStream, participantId: string) => {
    // Clear any existing retry timeout
    const existingTimeout = retryTimeoutsRef.current.get(participantId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      retryTimeoutsRef.current.delete(participantId);
    }

    // Verify tracks first
    if (!verifyVideoTracks(stream, participantId)) {
      if (mountedRef.current) {
        setVideoStates(prev => new Map(prev).set(participantId, 'no-tracks'));
      }
      
      // Set up listener for when tracks are added to the stream
      const handleTrackAdded = (event: MediaStreamTrackEvent) => {
        console.log('[Video] Track added to stream via event:', { 
          participantId, 
          trackKind: event.track.kind,
          trackLabel: event.track.label 
        });
        if (event.track.kind === 'video') {
          // Re-attempt attachment when video track is added
          attachStream(videoEl, stream, participantId);
        }
      };
      
      stream.addEventListener('addtrack', handleTrackAdded);
      
      // Also retry on interval - more aggressive retry for instant video
      let retryCount = 0;
      const maxRetries = 20; // 10 seconds of retries
      const retryInterval = setInterval(() => {
        retryCount++;
        if (verifyVideoTracks(stream, participantId)) {
          clearInterval(retryInterval);
          stream.removeEventListener('addtrack', handleTrackAdded);
          attachStream(videoEl, stream, participantId);
        } else if (retryCount >= maxRetries) {
          clearInterval(retryInterval);
          stream.removeEventListener('addtrack', handleTrackAdded);
          console.warn('[Video] Max retries reached for', participantId);
        }
      }, 500);
      
      // Store cleanup function
      const cleanup = () => {
        clearInterval(retryInterval);
        stream.removeEventListener('addtrack', handleTrackAdded);
      };
      retryTimeoutsRef.current.set(participantId, cleanup as any);
      
      return;
    }

    // Check if already attached to same stream with same tracks
    if (videoEl.srcObject === stream) {
      // Stream is same but check if tracks have changed
      const currentVideoTracks = stream.getVideoTracks();
      if (currentVideoTracks.length > 0 && currentVideoTracks[0].readyState === 'live') {
        // Already attached and working - just update state
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participantId, 'ready'));
        }
        return;
      }
    }

    console.log('[Video] Attaching stream', { participantId, streamId: stream.id });
    if (mountedRef.current) {
      setVideoStates(prev => new Map(prev).set(participantId, 'loading'));
    }

    videoEl.srcObject = stream;

    // Handle metadata loaded
    videoEl.onloadedmetadata = () => {
      console.log('[Video] Metadata loaded', { 
        participantId, 
        width: videoEl.videoWidth, 
        height: videoEl.videoHeight 
      });
    };

    // Handle when video can play
    videoEl.oncanplay = () => {
      console.log('[Video] Can play', { participantId });
    };

    // Play and handle result
    videoEl.play()
      .then(() => {
        console.log('[Video] Playing successfully', { participantId });
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participantId, 'ready'));
        }
      })
      .catch(err => {
        console.error('[Video] Play failed:', { participantId, error: err.message });
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participantId, 'error'));
        }
        
        // Retry on autoplay errors
        if (err.name === 'NotAllowedError') {
          const timeout = setTimeout(() => {
            videoEl.play().catch(() => {});
          }, 500);
          retryTimeoutsRef.current.set(participantId, timeout as any);
        }
      });
  }, [verifyVideoTracks]);

  // Effect to handle stream changes
  useEffect(() => {
    participants.forEach(participant => {
      if (!participant.is_video_on || channelType !== 'video') return;

      const videoEl = videoRefs.current.get(participant.id);
      if (!videoEl) return;

      let streamToAttach: MediaStream | null = null;

      if (participant.user_id === currentUserId) {
        streamToAttach = localStream || null;
      } else if (remoteStreams) {
        const streams = remoteStreams.get(participant.user_id);
        streamToAttach = streams?.camera || null;
      }

      if (streamToAttach) {
        attachStream(videoEl, streamToAttach, participant.id);
      } else {
        // No stream yet, set loading state
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participant.id, 'loading'));
        }
        
        // Log for debugging
        console.log('[Video] Waiting for stream', { 
          participantId: participant.id, 
          userId: participant.user_id,
          isCurrentUser: participant.user_id === currentUserId,
          hasLocalStream: !!localStream,
          remoteStreamKeys: remoteStreams ? Array.from(remoteStreams.keys()) : []
        });
      }
    });
  }, [localStream, remoteStreams, participants, currentUserId, channelType, attachStream]);

  // Cleanup retry timeouts and mark unmounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      retryTimeoutsRef.current.clear();
    };
  }, []);

  // Clean up video states when participants change
  useEffect(() => {
    const currentParticipantIds = new Set(participants.map(p => p.id));
    setVideoStates(prev => {
      const newStates = new Map<string, VideoState>();
      prev.forEach((state, participantId) => {
        if (currentParticipantIds.has(participantId)) {
          newStates.set(participantId, state);
        }
      });
      // Only update if something was actually removed
      if (newStates.size !== prev.size) {
        return newStates;
      }
      return prev;
    });
  }, [participants]);

  // Ref callback - NO STATE UPDATES HERE to prevent infinite loops
  const setVideoRef = useCallback((participantId: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(participantId, el);
    } else {
      videoRefs.current.delete(participantId);
    }
  }, []);

  const getGridCols = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const renderVideoState = (participantId: string, isVideoOn: boolean) => {
    const state = videoStates.get(participantId);
    
    if (!isVideoOn) return null;

    switch (state) {
      case 'loading':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading video...</span>
            </div>
          </div>
        );
      case 'no-tracks':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <VideoOff className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Waiting for video...</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <VideoOff className="w-8 h-8 text-destructive" />
              <span className="text-xs text-destructive">Video error</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`grid ${getGridCols()} gap-4 p-4`}>
      {participants.map((participant) => {
        const isCurrentUser = participant.user_id === currentUserId;
        const isSpeaking = isCurrentUser ? currentUserSpeaking : participant.is_speaking;
        const videoState = videoStates.get(participant.id);
        const showVideo = participant.is_video_on && channelType === 'video';

        return (
          <div
            key={participant.id}
            className={cn(
              "relative aspect-video rounded-2xl bg-card/30 backdrop-blur-sm border border-border/30 flex items-center justify-center transition-all duration-300 ease-in-out",
              isSpeaking && 'ring-2 ring-emerald-400/60 shadow-[0_0_24px_rgba(34,197,94,0.3)]'
            )}
          >
            {/* Video element for video channels */}
            {showVideo ? (
              <div className="relative w-full h-full">
                <video
                  ref={(el) => setVideoRef(participant.id, el)}
                  className={`w-full h-full object-cover rounded-lg ${videoState !== 'ready' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                  autoPlay
                  playsInline
                  muted={isCurrentUser} // Mute own video to prevent echo
                />
                
                {/* Video state overlay */}
                {renderVideoState(participant.id, participant.is_video_on)}
                
                {/* Speaking pulse overlay for video */}
                {isSpeaking && videoState === 'ready' && (
                  <div className="absolute inset-0 rounded-lg ring-4 ring-green-500 ring-inset animate-pulse pointer-events-none" />
                )}
              </div>
            ) : (
              <Avatar className="h-20 w-20">
                <AvatarImage src={participant.user?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {participant.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Speaking indicator - enhanced with audio level visualization */}
            {isSpeaking && (
              <div className="absolute top-2 left-2 z-10">
                <SpeakingBadge isSpeaking={isSpeaking} level={0.7} />
              </div>
            )}

            {/* Video indicator when video is on */}
            {showVideo && videoState === 'ready' && (
              <div className="absolute top-2 right-2 z-10">
                <Video className="w-4 h-4 text-primary" />
              </div>
            )}

            {/* Name and status */}
            <div className="absolute bottom-2 left-2 right-2 bg-card/50 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center justify-between border border-border/20">
              <span className="text-sm font-medium truncate">
                {participant.user?.full_name || 'Unknown User'}
              </span>
              <div className="flex items-center gap-1">
                {participant.is_screen_sharing && (
                  <Monitor className="w-4 h-4 text-primary" />
                )}
                {participant.is_muted ? (
                  <MicOff className="w-4 h-4 text-destructive" />
                ) : (
                  <Mic className="w-4 h-4 text-primary" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParticipantGrid;
