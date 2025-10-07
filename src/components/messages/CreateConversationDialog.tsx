import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, MessageCircle, Users, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedUserId?: string;
  onConversationCreated?: (conversationId: string) => void;
}

interface UserResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  current_title: string | null;
}

export const CreateConversationDialog = ({
  open,
  onOpenChange,
  preselectedUserId,
  onConversationCreated,
}: CreateConversationDialogProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-create conversation if preselected user
  useEffect(() => {
    if (open && preselectedUserId && user) {
      createConversation([preselectedUserId]);
    }
  }, [open, preselectedUserId]);

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url, current_title')
        .neq('id', user.id)
        .ilike('full_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userResult: UserResult) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === userResult.id);
      if (exists) {
        return prev.filter((u) => u.id !== userResult.id);
      } else {
        return [...prev, userResult];
      }
    });
  };

  const createConversation = async (participantIds: string[]) => {
    if (!user || participantIds.length === 0) return;

    setCreating(true);
    try {
      // Check if 1:1 conversation already exists (only for non-group)
      if (!isGroupChat && participantIds.length === 1) {
        const { data: existingParticipants } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        for (const participation of existingParticipants || []) {
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participation.conversation_id);

          if (
            otherParticipants?.length === 2 &&
            otherParticipants.some((p) => p.user_id === participantIds[0])
          ) {
            onConversationCreated?.(participation.conversation_id);
            onOpenChange(false);
            return;
          }
        }
      }

      // Get participant names for title
      const { data: participants } = await supabase
        .from('public_profiles')
        .select('full_name')
        .in('id', participantIds);

      const conversationTitle = isGroupChat && groupName
        ? groupName
        : participants?.map((p) => p.full_name || 'Unknown').join(', ') || 'New Conversation';

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: conversationTitle,
          status: 'active',
          metadata: isGroupChat ? {
            is_group: true,
            participant_count: participantIds.length + 1,
          } : {},
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all participants including current user
      const allParticipants = [user.id, ...participantIds];
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert(
          allParticipants.map((userId) => ({
            conversation_id: conversation.id,
            user_id: userId,
            role: userId === user.id ? 'owner' : 'member',
          }))
        );

      if (participantError) throw participantError;

      toast.success(isGroupChat ? 'Group chat created' : 'Conversation started');
      onConversationCreated?.(conversation.id);
      onOpenChange(false);
      
      // Reset state
      setSelectedUsers([]);
      setGroupName('');
      setIsGroupChat(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClick = () => {
    const participantIds = selectedUsers.map((u) => u.id);
    if (participantIds.length > 0) {
      createConversation(participantIds);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2">
            <Switch
              id="group-chat"
              checked={isGroupChat}
              onCheckedChange={(checked) => {
                setIsGroupChat(checked);
                if (!checked) {
                  setGroupName('');
                  setSelectedUsers([]);
                }
              }}
            />
            <Label htmlFor="group-chat" className="flex items-center gap-2 cursor-pointer">
              <Users className="h-4 w-4" />
              Group Chat
            </Label>
          </div>

          {isGroupChat && (
            <Input
              placeholder="Group name (optional)..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-accent/30 rounded-lg border border-border/50">
              {selectedUsers.map((user) => (
                <Badge key={user.id} variant="secondary" className="gap-2">
                  {user.full_name || 'Unknown'}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => toggleUserSelection(user)}
                  />
                </Badge>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
            ) : searchResults.length === 0 && searchQuery ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
            ) : (
              searchResults.map((result) => {
                const isSelected = selectedUsers.some((u) => u.id === result.id);
                const initials = (result.full_name || '?')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent transition-colors border-b last:border-b-0 cursor-pointer"
                    onClick={() => {
                      if (isGroupChat) {
                        toggleUserSelection(result);
                      } else {
                        setSelectedUsers([result]);
                      }
                    }}
                  >
                    {isGroupChat && (
                      <Checkbox checked={isSelected} />
                    )}
                    <Avatar>
                      <AvatarImage src={result.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.current_title || 'Member'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {selectedUsers.length > 0 && (
            <Button onClick={handleCreateClick} disabled={creating} className="w-full">
              {creating ? (
                'Creating...'
              ) : isGroupChat ? (
                `Create Group with ${selectedUsers.length} ${selectedUsers.length === 1 ? 'member' : 'members'}`
              ) : (
                'Start Conversation'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
