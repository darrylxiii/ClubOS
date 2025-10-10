import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Plus,
  MessageCircle,
  Phone,
  Video,
  Info,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { CreateConversationDialog } from '@/components/messages/CreateConversationDialog';
import { ConversationListItem } from '@/components/messages/ConversationListItem';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { GroupInfoPanel } from '@/components/messages/GroupInfoPanel';
import { VideoCallLauncher } from '@/components/messages/VideoCallLauncher';
import { UnreadBadge } from '@/components/messages/UnreadBadge';
import confetti from 'canvas-confetti';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
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

  const handleSendMessage = async (content: string, attachment?: File, metadata?: any) => {
    if (!selectedConversationId) return;
    try {
      await sendMessage(content, attachment ? [attachment] : [], metadata);
      if (messages.length === 0) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (!loading && conversations.length === 0) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/5">
          <Card className="max-w-md w-full p-8 text-center space-y-6 glass-card animate-scale-in">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-accent flex items-center justify-center shadow-glow">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Messages</h2>
              <p className="text-muted-foreground">Start conversations with your network</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="w-full shadow-glass-md hover:shadow-glass-lg transition-shadow">
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
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background/95 to-primary/5">
        {/* Conversation List Panel */}
        <div 
          className={cn(
            "w-80 border-r border-border/30 flex flex-col glass-strong backdrop-blur-2xl transition-transform duration-300 shadow-glass-lg",
            "lg:translate-x-0",
            showMobileSidebar ? "translate-x-0" : "-translate-x-full absolute lg:relative z-20 h-full"
          )}
        >
        <div className="p-4 border-b border-border/30 bg-card/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2.5">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Messages</span>
            </h2>
            <Button 
              size="icon" 
              onClick={() => setCreateDialogOpen(true)} 
              className="rounded-full shadow-glass-md hover:shadow-glow hover:scale-110 transition-all duration-200 bg-gradient-accent"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-9 glass-subtle border-border/30 rounded-xl focus:shadow-glass-md transition-shadow font-medium"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv as any}
                isSelected={conv.id === selectedConversationId}
                onClick={() => {
                  setSelectedConversationId(conv.id);
                  setShowMobileSidebar(false);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {selectedConversationId && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border/30 glass-strong backdrop-blur-2xl px-6 flex items-center justify-between shadow-glass-md flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden hover:bg-accent/50 rounded-xl"
                  onClick={() => setShowMobileSidebar(true)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-glass-md hover:ring-primary/60 transition-all">
                  <AvatarImage 
                    src={
                      isGroup 
                        ? selectedConversation.metadata?.group_avatar 
                        : selectedConversation.participants?.find(p => p.user_id !== user?.id)?.profile?.avatar_url || undefined
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-accent text-white font-semibold text-sm">
                    {isGroup ? <Users className="h-4 w-4" /> : selectedConversation.title.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-base">{selectedConversation.title}</h3>
                  {isGroup && (
                    <p className="text-xs font-medium text-muted-foreground/80">
                      {selectedConversation.metadata?.participant_count || 0} members
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-200 hover:scale-110" title="Voice call">
                  <Phone className="h-5 w-5" />
                </Button>
                <VideoCallLauncher 
                  conversationId={selectedConversationId}
                  participantName={selectedConversation.title}
                />
                <Button 
                  variant={showGroupInfo ? "default" : "ghost"}
                  size="icon" 
                  onClick={() => setShowGroupInfo(!showGroupInfo)}
                  className={cn(
                    "transition-all duration-200 rounded-xl hover:scale-110",
                    showGroupInfo ? "bg-gradient-accent text-white shadow-glow" : "hover:bg-primary/10 hover:text-primary"
                  )}
                  title={showGroupInfo ? "Hide Info" : "Show Info"}
                >
                  <Info className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-background/80 via-background/70 to-primary/5 backdrop-blur-sm overflow-y-auto">
              <div className="space-y-4 pb-4">
                {messages.map((msg) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isCurrentUser={msg.sender_id === user?.id} 
                    isGroup={isGroup} 
                  />
                ))}
                {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Composer - Sticky at bottom */}
            <div className="sticky bottom-0 flex-shrink-0 z-10">
              <MessageComposer 
                conversationId={selectedConversationId} 
                onSend={handleSendMessage} 
                onTyping={broadcastTyping} 
                disabled={sending} 
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 animate-fade-in">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-accent flex items-center justify-center shadow-glow">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">Choose from your existing conversations or start a new one</p>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Group Info Panel - Always visible when toggled */}
        {selectedConversationId && selectedConversation && showGroupInfo && (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              <GroupInfoPanel 
                conversation={selectedConversation} 
                onClose={() => setShowGroupInfo(false)}
              />
            </div>
            
            {/* Mobile Overlay */}
            <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setShowGroupInfo(false)}>
              <div className="absolute right-0 top-0 bottom-0 w-80 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <GroupInfoPanel 
                  conversation={selectedConversation} 
                  onClose={() => setShowGroupInfo(false)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <CreateConversationDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
        onConversationCreated={(id) => { 
          setSelectedConversationId(id); 
          loadConversations(); 
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); 
        }} 
      />
    </AppLayout>
  );
}
