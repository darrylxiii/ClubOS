import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMeetingWebRTC } from '@/hooks/useMeetingWebRTC';
import { useMeetingConnectionQuality } from '@/hooks/useMeetingConnectionQuality';
import { ControlsPanel } from '@/components/video-call/ControlsPanel';
import { VideoGrid } from '@/components/video-call/VideoGrid';
import { PreCallDiagnostics } from '@/components/video-call/PreCallDiagnostics';
import { OnScreenReactions } from '@/components/video-call/OnScreenReactions';
import { MeetingChatSidebar } from '@/components/video-call/MeetingChatSidebar';
import { DeviceSelector } from '@/components/video-call/DeviceSelector';
import { LiveCaptions } from '@/components/video-call/LiveCaptions';
import { MeetingNotes } from '@/components/video-call/MeetingNotes';
import { TranscriptionPanel } from '@/components/video-call/TranscriptionPanel';
import { HostApprovalPanel } from '@/components/meetings/HostApprovalPanel';
import { HostSettingsPanel } from '@/components/meetings/HostSettingsPanel';
import { ParticipantsPanel } from '@/components/meetings/ParticipantsPanel';
import { MeetingDetailsPanel } from '@/components/meetings/MeetingDetailsPanel';
import { InterviewScoringDashboard } from '@/components/meetings/InterviewScoringDashboard';
import { InterviewPrepPanel } from '@/components/meetings/InterviewPrepPanel';
import { InterviewReportView } from '@/components/meetings/InterviewReportView';
import { BreakoutRoomsPanel } from '@/components/meetings/BreakoutRoomsPanel';
import { MeetingPollPanel } from '@/components/meetings/MeetingPollPanel';
import { MeetingQAPanel } from '@/components/meetings/MeetingQAPanel';
import { VirtualBackgroundSelector } from '@/components/meetings/VirtualBackgroundSelector';
import { InterviewerBackchannel } from '@/components/meetings/InterviewerBackchannel';
import { InterviewerVotingPanel } from '@/components/meetings/InterviewerVotingPanel';
import { RecordingIndicator } from '@/components/meetings/RecordingIndicator';
import { MeetingConnectionIndicator } from '@/components/meetings/MeetingConnectionIndicator';
import { PresenterHUD } from '@/components/video-call/PresenterHUD';
import { useMeetingTranscription } from '@/hooks/useMeetingTranscription';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Users, Brain, WifiOff, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MeetingVideoCallInterfaceProps {
  meeting: any;
  participantId: string;
  participantName: string;
  isGuest: boolean;
  onEnd: () => void;
}

