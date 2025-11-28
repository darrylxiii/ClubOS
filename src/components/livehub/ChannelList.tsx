import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Hash, Volume2, Video, Radio, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  onChannelSelect: (channelId: string, channelType: string) => void;
}

const ChannelList = ({ selectedChannelId, onChannelSelect }: ChannelListProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['GENERAL']));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [serverId, setServerId] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
    subscribeToChanges();
  }, []);

  const loadChannels = async () => {
    // Get the default server first
    const { data: serverData, error: serverError } = await supabase
      .from('live_servers')
      .select('id')
      .eq('is_default', true)
      .single();

    if (serverError || !serverData) {
      console.error('Error loading server:', serverError);
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
  };

  const subscribeToChanges = () => {
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <h2 className="font-semibold text-sm">The Quantum Club</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Channels */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {Object.entries(channelsByCategory).map(([category, categoryChannels]) => (
            <div key={category} className="mb-2">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-2 py-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wide"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {category}
              </button>

              {expandedCategories.has(category) && (
                <div className="space-y-0.5">
                  {categoryChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => onChannelSelect(channel.id, channel.channel_type)}
                      className={`w-full px-2 py-1.5 flex items-center gap-2 text-sm rounded mx-2 ${
                        selectedChannelId === channel.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {getChannelIcon(channel.channel_type)}
                      <span className="truncate">{channel.name}</span>
                    </button>
                  ))}
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
