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
  title?: string;
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
  title = "Start New Conversation",
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
        .from('profiles')
        .select('id, full_name, avatar_url, current_title')
        .eq('stealth_mode_enabled', false)
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
            toast.success('Opening existing conversation');
            onConversationCreated?.(participation.conversation_id);
            onOpenChange(false);
            return;
          }
        }
      }

      // Get participant names for title
      const { data: participants } = await supabase
        .from('profiles')
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
          created_by: user.id,
          metadata: isGroupChat ? {
            is_group: true,
            participant_count: participantIds.length + 1,
          } : {},
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', {
          message: convError.message,
          code: convError.code,
          details: convError,
        });
        toast.error('Failed to create conversation', {
          description: convError.message || 'Please try again',
        });
        setCreating(false);
        return;
      }

      // Add all participants including current user
      const allParticipants = [user.id, ...participantIds];
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert(
          allParticipants.map((userId) => ({
            conversation_id: conversation.id,
            user_id: userId,
            role: 'candidate', // Using valid role from schema
            notifications_enabled: true,
            is_muted: false,
          }))
        );

      if (participantError) {
        console.error('Error inserting conversation participants:', {
          message: participantError.message,
          code: participantError.code,
          details: participantError,
        });
        toast.error('Failed to add participants to conversation', {
          description: participantError.message || 'Please try again',
        });
        setCreating(false);
        return;
      }

      // Send initial system message for group chats
      if (isGroupChat) {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `${creatorProfile?.full_name || 'Someone'} created this group chat`,
          message_type: 'system',
        });
      }

      toast.success(isGroupChat ? 'Group chat created' : 'Opening conversation');
      
      // Reset state
      setSelectedUsers([]);
      setGroupName('');
      setIsGroupChat(false);
      setSearchQuery('');
      
      onConversationCreated?.(conversation.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating conversation:', {
        message: error?.message,
        code: error?.code,
        hint: error?.hint,
        details: error,
      });
      toast.error('Failed to create conversation', {
        description: error?.message || 'Please try again',
      });
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

  const handleUserSelect = (result: UserResult) => {
    if (isGroupChat) {
      toggleUserSelection(result);
    } else {
      // For non-group chats, immediately create conversation
      setSelectedUsers([result]);
      createConversation([result.id]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
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

          {isGroupChat && selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Selected members ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                {selectedUsers.map((selectedUser) => (
                  <div
                    key={selectedUser.id}
                    className="flex items-center gap-2 p-1.5 pr-2 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors group"
                  >
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={selectedUser.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {(selectedUser.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate max-w-[100px]">{selectedUser.full_name || 'Unknown'}</span>
                    <X
                      className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => toggleUserSelection(selectedUser)}
                    />
                  </div>
                ))}
              </div>
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

          <div className="flex-1 overflow-y-auto border rounded-lg min-h-[200px] max-h-[350px]">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
            ) : searchResults.length === 0 && searchQuery ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
            ) : searchQuery && searchResults.length > 0 ? (
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
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-accent/50 transition-colors border-b last:border-b-0 cursor-pointer"
                    onClick={() => handleUserSelect(result)}
                  >
                    {isGroupChat && (
                      <Checkbox checked={isSelected} className="flex-shrink-0" />
                    )}
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarImage src={result.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm sm:text-base">{result.full_name || 'Unknown'}</p>
                      {result.current_title && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {result.current_title}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Search for users to start chatting</p>
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
