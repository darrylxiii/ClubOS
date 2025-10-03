import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, MessageCircle } from 'lucide-react';

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
  email: string;
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
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-create conversation if preselected user
  useEffect(() => {
    if (open && preselectedUserId && user) {
      createConversation(preselectedUserId);
    }
  }, [open, preselectedUserId]);

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .neq('id', user.id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
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

  const createConversation = async (recipientId: string) => {
    if (!user) return;

    setCreating(true);
    try {
      // Check if conversation already exists
      const { data: existingParticipants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantsError) throw participantsError;

      // Find if there's a 1:1 conversation with this user
      for (const participation of existingParticipants || []) {
        const { data: otherParticipants, error: otherError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', participation.conversation_id);

        if (otherError) throw otherError;

        if (
          otherParticipants?.length === 2 &&
          otherParticipants.some((p) => p.user_id === recipientId)
        ) {
          onConversationCreated?.(participation.conversation_id);
          onOpenChange(false);
          return;
        }
      }

      // Get recipient name
      const { data: recipient } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', recipientId)
        .single();

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: recipient?.full_name || 'New Conversation',
          application_id: '00000000-0000-0000-0000-000000000000', // Placeholder
          status: 'active',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: conversation.id,
            user_id: user.id,
            role: 'candidate',
          },
          {
            conversation_id: conversation.id,
            user_id: recipientId,
            role: 'candidate',
          },
        ]);

      if (participantError) throw participantError;

      toast.success('Conversation created');
      onConversationCreated?.(conversation.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
            ) : searchResults.length === 0 && searchQuery ? (
              <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
            ) : (
              searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={result.avatar_url || ''} />
                      <AvatarFallback>
                        {result.full_name?.charAt(0) || result.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{result.full_name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{result.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => createConversation(result.id)}
                    disabled={creating}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
