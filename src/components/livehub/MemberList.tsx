import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Member {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'away' | 'offline';
}

interface MemberListProps {
  onlineMembers: Member[];
  channelType?: string;
  channelId?: string | null;
}

const MemberList = ({ onlineMembers, channelType, channelId }: MemberListProps) => {
  const [channelParticipants, setChannelParticipants] = useState<Member[]>([]);
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Load channel participants for voice/video channels
  useEffect(() => {
    if (!channelId || !['voice', 'video', 'stage'].includes(channelType || '')) {
      setChannelParticipants([]);
      return;
    }

    loadChannelParticipants();
    subscribeToParticipants();
  }, [channelId, channelType]);

  const loadChannelParticipants = async () => {
    if (!channelId) return;

    const { data } = await supabase
      .from('live_channel_participants')
      .select(`
        id,
        user_id,
        is_speaking,
        is_muted,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('channel_id', channelId);

    if (data) {
      const participants: Member[] = data.map((p: any) => ({
        id: p.profiles.id,
        full_name: p.profiles.full_name,
        avatar_url: p.profiles.avatar_url,
        status: 'online' as const
      }));
      setChannelParticipants(participants);
    }
  };

  const subscribeToParticipants = () => {
    const channel = supabase
      .channel(`member-list-participants:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_participants',
          filter: `channel_id=eq.${channelId}`
        },
        () => loadChannelParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const isVoiceChannel = ['voice', 'video', 'stage'].includes(channelType || '');
  const displayMembers = isVoiceChannel && !showAllMembers ? channelParticipants : onlineMembers;
  const otherMembers = isVoiceChannel 
    ? onlineMembers.filter(m => !channelParticipants.some(p => p.id === m.id))
    : [];
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="w-60 bg-card border-l border-border flex flex-col">
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <h3 className="font-semibold text-sm">
          {isVoiceChannel 
            ? `In Channel — ${channelParticipants.length}`
            : `Members — ${onlineMembers.length}`
          }
        </h3>
        {isVoiceChannel && otherMembers.length > 0 && (
          <button
            onClick={() => setShowAllMembers(!showAllMembers)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showAllMembers ? 'Channel' : 'All'}
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isVoiceChannel && channelParticipants.length > 0 && !showAllMembers && (
            <div>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                In Voice Channel
              </div>
              <div className="space-y-0.5">
                {channelParticipants.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
                    </div>
                    <span className="text-sm truncate">{member.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isVoiceChannel && otherMembers.length > 0 && showAllMembers && (
            <div>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                Other Members
              </div>
              <div className="space-y-0.5">
                {otherMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer opacity-60"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
                    </div>
                    <span className="text-sm truncate">{member.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isVoiceChannel && displayMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {member.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
              </div>
              <span className="text-sm truncate">{member.full_name}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MemberList;
