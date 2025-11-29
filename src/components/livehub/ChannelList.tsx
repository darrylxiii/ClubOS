import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Hash, Volume2, Video, Radio, Plus } from 'lucide-react';
import { useLiveHubUnread } from '@/hooks/useLiveHubUnread';
import { UnreadBadge } from '@/components/messages/UnreadBadge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import CreateChannelDialog from './CreateChannelDialog';

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  category: string | null;
  position: number;
}

interface ChannelListProps {
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string, channelType: string, autoJoin?: boolean) => void;
}

interface ChannelParticipant {
  id: string;
  user_id: string;
  is_speaking: boolean;
  is_muted: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const ChannelList = ({ selectedChannelId, onChannelSelect }: ChannelListProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelParticipants, setChannelParticipants] = useState<Record<string, ChannelParticipant[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['GENERAL', 'STRATEGY', 'RECRUITMENT', 'CLIENT CALLS']));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [serverId, setServerId] = useState<string | null>(null);
  const { getUnreadCount } = useLiveHubUnread();

  useEffect(() => {
    ensureMembership();
    subscribeToChanges();
  }, []);

  const ensureMembership = async () => {
    try {
      // Call RPC to ensure user is member of default server
      const { error: rpcError } = await supabase.rpc('join_default_server');
      if (rpcError) {
        console.error('Error joining default server:', rpcError);
        // Retry once if it fails
        const { error: retryError } = await supabase.rpc('join_default_server');
        if (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
      
      // Load channels after ensuring membership
      await loadChannels();
    } catch (error) {
      console.error('Error ensuring membership:', error);
    }
  };

  const loadChannels = async () => {
    // Get the default server first
    const { data: serverData, error: serverError } = await supabase
      .from('live_servers')
      .select('id')
      .eq('is_default', true)
      .single();

    if (serverError || !serverData) {
      console.error('Error loading server:', serverError);
      toast.error('Failed to load server. Please refresh the page.');
      return;
    }

    setServerId(serverData.id);

    // Load channels for the server
    const { data, error } = await supabase
      .from('live_channels')
      .select('*')
      .eq('server_id', serverData.id)
      .order('category', { ascending: true })
      .order('position', { ascending: true });

    if (error) {
      console.error('Error loading channels:', error);
      return;
    }

    setChannels(data || []);
    
    // Load participants for voice/video channels
    if (data) {
      loadChannelParticipants(data.filter(c => ['voice', 'video', 'stage'].includes(c.channel_type)));
    }
  };

  const loadChannelParticipants = async (voiceChannels: Channel[]) => {
    const participantMap: Record<string, ChannelParticipant[]> = {};
    
    for (const channel of voiceChannels) {
      const { data } = await supabase
        .from('live_channel_participants')
        .select(`
          id,
          user_id,
          is_speaking,
          is_muted,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('channel_id', channel.id);
      
      if (data) {
        participantMap[channel.id] = data as any;
      }
    }
    
    setChannelParticipants(participantMap);
  };

  const subscribeToChanges = () => {
    const channelsChannel = supabase
      .channel('live_channels_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channels'
        },
        () => loadChannels()
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('live_participants_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_participants'
        },
        () => {
          const voiceChannels = channels.filter(c => ['voice', 'video', 'stage'].includes(c.channel_type));
          loadChannelParticipants(voiceChannels);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelsChannel);
      supabase.removeChannel(participantsChannel);
    };
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Hash className="w-4 h-4" />;
      case 'voice':
        return <Volume2 className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'stage':
        return <Radio className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  // Group channels by category
  const channelsByCategory = channels.reduce((acc, channel) => {
    const category = channel.category || 'UNCATEGORIZED';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  return (
    <div className="w-60 bg-card border-r border-border flex flex-col">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border shadow-sm">
        <h2 className="font-semibold text-sm truncate">The Quantum Club</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Channels */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {Object.entries(channelsByCategory).map(([category, categoryChannels]) => (
            <div key={category} className="mb-3">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{category}</span>
              </button>

              {expandedCategories.has(category) && (
                <div className="space-y-0.5 px-2">
                  {categoryChannels.map((channel) => {
                    const participants = channelParticipants[channel.id] || [];
                    const isVoiceType = ['voice', 'video', 'stage'].includes(channel.channel_type);
                    
                    return (
                      <div key={channel.id}>
                        <button
                          onClick={() => {
                            const shouldAutoJoin = isVoiceType;
                            onChannelSelect(channel.id, channel.channel_type, shouldAutoJoin);
                          }}
                          className={`relative w-full px-2 py-1.5 flex items-center gap-2 text-sm rounded group ${
                            selectedChannelId === channel.id
                              ? 'bg-primary/10 text-primary'
                              : getUnreadCount(channel.id) > 0
                              ? 'text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {getChannelIcon(channel.channel_type)}
                          <span className="flex-1 truncate text-left">{channel.name}</span>
                          {channel.channel_type === 'text' && getUnreadCount(channel.id) > 0 && (
                            <UnreadBadge count={getUnreadCount(channel.id)} />
                          )}
                          {isVoiceType && participants.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {participants.length}
                            </span>
                          )}
                        </button>
                        
                        {/* Inline participant preview for voice channels */}
                        {isVoiceType && participants.length > 0 && (
                          <div className="ml-8 mt-1 space-y-1">
                            {participants.slice(0, 3).map((participant) => (
                              <div
                                key={participant.id}
                                className="flex items-center gap-2 text-xs text-muted-foreground py-0.5"
                              >
                                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                  {participant.profiles?.avatar_url ? (
                                    <img 
                                      src={participant.profiles.avatar_url} 
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[8px]">
                                      {participant.profiles?.full_name?.charAt(0) || '?'}
                                    </span>
                                  )}
                                </div>
                                <span className="truncate flex-1">
                                  {participant.profiles?.full_name || 'Unknown'}
                                </span>
                                {participant.is_speaking && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                )}
                                {participant.is_muted && (
                                  <Volume2 className="w-3 h-3 opacity-50" />
                                )}
                              </div>
                            ))}
                            {participants.length > 3 && (
                              <div className="text-xs text-muted-foreground ml-6">
                                +{participants.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <CreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        serverId={serverId}
        onChannelCreated={loadChannels}
      />
    </div>
  );
};

export default ChannelList;
