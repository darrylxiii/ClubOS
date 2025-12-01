import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceChannel } from '@/hooks/useVoiceChannel';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Volume2, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { RemoteAudioPlayer } from './RemoteAudioPlayer';

interface MobileVoiceChannelProps {
  channelId: string;
  channelType: 'voice' | 'video';
  autoJoin?: boolean;
  onConnect?: (channelId: string, channelName: string) => void;
  onDisconnect?: () => void;
}

interface Channel {
  id: string;
  name: string;
  channel_type: string;
}

const MobileVoiceChannel = ({ channelId, channelType, autoJoin = false, onConnect, onDisconnect }: MobileVoiceChannelProps) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const {
    isConnected,
    isMuted,
    isVideoOn,
    isSpeaking,
    participants,
    localStream,
    remoteStreams,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
  } = useVoiceChannel(channelId);

  useEffect(() => {
    loadChannel();
  }, [channelId]);

  useEffect(() => {
    if (autoJoin && !isConnected && !isJoining && channel) {
      handleJoinChannel();
    }
  }, [autoJoin, isConnected, isJoining, channel]);

  const loadChannel = async () => {
    const { data } = await supabase
      .from('live_channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (data) setChannel(data);
  };

  const handleJoinChannel = async () => {
    setIsJoining(true);
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }
    
    try {
      await joinChannel();
      // Notify parent of successful connection
      if (channel) {
        onConnect?.(channelId, channel.name);
      }
      toast.success('Connected to voice channel');
    } catch (error: any) {
      console.error('Error joining channel:', error);
      toast.error(error?.message || 'Failed to connect');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveChannel = async () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    try {
      await leaveChannel();
      toast.success('Disconnected');
      // Notify parent to disconnect and navigate back
      onDisconnect?.();
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };

  const handleToggleMute = () => {
    if (navigator.vibrate) navigator.vibrate(30);
    toggleMute();
  };

  const handleToggleVideo = () => {
    if (navigator.vibrate) navigator.vibrate(30);
    toggleVideo();
  };

  if (!channel) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Remote Audio Players */}
      {Array.from(remoteStreams.entries()).map(([userId, streamBundle]) => (
        streamBundle.camera && <RemoteAudioPlayer key={userId} userId={userId} stream={streamBundle.camera} />
      ))}

      {!isConnected ? (
        /* Join Screen */
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-xs">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">{channel.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {participants.length} {participants.length === 1 ? 'person' : 'people'} in channel
              </p>

              {/* Show participant avatars */}
              {participants.length > 0 && (
                <div className="flex justify-center items-center gap-2">
                  {participants.slice(0, 5).map((participant) => (
                    <Avatar key={participant.id} className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={participant.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {participant.user?.full_name?.substring(0, 2).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {participants.length > 5 && (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-semibold">+{participants.length - 5}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button 
              onClick={handleJoinChannel} 
              size="lg" 
              className="w-full h-14 text-lg gap-2 rounded-full"
              disabled={isJoining}
            >
              <Phone className="w-5 h-5" />
              {isJoining ? 'Connecting...' : 'Join Voice'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Connected View */}
          <div className="flex-1 flex flex-col">
            {/* Participants Grid */}
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 gap-4">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="aspect-square rounded-2xl bg-card border-2 border-border flex flex-col items-center justify-center p-4 relative"
                  >
                    <Avatar className="h-20 w-20 mb-3">
                      <AvatarImage src={participant.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl">
                        {participant.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium text-center truncate w-full">
                      {participant.user?.full_name || 'Unknown'}
                    </p>
                    {participant.is_muted && (
                      <div className="absolute top-2 right-2 bg-red-500/20 p-1.5 rounded-full">
                        <MicOff className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                    {participant.is_speaking && (
                      <div className="absolute inset-0 rounded-2xl border-2 border-green-500 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Speaking Indicator */}
            {isSpeaking && (
              <div className="px-4 py-2 bg-green-500/10 border-t border-green-500/20">
                <p className="text-sm text-green-500 text-center font-medium">You're speaking</p>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          {showControls && (
            <div className="border-t border-border bg-card px-6 py-4 safe-area-bottom">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="icon"
                  className={`h-14 w-14 rounded-full ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''}`}
                  onClick={handleToggleMute}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                {channelType === 'video' && (
                  <Button
                    variant={isVideoOn ? "secondary" : "ghost"}
                    size="icon"
                    className="h-14 w-14 rounded-full"
                    onClick={handleToggleVideo}
                  >
                    {isVideoOn ? <VideoIcon className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="icon"
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleLeaveChannel}
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MobileVoiceChannel;
