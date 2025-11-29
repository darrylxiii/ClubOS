import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStageChannel } from '@/hooks/useStageChannel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RemoteAudioPlayer } from './RemoteAudioPlayer';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  Hand, UserPlus, UserMinus, Crown, Users
} from 'lucide-react';
import { toast } from 'sonner';

interface StageChannelProps {
  channelId: string;
}

interface Channel {
  id: string;
  name: string;
  channel_type: string;
}

const StageChannel = ({ channelId }: StageChannelProps) => {
  const [channel, setChannel] = useState<Channel | null>(null);
  
  const {
    isConnected,
    isMuted,
    isVideoOn,
    myParticipant,
    speakers,
    listeners,
    isHost,
    isSpeaker,
    remoteStreams,
    isWebRTCConnected,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
    toggleHandRaise,
    inviteToSpeak,
    moveToAudience,
    lowerHand,
  } = useStageChannel(channelId);

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
      toast.success('Joined stage');
    } catch (error) {
      console.error('Error joining stage:', error);
      toast.error('Failed to join stage');
    }
  };

  const handleLeaveChannel = async () => {
    try {
      await leaveChannel();
      toast.success('Left stage');
    } catch (error) {
      console.error('Error leaving stage:', error);
    }
  };

  if (!channel) return null;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">{channel.name}</h2>
          {isConnected && (
            <Badge variant="secondary" className="text-xs">
              {isSpeaker ? 'Speaker' : 'Listener'}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {speakers.length} {speakers.length === 1 ? 'speaker' : 'speakers'} · {listeners.length} {listeners.length === 1 ? 'listener' : 'listeners'}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!isConnected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{channel.name}</h3>
              <p className="text-sm text-muted-foreground">
                {speakers.length + listeners.length} {speakers.length + listeners.length === 1 ? 'person' : 'people'} in stage
              </p>
              <Button onClick={handleJoinChannel} size="lg" className="gap-2">
                <Phone className="w-4 h-4" />
                Join Stage
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Remote Audio Players */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
              <RemoteAudioPlayer key={userId} userId={userId} stream={stream} />
            ))}

            {/* Speakers Section */}
            <div className="border-b border-border">
              <div className="px-4 py-2 bg-muted/30">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  Speakers ({speakers.length})
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {speakers.map((speaker) => (
                    <div key={speaker.id} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border border-border">
                      <div className="relative">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={speaker.avatar_url || undefined} />
                          <AvatarFallback>
                            {speaker.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {speaker.is_speaking && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                        )}
                      </div>
                      <div className="text-center space-y-1">
                        <div className="font-medium text-sm flex items-center gap-1 justify-center">
                          {speaker.display_name}
                          {speaker.role === 'host' && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 justify-center">
                          {speaker.is_muted ? (
                            <MicOff className="w-3 h-3 text-red-500" />
                          ) : (
                            <Mic className="w-3 h-3 text-green-500" />
                          )}
                          {speaker.is_video_on ? (
                            <Video className="w-3 h-3 text-green-500" />
                          ) : (
                            <VideoOff className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {isHost && speaker.role !== 'host' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => moveToAudience(speaker.id)}
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          Move to Audience
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Listeners Section */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 bg-muted/30">
                <h3 className="text-sm font-semibold">
                  Audience ({listeners.length})
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {listeners.map((listener) => (
                    <div
                      key={listener.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={listener.avatar_url || undefined} />
                          <AvatarFallback>
                            {listener.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{listener.display_name}</div>
                          {listener.is_hand_raised && (
                            <div className="flex items-center gap-1 text-xs text-orange-500">
                              <Hand className="w-3 h-3" />
                              Hand raised
                            </div>
                          )}
                        </div>
                      </div>
                      {isHost && (
                        <div className="flex items-center gap-1">
                          {listener.is_hand_raised && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => inviteToSpeak(listener.id)}
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Invite
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => lowerHand(listener.id)}
                              >
                                Lower Hand
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {listeners.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No listeners yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Controls */}
            <div className="h-20 border-t border-border px-4 flex items-center justify-center gap-2">
              {!isSpeaker && (
                <Button
                  variant={myParticipant?.is_hand_raised ? "secondary" : "ghost"}
                  size="icon"
                  className={`h-12 w-12 rounded-full ${myParticipant?.is_hand_raised ? 'bg-orange-500/20 text-orange-500' : ''}`}
                  onClick={toggleHandRaise}
                >
                  <Hand className="w-5 h-5" />
                </Button>
              )}

              {isSpeaker && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={`h-12 w-12 rounded-full ${isMuted ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500' : ''}`}
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>

                  <Button
                    variant={isVideoOn ? "secondary" : "ghost"}
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={toggleVideo}
                  >
                    {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>
                </>
              )}

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
    </div>
  );
};

export default StageChannel;
