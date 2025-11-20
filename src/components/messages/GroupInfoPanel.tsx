import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Image as ImageIcon,
  FileText,
  Video,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversationMedia } from '@/hooks/useConversationMedia';
import { SharedMediaGallery } from './SharedMediaGallery';
import { SharedLinksPanel } from './SharedLinksPanel';

interface GroupInfoPanelProps {
  conversation: {
    id: string;
    title: string;
    metadata?: {
      is_group?: boolean;
      group_avatar?: string;
      participant_count?: number;
    };
    participants?: Array<{
      user_id: string;
      profile?: {
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    }>;
  };
  onClose?: () => void;
}

export const GroupInfoPanel = ({ conversation, onClose }: GroupInfoPanelProps) => {
  const [membersExpanded, setMembersExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [linksExpanded, setLinksExpanded] = useState(false);

  const isGroup = conversation.metadata?.is_group;
  const { media, links, loading } = useConversationMedia(conversation.id);

  return (
    <div className="w-80 border-l border-border/50 flex flex-col glass-strong animate-fade-in bg-card z-40">
      {/* Header */}
      <div className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-card shadow-glass-sm">
        <h3 className="font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          {isGroup ? 'Group Info' : 'Chat Info'}
        </h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Group/Chat Avatar & Name */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-glass-lg">
              <AvatarImage
                src={
                  isGroup
                    ? conversation.metadata?.group_avatar
                    : conversation.participants?.[0]?.profile?.avatar_url || undefined
                }
              />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {isGroup ? (
                  <Users className="h-12 w-12" />
                ) : (
                  conversation.title.slice(0, 2).toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg">{conversation.title}</h3>
              {isGroup && (
                <p className="text-sm text-muted-foreground">
                  {conversation.metadata?.participant_count || 0} members
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Members Section */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-accent/50"
              onClick={() => setMembersExpanded(!membersExpanded)}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">
                  Members {isGroup ? `(${conversation.participants?.length || 0})` : ''}
                </span>
              </div>
              {membersExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {membersExpanded && (
              <div className="space-y-2 pl-2">
                {(!conversation.participants || conversation.participants.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No participant data available
                  </p>
                ) : (
                  conversation.participants.map((participant) => {
                  const name =
                    participant.profile?.full_name || 'Unknown User';
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={participant.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-background">
                        <AvatarImage
                          src={participant.profile?.avatar_url || undefined}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">Member</p>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Files Section */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-accent/50"
              onClick={() => setFilesExpanded(!filesExpanded)}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Shared Files</span>
              </div>
              {filesExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {filesExpanded && (
              <div className="space-y-2 pl-2">
                <SharedMediaGallery media={media} loading={loading} />
              </div>
            )}
          </div>

          <Separator />

          {/* Links Section */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-accent/50"
              onClick={() => setLinksExpanded(!linksExpanded)}
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                <span className="font-medium">Shared Links</span>
              </div>
              {linksExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {linksExpanded && (
              <div className="space-y-2 pl-2">
                <SharedLinksPanel links={links} loading={loading} />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