export function MeetingVideoCallInterface({
  meeting,
  participantId,
  participantName,
  isGuest,
  onEnd
}: MeetingVideoCallInterfaceProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream; name: string }>>(new Map());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; name: string }>>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showHostSettings, setShowHostSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [showInterviewIntelligence, setShowInterviewIntelligence] = useState(false);
  const [showBreakoutRooms, setShowBreakoutRooms] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showBackchannel, setShowBackchannel] = useState(false);
  const [showVoting, setShowVoting] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('participant');
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [hostSettings, setHostSettings] = useState({
    allowScreenShare: true,
    allowReactions: true,
    allowMicControl: true,
    allowVideoControl: true,
    allowChat: true,
    accessType: 'open' as 'open' | 'trusted' | 'restricted',
    requireHostApproval: false,
    allowAddActivities: true,
    allowThirdPartyAudio: true,
  });

  const {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    participants,
    screenStream,
    networkQuality,
    bandwidth,
    latency,
    error,
    channelStatus,
    peerConnections,
    initializeMedia,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    sendReaction,
    enablePictureInPicture,
    cleanup,
    retryConnection
  } = useMeetingWebRTC({
    meetingId: meeting.id,
    participantId,
    participantName,
    onRemoteStream: async (remoteParticipantId, stream) => {
      console.log('[Meeting] 📹 Remote stream received from:', remoteParticipantId);
      console.log('[Meeting] 📹 Stream details:', {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        totalTracks: stream.getTracks().length
      });
      
      // Fetch participant name from database
      const { data: participant } = await supabase
        .from('meeting_participants')
        .select('user_id, guest_name, session_token')
        .eq('meeting_id', meeting.id)
        .or(`user_id.eq.${remoteParticipantId},session_token.eq.${remoteParticipantId}`)
        .single();
      
      console.log('[Meeting] 👤 Found participant info:', participant);
      
      // Determine display name
      let displayName = `Participant ${remoteParticipantId.slice(0, 6)}`;
      if (participant) {
        if (participant.guest_name) {
          displayName = participant.guest_name;
        } else if (participant.user_id) {
          // Fetch user profile for authenticated users
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', participant.user_id)
            .single();
          
          if (profile) {
            displayName = profile.full_name || profile.email || displayName;
          }
        }
      }
      
      console.log('[Meeting] ✅ Setting display name:', displayName, 'for participant:', remoteParticipantId);
      console.log('[Meeting] 🎥 About to update remoteStreams Map with:', {
        participantId: remoteParticipantId,
        displayName,
        streamId: stream.id,
        hasTracks: stream.getTracks().length > 0
      });
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev).set(remoteParticipantId, {
          stream,
          name: displayName
        });
        console.log('[Meeting] 📊 Updated remoteStreams Map, now has', newMap.size, 'participants');
        return newMap;
      });
    },
    onParticipantLeft: (remoteParticipantId) => {
      console.log('[Meeting] Participant left:', remoteParticipantId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(remoteParticipantId);
        return newMap;
      });
    }
  });

  // Real-time transcription
  const { transcriptions, isTranscribing } = useMeetingTranscription({
    meetingId: meeting.id,
    participantName,
    localStream,
    enabled: transcriptionEnabled && meetingStarted && !showDiagnostics
  });

  // Connection quality monitoring
  const { overallStats, worstQuality } = useMeetingConnectionQuality({
    peerConnections: peerConnections || new Map(),
    meetingId: meeting.id,
    userId: participantId,
    enabled: !showDiagnostics && !!peerConnections
  });

  const handleDiagnosticsComplete = async () => {
    setShowDiagnostics(false);
    
    try {
      console.log('[Meeting] 🎬 Initializing media for meeting:', meeting.title, '| Participant ID:', participantId, '| Is Guest:', isGuest);
      await initializeMedia();
      toast.success('Joined meeting room');
    } catch (error: any) {
      console.error('[Meeting] ❌ Failed to initialize media:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        toast.error('Camera/microphone access denied');
      } else {
        toast.warning('Joined without camera/microphone');
      }
    }
  };

  const handleRetry = () => {
    setPermissionDenied(false);
    setShowDiagnostics(true);
  };

  const handleRetryConnection = async () => {
    try {
      toast.info('Retrying connection...');
      await retryConnection();
      toast.success('Connection retry initiated');
    } catch (error) {
      console.error('[Meeting] Retry failed:', error);
      toast.error('Retry failed. Please refresh the page.');
    }
  };

  const handleEndCall = () => {
    cleanup();
    onEnd();
  };

  const handleToggleScreenShare = async () => {
    if (!hostSettings.allowScreenShare && meeting.host_id !== participantId) {
      toast.error('Screen sharing is disabled by the host');
      return;
    }
    const sharing = await toggleScreenShare();
    setIsScreenSharing(sharing);
    toast(sharing ? 'Screen sharing started' : 'Screen sharing stopped');
  };

  const handleEnablePiP = async () => {
    const success = await enablePictureInPicture();
    if (success) {
      toast.success('Picture-in-Picture enabled');
    } else {
      toast.error('Picture-in-Picture not supported');
    }
  };

  const startRecording = async () => {
    try {
      if (!localStream) {
        toast.error('No media stream available');
        return;
      }

      // Combine local and all remote streams
      const tracks: MediaStreamTrack[] = [...localStream.getTracks()];
      
      remoteStreams.forEach(({ stream }) => {
        tracks.push(...stream.getTracks());
      });

      const combinedStream = new MediaStream(tracks);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        await uploadRecording(blob);
        recordedChunksRef.current = [];
      };

      recorder.start(1000); // Chunk every 1 second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped. Processing...');
    }
  };

  const uploadRecording = async (blob: Blob) => {
    try {
      const fileName = `${meeting.id}-${Date.now()}.webm`;
      const filePath = `${meeting.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filePath, blob, { 
          contentType: 'video/webm',
          upsert: false 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(filePath);

      // Save recording metadata
      const { data: recordingData, error: insertError } = await supabase
        .from('meeting_recordings_extended' as any)
        .insert({
          meeting_id: meeting.id,
          host_id: participantId,
          candidate_id: meeting.candidate_id || null,
          application_id: meeting.application_id || null,
          job_id: meeting.job_id || null,
          recording_url: publicUrl,
          storage_path: filePath,
          file_size_bytes: blob.size,
          duration_seconds: Math.round((Date.now() - (mediaRecorderRef.current as any).startTime) / 1000) || 0,
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Recording uploaded successfully');

      // Trigger AI analysis
      const recordingId = (recordingData as any).id;
      supabase.functions.invoke('analyze-meeting-recording-advanced', {
        body: { recordingId }
      }).then(({ error: analysisError }) => {
        if (analysisError) {
          console.error('AI analysis failed:', analysisError);
          toast.error('AI analysis failed, but recording saved');
        } else {
          toast.success('AI analysis started');
        }
      });

    } catch (error) {
      console.error('Failed to upload recording:', error);
      toast.error('Failed to upload recording');
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const meetingUrl = `${window.location.origin}/meetings/${meeting.meeting_code}`;

  // Update video ref when stream changes
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  // Heartbeat: Update last_seen every 10 seconds to maintain presence
  useEffect(() => {
    if (!meeting?.id || !participantId || showDiagnostics) return;

    const updateHeartbeat = async () => {
      try {
        await supabase
          .from('meeting_participants')
          .update({ last_seen: new Date().toISOString() })
          .eq('meeting_id', meeting.id)
          .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
          .is('left_at', null);
      } catch (error) {
        console.error('[Meeting] ❌ Heartbeat update failed:', error);
      }
    };

    // Initial heartbeat
    updateHeartbeat();

    // Update every 10 seconds
    const heartbeatInterval = setInterval(updateHeartbeat, 10000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [meeting?.id, participantId, showDiagnostics]);

  // Auto-rejoin: If incorrectly marked as "left", auto-fix
  useEffect(() => {
    if (!meeting?.id || !participantId || showDiagnostics) return;

    const checkAndFixPresence = async () => {
      const { data } = await supabase
        .from('meeting_participants')
        .select('left_at, status')
        .eq('meeting_id', meeting.id)
        .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
        .maybeSingle();

      // If we're in the call UI but marked as left, fix it
      if (data && data.left_at !== null) {
        console.warn('[Meeting] ⚠️ Participant incorrectly marked as left - auto-fixing...');
        
        await supabase
          .from('meeting_participants')
          .update({ 
            left_at: null, 
            status: 'accepted',
            last_seen: new Date().toISOString()
          })
          .eq('meeting_id', meeting.id)
          .or(`user_id.eq.${participantId},session_token.eq.${participantId}`);
        
        toast.success('Reconnected to meeting');
      }
    };

    // Check every 15 seconds
    const checkInterval = setInterval(checkAndFixPresence, 15000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [meeting?.id, participantId, showDiagnostics]);

  // Subscribe to reactions
  useEffect(() => {
    if (!meeting?.id) return;

    const channel = supabase
      .channel(`meeting-reactions-${meeting.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `meeting_id=eq.${meeting.id}`
        },
        (payload: any) => {
          const signal = payload.new;
          if (signal.signal_type === 'reaction') {
            const reactionData = signal.signal_data;
            const newReaction = {
              id: signal.id,
              emoji: reactionData.emoji,
              name: reactionData.participantName
            };
            
            setReactions(prev => [...prev, newReaction]);
            
            // Show toast
            toast(`${reactionData.participantName} reacted with ${reactionData.emoji}`, {
              duration: 2000
            });
            
            // Remove after animation
            setTimeout(() => {
              setReactions(prev => prev.filter(r => r.id !== newReaction.id));
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [meeting?.id]);

  // Check for pending join requests (for hosts only)
  useEffect(() => {
    if (!meeting?.id || meeting.host_id !== participantId) return;

    const checkPendingRequests = async () => {
      const { count } = await supabase
        .from('meeting_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', meeting.id)
        .eq('request_status', 'pending');

      console.log('[Meeting] 📋 Pending join requests:', count || 0);
      setPendingRequestsCount(count || 0);
    };

    checkPendingRequests();
    
    // Poll and subscribe to changes
    const pollInterval = setInterval(checkPendingRequests, 2000);
    
    const channel = supabase
      .channel(`pending-requests-check-${meeting.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_join_requests',
          filter: `meeting_id=eq.${meeting.id}`
        },
        () => {
          console.log('[Meeting] 🔔 Join request change detected');
          checkPendingRequests();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [meeting?.id, participantId]);

  // Track total participants including those not yet connected via WebRTC
  useEffect(() => {
    if (!meeting?.id) return;

    const fetchParticipants = async () => {
      // Count all active participants (accepted and present in the meeting, not left)
      const { data, count } = await supabase
        .from('meeting_participants')
        .select('*', { count: 'exact' })
        .eq('meeting_id', meeting.id)
        .eq('status', 'accepted')  // Only count accepted participants
        .is('left_at', null);       // Who haven't left yet

      console.log('[Meeting] 👥 Accepted participants in DB:', count);
      console.log('[Meeting] 📊 Participant details:', data);
      console.log('[Meeting] 🔗 WebRTC connected participants:', participants.length);
      
      // Count connected WebRTC participants + local participant as the active count
      const activeParticipantCount = participants.length + 1; // +1 for local
      console.log('[Meeting] 🎯 Active participants (WebRTC + local):', activeParticipantCount);
      
      setTotalParticipants(activeParticipantCount);
      
      // CRITICAL FIX: Allow meeting to start with 1 participant (solo user)
      // This fixes the "waiting for more participants" deadlock
      if (activeParticipantCount >= 1 && !meetingStarted) {
        console.log('[Meeting] ✅ Starting meeting with', activeParticipantCount, 'participant(s)');
        setMeetingStarted(true);
      }
    };

    fetchParticipants();

    // Subscribe to participant changes
    const channel = supabase
      .channel(`meeting-participants-${meeting.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meeting.id}`
        },
        (payload) => {
          console.log('[Meeting] 🔔 Participant change detected:', payload.eventType, payload.new);
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [meeting?.id, participants, meetingStarted]); // Added participants and meetingStarted to re-count when they change

  // Fetch user's role from meeting_participants table
  useEffect(() => {
    if (!meeting?.id || !participantId) return;

    const fetchUserRole = async () => {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('role')
        .eq('meeting_id', meeting.id)
        .eq('user_id', participantId)
        .maybeSingle();

      if (data?.role) {
        console.log('[Meeting] 👤 User role fetched:', data.role);
        setUserRole(data.role);
      } else if (meeting.host_id === participantId) {
        console.log('[Meeting] 👑 User is host, setting role');
        setUserRole('host');
      }

      if (error) {
        console.error('[Meeting] ❌ Error fetching role:', error);
      }
    };

    fetchUserRole();
  }, [meeting?.id, participantId, meeting?.host_id]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Debug: Log remote streams when they change
  useEffect(() => {
    console.log('[Meeting] 🔍 Remote streams updated, Map size:', remoteStreams.size);
    remoteStreams.forEach((value, key) => {
      console.log('[Meeting] 📊 Remote stream entry:', {
        participantId: key,
        name: value.name,
        streamId: value.stream.id,
        videoTracks: value.stream.getVideoTracks().length,
        audioTracks: value.stream.getAudioTracks().length
      });
    });
  }, [remoteStreams]);

  // Show diagnostics first
  if (showDiagnostics) {
    return (
      <PreCallDiagnostics
        onComplete={handleDiagnosticsComplete}
        onCancel={onEnd}
      />
    );
  }

  // Permission denied screen
  if (permissionDenied) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="max-w-md w-full p-8 text-center space-y-6 glass-card mx-4">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <Video className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Camera/Microphone Access Required</h3>
            <p className="text-muted-foreground mb-4">
              Please enable camera and microphone permissions in your browser.
            </p>
            <div className="text-sm text-muted-foreground space-y-2 text-left bg-muted/50 rounded-lg p-4">
              <p className="font-semibold">How to enable:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the camera icon in your browser's address bar</li>
                <li>Select "Allow" for camera and microphone</li>
                <li>Click "Try Again" below</li>
              </ol>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleEndCall} variant="outline" className="flex-1">
              Leave Meeting
            </Button>
            <Button onClick={handleRetry} className="flex-1">
              Try Again
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Main call interface with ultra-premium background
  const allParticipants = [
    // Local participant with their camera OR screen share
    {
      id: 'local',
      display_name: participantName + (isGuest ? ' (Guest)' : '') + (isScreenSharing ? ' (Screen)' : ''),
      role: (meeting.host_id === participantId ? 'host' : 'participant') as 'host' | 'participant',
      is_muted: !isAudioEnabled,
      is_video_off: !isVideoEnabled && !isScreenSharing, // If screen sharing, video is "on"
      is_screen_sharing: isScreenSharing,
      is_hand_raised: isHandRaised,
      is_speaking: false,
      stream: (isScreenSharing && screenStream) ? screenStream : (localStream || undefined)
    },
    // Remote participants
    ...Array.from(remoteStreams.entries()).map(([id, { stream, name }]) => {
      console.log('[Meeting] 🎭 Mapping remote participant:', {
        id,
        name,
        streamId: stream.id,
        hasStream: !!stream,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      return {
        id,
        display_name: name,
        role: 'participant' as 'host' | 'participant',
        is_muted: false,
        is_video_off: false,
        is_screen_sharing: false,
        is_hand_raised: false,
        is_speaking: false,
        stream
      };
    })
  ];

  // Log the constructed allParticipants array
  console.log('[Meeting] 🎬 All participants constructed:', {
    total: allParticipants.length,
    local: allParticipants[0]?.display_name,
    remoteCount: allParticipants.length - 1,
    participants: allParticipants.map(p => ({
      id: p.id,
      name: p.display_name,
      hasStream: !!p.stream,
      streamId: p.stream?.id
    }))
  });

  const content = (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden"
      style={{
        width: '100vw',
        height: '100vh'
      }}
    >
      {/* Waiting for others banner - elegant notification */}
      {totalParticipants === 1 && meetingStarted && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3 px-8 py-4 bg-black/60 backdrop-blur-2xl rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <Users className="h-5 w-5 text-white/80" />
            <span className="text-base font-medium text-white/90 tracking-wide">
              Waiting for others to join...
            </span>
          </div>
        </div>
      )}

      {/* Error Recovery Banner - compact top notification */}
      {error && !error.recoverable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-md">
          <div className="backdrop-blur-2xl bg-yellow-500/20 border border-yellow-500/30 px-4 py-3 rounded-lg shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-yellow-500">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{error.message}</p>
                <p className="text-xs text-gray-300">Please grant permissions and try again</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recoverable Error Modal - full troubleshooting UI */}
      {error && error.recoverable && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                <WifiOff className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">Connection Issue</h3>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button onClick={handleRetryConnection} className="w-full" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-2 text-foreground">Troubleshooting tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your internet connection</li>
                <li>Disable VPN if active</li>
                <li>Allow camera/microphone access</li>
                <li>Try a different browser (Chrome works best)</li>
                <li>Refresh the page if issue persists</li>
              </ul>
            </div>
          </Card>
        </div>
      )}
      
      
      {/* Meeting Info Header - Simplified */}
      <div className="absolute top-6 left-6 z-50 animate-in slide-in-from-left duration-500">
        <div className="backdrop-blur-2xl bg-black/50 border border-white/10 px-6 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-2">
          <h3 className="font-semibold text-white text-base tracking-wide">{meeting.title}</h3>
          <p className="text-xs text-white/60 font-mono">{meeting.meeting_code}</p>
        </div>
      </div>

      {/* Participant Count - Compact */}
      <div className="absolute top-6 right-6 z-50 animate-in slide-in-from-right duration-500">
        <div className="backdrop-blur-2xl bg-black/50 border border-white/10 px-4 py-2 rounded-full text-sm text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center gap-2">
          <Users className="h-4 w-4 text-white/80" />
          <span className="font-medium">{allParticipants.length}</span>
        </div>
      </div>

      {/* Video Grid - Fullscreen */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/50 via-transparent to-black/50 pointer-events-none" />
        <VideoGrid
          participants={allParticipants.slice(1)} // All participants except local camera
          localParticipant={allParticipants[0]} // Local camera participant
          focusedParticipantId={isScreenSharing ? 'local-screen' : undefined}
          layout={isScreenSharing ? 'spotlight' : 'grid'}
          presenterId={isScreenSharing ? participantId : undefined}
        />
      </div>
      
      {/* Waiting Room Overlay - Premium design */}
      {!meetingStarted && totalParticipants <= 1 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-950/95 via-gray-900/90 to-black/95 backdrop-blur-xl z-[1000] animate-in fade-in duration-500">
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 max-w-md mx-4">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mx-auto shadow-2xl">
                <Video className="h-16 w-16 text-primary" />
              </div>
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-50 animate-pulse" />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {pendingRequestsCount > 0 ? 'Guest Approval Required' : 'Waiting for others to join'}
              </h3>
              <p className="text-lg text-white/70 leading-relaxed">
                {pendingRequestsCount > 0 ? (
                  <>
                    {pendingRequestsCount} guest{pendingRequestsCount > 1 ? 's' : ''} waiting for your approval
                  </>
                ) : (
                  <>
                    Share the meeting code: <span className="font-mono text-primary font-bold text-xl">{meeting.meeting_code}</span>
                  </>
                )}
              </p>
              {pendingRequestsCount > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-400">
                    ⚠️ Check the approval panel on the right to admit guests →
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Total participants: {totalParticipants} | Connected: {allParticipants.length}
                {pendingRequestsCount > 0 && ` | Pending: ${pendingRequestsCount}`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Your camera is ready</span>
              </div>
            </div>

            {meeting.host_id === participantId && totalParticipants === 1 && pendingRequestsCount === 0 && (
              <Button
                onClick={() => {
                  setMeetingStarted(true);
                  toast.success('Meeting started');
                }}
                className="mt-4"
              >
                Start Meeting Anyway
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Connecting Overlay - Only show when WebRTC is actively connecting AFTER participants are accepted */}
      {meetingStarted && totalParticipants >= 2 && remoteStreams.size === 0 && connectionState === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-sm z-[999]">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Connecting video...</h3>
              <p className="text-muted-foreground text-sm">
                {totalParticipants} participants in call | Establishing video connection
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Presenter HUD - Only show when screen sharing */}
      {screenStream && (
        <PresenterHUD
          participantName={participantName}
          onStopSharing={handleToggleScreenShare}
          participantCount={allParticipants.length}
          stream={screenStream}
        />
      )}

      {/* On-Screen Reactions */}
      <OnScreenReactions reactions={reactions.map(r => ({ 
        id: r.id, 
        reaction_type: r.emoji,
        participant_name: r.name 
      }))} />

      {/* Controls Panel */}
      <ControlsPanel
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={!!screenStream}
        isRecording={isRecording}
        isHandRaised={isHandRaised}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRecording={handleToggleRecording}
        onToggleHandRaise={() => setIsHandRaised(!isHandRaised)}
        onEndCall={handleEndCall}
        onOpenChat={() => setShowChat(true)}
        onOpenParticipants={() => setShowParticipants(true)}
        onOpenSettings={() => setShowSettings(true)}
        onReaction={(emoji) => {
          if (!hostSettings.allowReactions && meeting.host_id !== participantId) {
            toast.error('Reactions are disabled by the host');
            return;
          }
          sendReaction(emoji);
        }}
        onOpenNotes={() => setShowNotes(true)}
        onToggleCaptions={() => setCaptionsEnabled(!captionsEnabled)}
        captionsEnabled={captionsEnabled}
        onOpenTranscription={() => setShowTranscription(true)}
        transcriptionEnabled={transcriptionEnabled}
        isTranscribing={isTranscribing}
        onOpenHostSettings={meeting.host_id === participantId ? () => setShowHostSettings(true) : undefined}
        onOpenMeetingInfo={() => setShowMeetingDetails(true)}
        onEnablePiP={handleEnablePiP}
        onOpenInterviewIntelligence={
          ['host', 'interviewer', 'observer'].includes(userRole) 
            ? () => setShowInterviewIntelligence(true) 
            : undefined
        }
        onOpenBreakoutRooms={() => setShowBreakoutRooms(true)}
        onOpenPolls={() => setShowPolls(true)}
        onOpenQA={() => setShowQA(true)}
        onOpenBackgrounds={() => setShowBackgrounds(true)}
        onToggleBackchannel={
          ['host', 'interviewer', 'observer'].includes(userRole)
            ? () => setShowBackchannel(!showBackchannel)
            : undefined
        }
        onToggleVoting={
          ['host', 'interviewer', 'observer'].includes(userRole)
            ? () => setShowVoting(!showVoting)
            : undefined
        }
      />

      {/* Live Captions with Real Transcriptions */}
      {captionsEnabled && transcriptions.length > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 max-w-3xl w-full px-4 z-40">
          <div className="bg-black/80 backdrop-blur-xl rounded-lg px-6 py-4 border border-white/10">
            <div className="text-white text-lg leading-relaxed space-y-2">
              {transcriptions.slice(-3).map((t) => (
                <div key={t.id}>
                  <span className="text-blue-400 font-medium">{t.speaker}:</span>{' '}
                  <span className={t.isFinal ? '' : 'text-white/60 italic'}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Host Approval Panel */}
      <HostApprovalPanel 
        meetingId={meeting.id} 
        isHost={meeting.host_id === participantId}
      />

      {/* Chat Sidebar */}
      <Sheet open={showChat} onOpenChange={setShowChat}>
        <SheetContent side="right" className="w-96 p-0 z-[10200]">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Meeting Chat</SheetTitle>
          </SheetHeader>
          <MeetingChatSidebar 
            meetingId={meeting.id} 
            participantId={participantId}
            participantName={participantName}
          />
        </SheetContent>
      </Sheet>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl z-[10200]">
          <DialogHeader>
            <DialogTitle>Meeting Settings</DialogTitle>
          </DialogHeader>
          <DeviceSelector />
        </DialogContent>
      </Dialog>

      {/* Notes Panel */}
      <Sheet open={showNotes} onOpenChange={setShowNotes}>
        <SheetContent side="right" className="w-[600px] p-0 z-[10200]">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Meeting Notes</SheetTitle>
          </SheetHeader>
          <MeetingNotes meetingId={meeting.id} meetingTitle={meeting.title} />
        </SheetContent>
      </Sheet>

      {/* Transcription Panel with Live Data */}
      <Sheet open={showTranscription} onOpenChange={setShowTranscription}>
        <SheetContent side="right" className="w-[500px] z-[10200]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Live Transcription
              {isTranscribing && (
                <Badge variant="default" className="animate-pulse">Recording</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            {transcriptions.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p className="font-medium">No transcriptions yet</p>
                <p className="text-sm mt-2">
                  {isTranscribing ? 'Listening...' : 'Transcription will appear here when enabled'}
                </p>
                {!transcriptionEnabled && (
                  <Button
                    onClick={() => setTranscriptionEnabled(true)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Enable Transcription
                  </Button>
                )}
              </div>
            ) : (
              transcriptions.map((t) => (
                <div key={t.id} className="border-b pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-primary">{t.speaker}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className={`text-sm ${t.isFinal ? '' : 'text-muted-foreground italic'}`}>
                    {t.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Host Settings Panel */}
      {meeting.host_id === participantId && (
        <HostSettingsPanel
          open={showHostSettings}
          onOpenChange={setShowHostSettings}
          meetingId={meeting.id}
          settings={hostSettings}
        />
      )}

      {/* Participants Panel */}
      <ParticipantsPanel
        open={showParticipants}
        onOpenChange={setShowParticipants}
        participants={allParticipants}
        isHost={meeting.host_id === participantId}
      />

      {/* Meeting Details Panel */}
      <MeetingDetailsPanel
        open={showMeetingDetails}
        onOpenChange={setShowMeetingDetails}
        meetingCode={meeting.meeting_code}
        meetingUrl={meetingUrl}
      />

      {/* Interview Intelligence Panel - Only for interviewers */}
      {['host', 'interviewer', 'observer'].includes(userRole) && (
        <Sheet open={showInterviewIntelligence} onOpenChange={setShowInterviewIntelligence}>
          <SheetContent side="right" className="w-[500px] p-0 z-[10200]">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Club AI Interview Intelligence
              </SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <Tabs defaultValue="live" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="prep">Prep</TabsTrigger>
                  <TabsTrigger value="live">Live Scoring</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>
                <TabsContent value="prep" className="mt-4">
                  <InterviewPrepPanel
                    meetingId={meeting.id}
                    candidateId={meeting.candidate_id}
                    roleTitle={meeting.role_title}
                    companyName={meeting.company_name}
                    userRole={userRole}
                  />
                </TabsContent>
                <TabsContent value="live" className="mt-4">
                  <InterviewScoringDashboard
                    meetingId={meeting.id}
                    userRole={userRole}
                  />
                </TabsContent>
                <TabsContent value="report" className="mt-4">
                  <InterviewReportView
                    meetingId={meeting.id}
                    candidateId={meeting.candidate_id}
                    roleTitle={meeting.role_title}
                    companyName={meeting.company_name}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Breakout Rooms Panel */}
      <BreakoutRoomsPanel
        meetingId={meeting.id}
        isHost={meeting.host_id === participantId}
        open={showBreakoutRooms}
        onOpenChange={setShowBreakoutRooms}
      />

      {/* Polls Panel */}
      <MeetingPollPanel
        meetingId={meeting.id}
        isHost={meeting.host_id === participantId}
        open={showPolls}
        onOpenChange={setShowPolls}
      />

      {/* Q&A Panel */}
      <MeetingQAPanel
        meetingId={meeting.id}
        isHost={meeting.host_id === participantId}
        open={showQA}
        onOpenChange={setShowQA}
      />

      {/* Virtual Backgrounds */}
      <VirtualBackgroundSelector
        open={showBackgrounds}
        onOpenChange={setShowBackgrounds}
        onBackgroundSelect={(bg) => {
          // Background selection logic here
          console.log('Background selected:', bg);
        }}
      />

      {/* Interviewer Backchannel - Only for interviewers */}
      {showBackchannel && ['host', 'interviewer', 'observer'].includes(userRole) && (
        <div className="absolute left-4 top-20 bottom-20 w-96 z-[10000]">
          <InterviewerBackchannel
            meetingId={meeting.id}
            currentUserId={participantId}
          />
        </div>
      )}

      {/* Interviewer Voting Panel - Only for interviewers */}
      {showVoting && ['host', 'interviewer', 'observer'].includes(userRole) && (
        <div className="absolute right-4 top-20 w-80 z-[10000] bg-card/95 backdrop-blur-lg rounded-lg border border-border p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Cast Your Vote</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoting(false)}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
          <InterviewerVotingPanel
            meetingId={meeting.id}
            currentUserId={participantId}
            candidateId={meeting.candidate_id}
          />
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
