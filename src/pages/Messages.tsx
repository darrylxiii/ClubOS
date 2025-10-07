import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Plus,
  MessageCircle,
  Sparkles,
  Phone,
  Video,
  Pin,
  Archive,
  Users,
} from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { CreateConversationDialog } from '@/components/messages/CreateConversationDialog';
import { ConversationListItem } from '@/components/messages/ConversationListItem';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import confetti from 'canvas-confetti';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    loadConversations,
    broadcastTyping,
  } = useMessages(selectedConversationId || undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const isGroup = selectedConversation?.metadata?.is_group;

  const filteredConversations = conversations.filter((conv) => 
    !searchQuery || conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async (content: string, attachment?: File) => {
    if (!selectedConversationId) return;
    try {
      await sendMessage(content, attachment ? [attachment] : []);
      if (messages.length === 0) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (!loading && conversations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Messages</h2>
            <p className="text-muted-foreground">Start conversations with your network</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="w-full">
            <Plus className="h-5 w-5 mr-2" />
            Start Your First Conversation
          </Button>
        </Card>
        <CreateConversationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onConversationCreated={(id) => { setSelectedConversationId(id); loadConversations(); }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <div className="w-80 border-r flex flex-col bg-card/50">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Messages
            </h2>
            <Button size="icon" onClick={() => setCreateDialogOpen(true)} className="rounded-full">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv as any}
                isSelected={conv.id === selectedConversationId}
                onClick={() => setSelectedConversationId(conv.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversationId && selectedConversation ? (
          <>
            <div className="h-16 border-b bg-card/50 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={isGroup ? selectedConversation.metadata?.group_avatar : selectedConversation.participants?.[0]?.profile?.avatar_url || undefined} />
                  <AvatarFallback>{isGroup ? <Users className="h-5 w-5" /> : selectedConversation.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedConversation.title}</h3>
                  {isGroup && <p className="text-xs text-muted-foreground">{selectedConversation.metadata?.participant_count || 0} members</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon"><Pin className="h-5 w-5" /></Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isCurrentUser={msg.sender_id === user?.id} isGroup={isGroup} />
              ))}
              {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <MessageComposer conversationId={selectedConversationId} onSend={handleSendMessage} onTyping={broadcastTyping} disabled={sending} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold">Select a conversation</h3>
            </div>
          </div>
        )}
      </div>
      <CreateConversationDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onConversationCreated={(id) => { setSelectedConversationId(id); loadConversations(); confetti({ particleCount: 100, spread: 70 }); }} />
    </div>
  );
}
