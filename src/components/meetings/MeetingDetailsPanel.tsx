import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Mail, MessageCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface MeetingDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingCode: string;
  meetingUrl: string;
  meetingId?: string;
  isHost?: boolean;
}

export function MeetingDetailsPanel({
  open,
  onOpenChange,
  meetingCode,
  meetingUrl,
  meetingId,
  isHost = false,
}: MeetingDetailsPanelProps) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (meetingId && open) {
      loadParticipants();
    }
  }, [meetingId, open]);

  const loadParticipants = async () => {
    if (!meetingId) return;

    const { data } = await supabase
      .from('meeting_participants')
      .select(`
        *,
        profiles:user_id(full_name, email, avatar_url)
      `)
      .eq('meeting_id', meetingId)
      .is('left_at', null);

    if (data) setParticipants(data);
  };

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (data) setSearchResults(data);
  };

  const inviteMember = async (profile: any) => {
    if (!meetingId || !user) return;

    setInviting(true);
    try {
      // Create invitation
      const { error: inviteError } = await supabase
        .from('meeting_invitations')
        .insert({
          meeting_id: meetingId,
          inviter_id: user.id,
          invitee_email: profile.email,
          invitee_user_id: profile.id,
          invitation_method: 'dropdown',
        });

      if (inviteError) throw inviteError;

      // Add as participant
      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meetingId,
          user_id: profile.id,
          role: 'participant',
          status: 'invited',
        });

      if (participantError && !participantError.message.includes('duplicate')) {
        throw participantError;
      }

      // Send notification
      await supabase
        .from('notifications')
        .insert({
          user_id: profile.id,
          title: 'Meeting Invitation',
          message: `You've been invited to join a meeting`,
          type: 'meeting',
          action_url: `/meetings/${meetingCode}`,
        });

      toast.success(`Invited ${profile.full_name}`, {
        description: 'They will receive a notification',
      });

      setSearchOpen(false);
      setSearchQuery('');
      loadParticipants();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const copyMeetingInfo = () => {
    const info = `Meeting Link: ${meetingUrl}\nMeeting Code: ${meetingCode}`;
    navigator.clipboard.writeText(info);
    toast.success('Meeting info copied to clipboard');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(meetingCode);
    toast.success('Code copied to clipboard');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    toast.success('Link copied to clipboard');
  };

  const shareViaEmail = () => {
    const subject = 'Join my meeting';
    const body = `You're invited to join my meeting!\n\nMeeting Link: ${meetingUrl}\nMeeting Code: ${meetingCode}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaWhatsApp = () => {
    const text = `Join my meeting!\n\nLink: ${meetingUrl}\nCode: ${meetingCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] z-[10200] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Meeting Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Magic Code Display */}
          <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Share this code</p>
            <h2 className="text-3xl font-bold font-mono tracking-wider mb-3 text-primary">
              {meetingCode.toUpperCase()}
            </h2>
            <Button variant="ghost" size="sm" onClick={copyCode} className="text-xs">
              <Copy className="h-3 w-3 mr-1" />
              Copy code
            </Button>
          </div>

          {/* Quick Share Actions */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Quick Share</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={copyLink} className="flex-col h-auto py-3">
                <Copy className="h-4 w-4 mb-1" />
                <span className="text-xs">Copy Link</span>
              </Button>
              <Button variant="outline" size="sm" onClick={shareViaEmail} className="flex-col h-auto py-3">
                <Mail className="h-4 w-4 mb-1" />
                <span className="text-xs">Email</span>
              </Button>
              <Button variant="outline" size="sm" onClick={shareViaWhatsApp} className="flex-col h-auto py-3">
                <MessageCircle className="h-4 w-4 mb-1" />
                <span className="text-xs">WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Add People Section - Only for host */}
          {isHost && meetingId && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Add People</h3>
              
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add participants...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onValueChange={(value) => {
                        setSearchQuery(value);
                        searchUsers(value);
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchQuery.length < 2 ? 'Type to search...' : 'No users found'}
                      </CommandEmpty>
                      <CommandGroup>
                        {searchResults.map((profile) => (
                          <CommandItem
                            key={profile.id}
                            onSelect={() => inviteMember(profile)}
                            disabled={inviting || participants.some(p => p.user_id === profile.id)}
                          >
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={profile.avatar_url} />
                              <AvatarFallback>
                                {profile.full_name?.slice(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{profile.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                            </div>
                            {participants.some(p => p.user_id === profile.id) && (
                              <Badge variant="secondary" className="ml-2">In meeting</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Current Participants */}
              {participants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{participants.length} participant{participants.length > 1 ? 's' : ''}</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={participant.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {participant.profiles?.full_name?.slice(0, 2).toUpperCase() || participant.guest_name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1 truncate">
                          {participant.profiles?.full_name || participant.guest_name}
                        </span>
                        {participant.role === 'host' && (
                          <Badge variant="secondary" className="text-xs">Host</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Meeting URL */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Meeting Link</h3>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs break-all text-muted-foreground">{meetingUrl}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
