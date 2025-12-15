import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceChannel } from '@/hooks/useVoiceChannel';
import { usePushToTalk } from '@/hooks/usePushToTalk';
import { useRecordingWithEffects } from '@/hooks/useRecordingWithEffects';
import { useLiveHubAutoRecording } from '@/hooks/useLiveHubAutoRecording';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff,
  Monitor, Volume2, VolumeX, Smile, PenTool, Circle, Square
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ParticipantGrid from './ParticipantGrid';
import VoiceActivityIndicator from './VoiceActivityIndicator';
import ScreenShareSpotlight from './ScreenShareSpotlight';
import { RemoteAudioPlayer } from './RemoteAudioPlayer';
import { LiveReactions } from './LiveReactions';
import { Whiteboard } from './Whiteboard';
import { RecordingSettingsDialog, RecordingSettings } from './RecordingSettingsDialog';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { AudioUnlockBanner } from './AudioUnlockBanner';
import { toast } from 'sonner';

interface VoiceChannelProps {
  channelId: string;
  channelType: 'voice' | 'video' | 'stage';
  autoJoin?: boolean;
}

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  auto_record: boolean;
  auto_transcribe: boolean;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🔥'];

const VoiceChannel = ({ channelId, channelType, autoJoin = false }: VoiceChannelProps) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pushToTalkEnabled, setPushToTalkEnabled] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);

  // Use the voice channel hook directly
  const voice = useVoiceChannel(channelId, { pushToTalkEnabled });

  // Destructure from the hook
  const {
    isConnected,
    isMuted,
    isDeafened,
    isVideoOn,
    isScreenSharing,
    isSpeaking,
    participants,
    localStream,
    screenStream,
    remoteStreams,
    isWebRTCConnected,
    connectionQuality,
    connectionStats,
    audioConfig,
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
    sendWhiteboardEvent,
    forceReconnect
  } = voice;

  const { isPushing } = usePushToTalk({
    enabled: pushToTalkEnabled && isConnected,
    hotkey: 'Space',
    onPushStart: () => setPushToTalkActive?.(true),
    onPushEnd: () => setPushToTalkActive?.(false),
  });

  // Recording with virtual backgrounds
  const recording = useRecordingWithEffects({
    videoStream: localStream,
    audioStream: localStream,
    enabled: isConnected
  });

  // Auto-recording for Live Hub (integrates with meeting_recordings_extended)
  const autoRecording = useLiveHubAutoRecording({
    channelId,
    channelName: channel?.name || 'Live Hub',
    localStream,
    remoteStreams,
    autoRecord: channel?.auto_record ?? true,
    enabled: isConnected
  });

  const handleStartRecording = (settings: RecordingSettings) => {
    recording.startRecording({
      quality: settings.quality,
      format: settings.format,
      audioBitrate: settings.audioBitrate
    });
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    recording.stopRecording();
    setIsRecording(false);

    // Download after 1 second to allow blob creation
    setTimeout(() => {
      if (recording.recordedBlob) {
        recording.downloadRecording(`call-${channelId}-${new Date().toISOString()}.webm`);
      }
    }, 1000);
  };

  useEffect(() => {
    loadChannel();
  }, [channelId]);

  // Context now handles connection persistence, so we don't auto-join here unless explicitly requested
  // And we DO NOT leave on unmount, because we want to persist!
  useEffect(() => {
    // If this is the active view and we are not connected, we might want to join?
    // Actually, LiveHubLayout handles the verification of "clicking the channel joins it".
    // Here we just render the state.
  }, [channelId]);

  const loadChannel = async () => {
    const { data, error } = await supabase
      .from('live_channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (error) {
      console.error('Error loading channel:', error);
      return;
    }

    setChannel(data);
  };

  const handleJoinChannel = async () => {
    setIsJoining(true);
    try {
      await joinChannel();

      // Note: Auto-record now requires user to configure settings via dialog
      // if (channel?.auto_record) {
      //   setShowRecordingSettings(true);
      // }

      toast.success('Connected to voice channel');
    } catch (error: any) {
      console.error('Error joining channel:', error);
      const errorMessage = error?.message || 'Failed to connect to voice channel';
      toast.error(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveChannel = async () => {
    try {
      if (isRecording) {
        await handleStopRecording();
      }
      // Stop auto-recording and upload
      if (autoRecording.isRecording) {
        await autoRecording.stopRecording();
      }
      await leaveChannel();
      toast.success('Disconnected from voice channel');
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };



  if (!channel) return null;

  // Determine active screen share (local or remote)
  // We prioritize local screen share, then first remote screen share found
  let activeScreenShare: { userId: string; stream: MediaStream; userName?: string; avatarUrl?: string | null } | null = null;

  if (isScreenSharing && screenStream && user) {
    activeScreenShare = {
      userId: user.id,
      stream: screenStream,
      userName: 'You',
      avatarUrl: undefined // Could fetch from profile if needed, but 'You' is fine
    };
  } else {
    // Find first remote screen share
    for (const [userId, streams] of remoteStreams.entries()) {
      if (streams.screen) {
        const participant = participants.find(p => p.user_id === userId);
        activeScreenShare = {
          userId,
          stream: streams.screen,
          userName: participant?.user?.full_name || 'Unknown User',
          avatarUrl: participant?.user?.avatar_url
        };
        break;
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Auto-Recording Indicator */}
      {autoRecording.isRecording && (
        <div className="absolute top-2 right-2 z-20">
          <Badge variant="destructive" className="animate-pulse flex items-center gap-2">
            <Circle className="h-2 w-2 fill-current" />
            Recording {Math.floor(autoRecording.recordingDuration / 60)}:{String(autoRecording.recordingDuration % 60).padStart(2, '0')}
          </Badge>
        </div>
      )}

      {/* Live Reactions Overlay */}
      <LiveReactions channelId={channelId} />

      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border/30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">{channel.name}</h2>
            {isConnected && connectionQuality && (
              <ConnectionQualityIndicator
                quality={connectionQuality}
                stats={connectionStats}
                showDetails
                onReconnect={forceReconnect}
                audioBitrate={audioConfig?.maxBitrate}
              />
            )}
            {isConnected && !connectionQuality && (
              <span className="text-xs text-primary">Connected</span>
            )}
          </div>

          {/* Push-to-Talk Toggle */}
          {isConnected && (
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Switch
                id="ptt-mode"
                checked={pushToTalkEnabled}
                onCheckedChange={setPushToTalkEnabled}
              />
              <Label htmlFor="ptt-mode" className="text-xs cursor-pointer font-normal">
                Push to Talk {pushToTalkEnabled && '(Space)'}
              </Label>
              {pushToTalkEnabled && isPushing && (
                <span className="text-xs text-green-500 font-semibold animate-pulse">
                  TRANSMITTING
                </span>
              )}
            </div>
          )}
        </div>

        {isConnected && channel.auto_record && (
          <div className="flex items-center gap-2">
            {recording.isRecording ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopRecording}
                  className="gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Recording ({Math.floor(recording.recordingDuration / 60)}:{String(recording.recordingDuration % 60).padStart(2, '0')})
                </Button>
                {recording.isPaused ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={recording.resumeRecording}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={recording.pauseRecording}
                  >
                    Pause
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecordingSettings(true)}
                className="gap-2"
              >
                <Circle className="w-4 h-4" />
                Start Recording
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      {!isConnected ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{channel.name}</h3>
            <p className="text-sm text-muted-foreground">
              {participants.length} {participants.length === 1 ? 'person' : 'people'} in channel
            </p>
            <Button
              onClick={handleJoinChannel}
              size="lg"
              className="gap-2"
              disabled={isJoining}
            >
              <Phone className="w-4 h-4" />
              {isJoining ? 'Connecting...' : 'Join Voice'}
            </Button>
            {isJoining && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Requesting microphone access...
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Remote Audio Players - Camera and Screen share audio with deafen support */}
          {Array.from(remoteStreams.entries()).map(([userId, streams]) => (
            <React.Fragment key={userId}>
              {/* Camera audio */}
              {streams.camera && streams.camera.getAudioTracks().length > 0 && (
                <RemoteAudioPlayer
                  userId={`${userId}-camera`}
                  stream={streams.camera}
                  isDeafened={isDeafened}
                />
              )}
              {/* Screen share audio (if present) */}
              {streams.screen && streams.screen.getAudioTracks().length > 0 && (
                <RemoteAudioPlayer
                  userId={`${userId}-screen`}
                  stream={streams.screen}
                  isDeafened={isDeafened}
                />
              )}
            </React.Fragment>
          ))}

          {/* Content Area: Whiteboard OR Screen Share OR Grid */}
          {isWhiteboardOpen ? (
            <div className="flex-1 min-h-0">
              <Whiteboard
                channelId={channelId}
                onSendEvent={(event) => sendWhiteboardEvent?.(event)}
              />
            </div>
          ) : (
            <>
              {/* Screen Share Spotlight (if active) */}
              {activeScreenShare && (
                <div className="flex-1 p-4 min-h-0 border-b border-border">
                  <ScreenShareSpotlight
                    userId={activeScreenShare.userId}
                    userName={activeScreenShare.userName || 'User'}
                    userAvatar={activeScreenShare.avatarUrl}
                    stream={activeScreenShare.stream}
                    isLocal={activeScreenShare.userId === user?.id}
                    onStop={activeScreenShare.userId === user?.id ? toggleScreenShare : undefined}
                  />
                </div>
              )}

              {/* Participant Grid */}
              <div className={`${activeScreenShare ? 'h-48 shrink-0' : 'flex-1'} overflow-auto transition-all duration-300`}>
                <ParticipantGrid
                  participants={participants}
                  channelType={channelType}
                  currentUserId={user?.id}
                  currentUserSpeaking={isSpeaking}
                  localStream={localStream}
                  remoteStreams={remoteStreams}
                />
              </div>
            </>
          )}

          {/* Voice Activity Indicator - Fixed above controls */}
          {isSpeaking && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
              <VoiceActivityIndicator isActive={true} />
            </div>
          )}

          {/* Controls - Fixed at bottom */}
          <div className="h-20 px-4 flex items-center justify-center gap-3 shrink-0 relative z-10">
            <Button
              variant="secondary"
              size="icon"
              className={`h-12 w-12 rounded-full ${isMuted ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500' : ''}`}
              onClick={toggleMute}
              disabled={pushToTalkEnabled}
              title={pushToTalkEnabled ? "Mute control disabled in Push-to-Talk mode" : undefined}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {channelType === 'video' && (
              <Button
                variant={isVideoOn ? "secondary" : "ghost"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleVideo}
              >
                {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            )}

            <Button
              variant={isScreenSharing ? "secondary" : "ghost"}
              size="icon"
              className={`h-12 w-12 rounded-full ${isScreenSharing ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
              onClick={toggleScreenShare}
            >
              <Monitor className="w-5 h-5" />
            </Button>

            <Button
              variant={isWhiteboardOpen ? "secondary" : "ghost"}
              size="icon"
              className={`h-12 w-12 rounded-full ${isWhiteboardOpen ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
              onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            >
              <PenTool className="w-5 h-5" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top">
                <div className="flex gap-2">
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      onClick={() => sendReaction?.(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className={`h-12 w-12 rounded-full ${isDeafened ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500' : ''}`}
              onClick={toggleDeafen}
            >
              {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-500"
              onClick={handleLeaveChannel}
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Audio Unlock Banner - shows if audio autoplay is blocked */}
      {isConnected && <AudioUnlockBanner />}

      {/* Recording Settings Dialog */}
      <RecordingSettingsDialog
        open={showRecordingSettings}
        onOpenChange={setShowRecordingSettings}
        onStartRecording={handleStartRecording}
      />
    </div>
  );
};

export default VoiceChannel;
