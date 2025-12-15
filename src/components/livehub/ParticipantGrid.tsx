import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Volume2, Monitor, Video, VideoOff, Loader2, User } from 'lucide-react';
import { SpeakingBadge } from '@/components/shared/AudioLevelIndicator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [videoStates, setVideoStates] = useState<Map<string, VideoState>>(new Map());
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mountedRef = useRef(true);
  const retryIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Ensure current user is ALWAYS in the participants list - fix for missing self-view
  const allParticipants = useMemo(() => {
    if (!currentUserId) return participants;
    
    const hasCurrentUser = participants.some(p => p.user_id === currentUserId);
    
    if (hasCurrentUser) {
      return participants;
    }
    
    // Current user not found in participants list - add synthetic entry
    // This fixes the bug where user doesn't see their own card
    console.log('[ParticipantGrid] Adding synthetic local participant - user not in DB list yet');
    
    const localParticipant: Participant = {
      id: `local-${currentUserId}`,
      user_id: currentUserId,
      is_muted: false,
      is_speaking: currentUserSpeaking || false,
      is_video_on: channelType === 'video' && !!localStream?.getVideoTracks().length,
      is_screen_sharing: false,
      user: {
        full_name: user?.user_metadata?.full_name || user?.email || 'You',
        avatar_url: user?.user_metadata?.avatar_url || null
      }
    };
    
    return [localParticipant, ...participants];
  }, [participants, currentUserId, currentUserSpeaking, channelType, localStream, user]);

  // Attach stream to video element immediately - don't wait for track verification
  const attachStreamImmediately = useCallback((videoEl: HTMLVideoElement, stream: MediaStream, participantId: string) => {
    // Clear any existing retry
    const existingRetry = retryIntervalsRef.current.get(participantId);
    if (existingRetry) {
      clearInterval(existingRetry);
      retryIntervalsRef.current.delete(participantId);
    }

    console.log('[Video] Attaching stream immediately', { 
      participantId, 
      streamId: stream.id,
      videoTracks: stream.getVideoTracks().length,
      trackStates: stream.getVideoTracks().map(t => ({
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      }))
    });

    // Set loading state
    if (mountedRef.current) {
      setVideoStates(prev => new Map(prev).set(participantId, 'loading'));
    }

    // Attach stream immediately
    videoEl.srcObject = stream;
    
    // Force enable all video tracks
    stream.getVideoTracks().forEach(track => {
      if (!track.enabled) {
        console.log('[Video] Force-enabling video track:', track.label);
        track.enabled = true;
      }
    });

    // Handle when video can play
    const handleCanPlay = () => {
      console.log('[Video] Can play', { participantId });
      if (mountedRef.current) {
        setVideoStates(prev => new Map(prev).set(participantId, 'ready'));
      }
    };

    const handleLoadedData = () => {
      console.log('[Video] Loaded data', { participantId });
      if (mountedRef.current) {
        setVideoStates(prev => new Map(prev).set(participantId, 'ready'));
      }
    };

    const handleLoadedMetadata = () => {
      console.log('[Video] Metadata loaded', { 
        participantId, 
        width: videoEl.videoWidth, 
        height: videoEl.videoHeight 
      });
    };

    videoEl.onloadedmetadata = handleLoadedMetadata;
    videoEl.oncanplay = handleCanPlay;
    videoEl.onloadeddata = handleLoadedData;

    // Listen for track unmute (important for WebRTC tracks that start muted)
    stream.getVideoTracks().forEach(track => {
      track.onunmute = () => {
        console.log('[Video] Track unmuted:', { participantId, trackLabel: track.label });
        videoEl.play().catch(() => {});
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participantId, 'ready'));
        }
      };
    });

    // Use requestVideoFrameCallback if available for frame-level detection
    if ('requestVideoFrameCallback' in videoEl) {
      (videoEl as any).requestVideoFrameCallback(() => {
        console.log('[Video] First frame received:', { participantId });
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participantId, 'ready'));
        }
      });
    }

    // Aggressive play attempt with multiple retries
    const attemptPlay = async () => {
      try {
        await videoEl.play();
        console.log('[Video] Playing successfully', { participantId });
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participantId, 'ready'));
        }
        return true;
      } catch (err: any) {
        console.warn('[Video] Play failed:', { participantId, error: err.message });
        return false;
      }
    };

    // Try immediately
    attemptPlay().then(success => {
      if (!success) {
        // Set up retry interval
        let retryCount = 0;
        const maxRetries = 20;
        
        const interval = setInterval(async () => {
          retryCount++;
          
          // Check if we have video tracks now
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length === 0) {
            console.log('[Video] Still waiting for video tracks...', { participantId, retryCount });
            if (retryCount >= maxRetries) {
              clearInterval(interval);
              retryIntervalsRef.current.delete(participantId);
              if (mountedRef.current) {
                setVideoStates(prev => new Map(prev).set(participantId, 'no-tracks'));
              }
            }
            return;
          }

          // Force enable tracks
          videoTracks.forEach(t => { t.enabled = true; });

          const playSuccess = await attemptPlay();
          if (playSuccess) {
            clearInterval(interval);
            retryIntervalsRef.current.delete(participantId);
          } else if (retryCount >= maxRetries) {
            clearInterval(interval);
            retryIntervalsRef.current.delete(participantId);
            if (mountedRef.current) {
              setVideoStates(prev => new Map(prev).set(participantId, 'error'));
            }
          }
        }, 300); // More aggressive retry - every 300ms

        retryIntervalsRef.current.set(participantId, interval);
      }
    });

    // Listen for new tracks being added to the stream
    const handleTrackAdded = (event: MediaStreamTrackEvent) => {
      console.log('[Video] Track added to stream:', { 
        participantId, 
        trackKind: event.track.kind,
        trackLabel: event.track.label 
      });
      if (event.track.kind === 'video') {
        event.track.enabled = true;
        videoEl.play().catch(() => {});
      }
    };
    
    stream.addEventListener('addtrack', handleTrackAdded);

    // Return cleanup
    return () => {
      stream.removeEventListener('addtrack', handleTrackAdded);
      videoEl.onloadedmetadata = null;
      videoEl.oncanplay = null;
      videoEl.onloadeddata = null;
    };
  }, []);

  // Effect to handle stream changes
  useEffect(() => {
    const cleanupFns: (() => void)[] = [];

    allParticipants.forEach(participant => {
      // For video channels, check if participant wants video on
      const showVideo = participant.is_video_on && channelType === 'video';
      if (!showVideo) return;

      const videoEl = videoRefs.current.get(participant.id);
      if (!videoEl) return;

      let streamToAttach: MediaStream | null = null;

      if (participant.user_id === currentUserId) {
        // For current user, use localStream directly
        streamToAttach = localStream || null;
      } else if (remoteStreams) {
        const streams = remoteStreams.get(participant.user_id);
        streamToAttach = streams?.camera || null;
      }

      if (streamToAttach) {
        const cleanup = attachStreamImmediately(videoEl, streamToAttach, participant.id);
        if (cleanup) cleanupFns.push(cleanup);
      } else {
        // No stream yet, set loading state
        if (mountedRef.current) {
          setVideoStates(prev => new Map(prev).set(participant.id, 'loading'));
        }
        
        console.log('[Video] Waiting for stream', { 
          participantId: participant.id, 
          userId: participant.user_id,
          isCurrentUser: participant.user_id === currentUserId,
          hasLocalStream: !!localStream,
          remoteStreamKeys: remoteStreams ? Array.from(remoteStreams.keys()) : []
        });
      }
    });

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, [localStream, remoteStreams, allParticipants, currentUserId, channelType, attachStreamImmediately]);

  // Handle visibility change - retry video play on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Video] Tab visible - retrying video playback');
        videoRefs.current.forEach((videoEl, participantId) => {
          const state = videoStates.get(participantId);
          if (state === 'error' || state === 'loading') {
            videoEl.play().catch(() => {});
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [videoStates]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      retryTimeoutsRef.current.clear();
      retryIntervalsRef.current.forEach(interval => clearInterval(interval));
      retryIntervalsRef.current.clear();
    };
  }, []);

  // Clean up video states when participants change
  useEffect(() => {
    const currentParticipantIds = new Set(allParticipants.map(p => p.id));
    setVideoStates(prev => {
      const newStates = new Map<string, VideoState>();
      prev.forEach((state, participantId) => {
        if (currentParticipantIds.has(participantId)) {
          newStates.set(participantId, state);
        }
      });
      if (newStates.size !== prev.size) {
        return newStates;
      }
      return prev;
    });
  }, [allParticipants]);

  // Ref callback
  const setVideoRef = useCallback((participantId: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(participantId, el);
    } else {
      videoRefs.current.delete(participantId);
    }
  }, []);

  const getGridCols = () => {
    const count = allParticipants.length;
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
      {allParticipants.map((participant) => {
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
                {isCurrentUser && ' (You)'}
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
