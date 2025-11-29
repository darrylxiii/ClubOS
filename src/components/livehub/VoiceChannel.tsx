import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceChannel } from '@/hooks/useVoiceChannel';
import { usePushToTalk } from '@/hooks/usePushToTalk';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, Volume2, VolumeX } from 'lucide-react';
import ParticipantGrid from './ParticipantGrid';
import VoiceActivityIndicator from './VoiceActivityIndicator';
import ScreenShareSpotlight from './ScreenShareSpotlight';
import { RemoteAudioPlayer } from './RemoteAudioPlayer';
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

const VoiceChannel = ({ channelId, channelType, autoJoin = false }: VoiceChannelProps) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pushToTalkEnabled, setPushToTalkEnabled] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
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
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    setPushToTalkActive
  } = useVoiceChannel(channelId, { pushToTalkEnabled });

  const { isPushing } = usePushToTalk({
    enabled: pushToTalkEnabled && isConnected,
    hotkey: 'Space',
    onPushStart: () => setPushToTalkActive?.(true),
    onPushEnd: () => setPushToTalkActive?.(false),
  });

  useEffect(() => {
    loadChannel();
  }, [channelId]);

  // Auto-join when autoJoin prop is true
  useEffect(() => {
    if (autoJoin && !isConnected && !isJoining && channel) {
      handleJoinChannel();
    }
  }, [autoJoin, channelId]);

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
      
      // Auto-start recording if enabled
      if (channel?.auto_record) {
        await handleStartRecording();
      }
      
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
      await leaveChannel();
      toast.success('Disconnected from voice channel');
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
      setIsRecording(false);
      toast.success('Recording stopped and processing...');
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };

  if (!channel) return null;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">{channel.name}</h2>
            {isConnected && (
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
            {isRecording ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-muted-foreground">Recording</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStopRecording}
                >
                  Stop Recording
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartRecording}
              >
                Start Recording
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Content - Fixed layout */}
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
        <>
          {/* Remote Audio Players */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <RemoteAudioPlayer key={userId} userId={userId} stream={stream} />
          ))}

          {/* Participant Grid / Screen Share - Scrollable */}
          <div className="flex-1 min-h-0 overflow-auto">
            {(() => {
              // Check if anyone is screen sharing
              const screenSharingParticipants = participants.filter(p => p.is_screen_sharing);
              const localScreenShare = isScreenSharing && screenStream;
              
              if (localScreenShare) {
                const currentUserParticipant = participants.find(p => p.user_id === user?.id);
                return (
                  <div className="w-full h-full p-4">
                    <ScreenShareSpotlight
                      userId={user!.id}
                      userName={currentUserParticipant?.user?.full_name || 'You'}
                      userAvatar={currentUserParticipant?.user?.avatar_url}
                      stream={localStream!}
                      isLocal={true}
                      onStop={toggleScreenShare}
                    />
                  </div>
                );
              }
              
              if (screenSharingParticipants.length > 0) {
                const sharingParticipant = screenSharingParticipants[0];
                const remoteStream = remoteStreams.get(sharingParticipant.user_id);
                
                if (remoteStream) {
                  return (
                    <div className="w-full h-full p-4">
                      <ScreenShareSpotlight
                        userId={sharingParticipant.user_id}
                        userName={sharingParticipant.user?.full_name || 'Unknown User'}
                        userAvatar={sharingParticipant.user?.avatar_url}
                        stream={remoteStream}
                        isLocal={false}
                      />
                    </div>
                  );
                }
              }
              
              // No screen sharing - show normal participant grid
              return (
                <ParticipantGrid 
                  participants={participants} 
                  channelType={channelType}
                  currentUserId={user?.id}
                  currentUserSpeaking={isSpeaking}
                  localStream={localStream}
                />
              );
            })()}
          </div>

          {/* Voice Activity Indicator - Fixed above controls */}
          {isSpeaking && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
              <VoiceActivityIndicator isActive={true} />
            </div>
          )}

          {/* Controls - Fixed at bottom */}
          <div className="h-20 border-t border-border px-4 flex items-center justify-center gap-2 bg-background">
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
        </>
      )}
    </div>
  );
};

export default VoiceChannel;
