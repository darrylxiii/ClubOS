import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceChannel } from '@/hooks/useVoiceChannel';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, Volume2, VolumeX } from 'lucide-react';
import ParticipantGrid from './ParticipantGrid';
import VoiceActivityIndicator from './VoiceActivityIndicator';
import { toast } from 'sonner';

interface VoiceChannelProps {
  channelId: string;
  channelType: 'voice' | 'video' | 'stage';
}

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  auto_record: boolean;
  auto_transcribe: boolean;
}

const VoiceChannel = ({ channelId, channelType }: VoiceChannelProps) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const {
    isConnected,
    isMuted,
    isDeafened,
    isVideoOn,
    isScreenSharing,
    isSpeaking,
    participants,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording
  } = useVoiceChannel(channelId);

  useEffect(() => {
    loadChannel();
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
    try {
      await joinChannel();
      
      // Auto-start recording if enabled
      if (channel?.auto_record) {
        await handleStartRecording();
      }
      
      toast.success('Connected to voice channel');
    } catch (error) {
      console.error('Error joining channel:', error);
      toast.error('Failed to connect to voice channel');
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
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">{channel.name}</h2>
          {isConnected && (
            <span className="text-xs text-primary">Connected</span>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{channel.name}</h3>
            <p className="text-sm text-muted-foreground">
              {participants.length} {participants.length === 1 ? 'person' : 'people'} in channel
            </p>
            <Button onClick={handleJoinChannel} size="lg" className="gap-2">
              <Phone className="w-4 h-4" />
              Join Voice
            </Button>
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col">
            {/* Participants */}
            <div className="flex-1 overflow-auto">
              <ParticipantGrid 
                participants={participants} 
                channelType={channelType}
              />
            </div>

            {/* Voice Activity Indicator */}
            {isSpeaking && (
              <VoiceActivityIndicator />
            )}

            {/* Controls */}
            <div className="h-20 border-t border-border px-4 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className={`h-12 w-12 rounded-full ${isMuted ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500' : ''}`}
                onClick={toggleMute}
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
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChannel;
