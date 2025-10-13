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
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useUserPresence } from '@/hooks/useUserPresence';
import { CreateConversationDialog } from '@/components/messages/CreateConversationDialog';
import { ConversationListItem } from '@/components/messages/ConversationListItem';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { GroupInfoPanel } from '@/components/messages/GroupInfoPanel';
import { VideoCallLauncher } from '@/components/messages/VideoCallLauncher';
import { AudioCallLauncher } from '@/components/messages/AudioCallLauncher';
import { UnreadBadge } from '@/components/messages/UnreadBadge';
import { MessageEditor } from '@/components/messages/MessageEditor';
import { ThreadView } from '@/components/messages/ThreadView';
import { OnlineStatusIndicator } from '@/components/messages/OnlineStatusIndicator';
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [threadParentMessageId, setThreadParentMessageId] = useState<string | null>(null);
  const [showThreadView, setShowThreadView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    loadConversations,
    loadMessages,
    broadcastTyping,
  } = useMessages(selectedConversationId || undefined);

  // Track user presence
  useUserPresence();

  // Mark messages as read
  useReadReceipts(selectedConversationId, messages);

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
      <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div 
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-10"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Conversation List Panel */}
        <div 
          className={cn(
            "w-full sm:w-80 border-r border-border/20 flex flex-col bg-background transition-transform duration-300 overflow-hidden",
            "lg:translate-x-0",
            showMobileSidebar ? "translate-x-0 absolute lg:relative" : "-translate-x-full absolute lg:relative",
            "z-20 h-full"
          )}
        >
        <div className="p-3 sm:p-4 border-b border-border/30 bg-background/60 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span>Messages</span>
            </h2>
            <Button 
              size="icon" 
              onClick={() => setCreateDialogOpen(true)} 
              className="rounded-full hover:scale-110 transition-all duration-200 bg-primary h-10 w-10"
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
              className="pl-9 bg-muted/30 border-border/30 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedConversationId && selectedConversation ? (
          <>
            {/* Chat Header - Fixed */}
            <div className="flex-shrink-0 h-16 border-b border-border/20 bg-background/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-9 w-9"
                  onClick={() => setShowMobileSidebar(true)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={
                        isGroup 
                          ? selectedConversation.metadata?.group_avatar 
                          : selectedConversation.participants?.find(p => p.user_id !== user?.id)?.profile?.avatar_url || undefined
                      }
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {isGroup ? <Users className="h-4 w-4" /> : selectedConversation.title.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!isGroup && selectedConversation.participants && (
                    <OnlineStatusIndicator 
                      userId={selectedConversation.participants.find(p => p.user_id !== user?.id)?.user_id || ''} 
                      className="absolute bottom-0 right-0 ring-2 ring-background"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base truncate">{selectedConversation.title}</h3>
                  {isGroup && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedConversation.metadata?.participant_count || 0} members
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <AudioCallLauncher 
                  conversationId={selectedConversationId}
                  participantName={selectedConversation.title}
                />
                <VideoCallLauncher 
                  conversationId={selectedConversationId}
                  participantName={selectedConversation.title}
                />
                <Button 
                  variant={showGroupInfo ? "default" : "ghost"}
                  size="icon" 
                  onClick={() => setShowGroupInfo(!showGroupInfo)}
                  className="h-9 w-9"
                  title={showGroupInfo ? "Hide Info" : "Show Info"}
                >
                  <Info className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
              <div className="space-y-3 pb-4">
                {messages.map((msg) => (
                  editingMessageId === msg.id ? (
                    <div key={msg.id} className="px-4">
                      <MessageEditor
                        messageId={msg.id}
                        currentContent={msg.content}
                        onSave={() => {
                          setEditingMessageId(null);
                          loadMessages();
                        }}
                        onCancel={() => setEditingMessageId(null)}
                      />
                    </div>
                  ) : (
                    <MessageBubble 
                      key={msg.id} 
                      message={msg} 
                      isCurrentUser={msg.sender_id === user?.id} 
                      isGroup={isGroup}
                      onEdit={() => setEditingMessageId(msg.id)}
                      onReply={() => {
                        setThreadParentMessageId(msg.id);
                        setShowThreadView(true);
                      }}
                      onDelete={() => loadMessages()}
                    />
                  )
                ))}
                {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Composer - Fixed at Bottom */}
            <div className="flex-shrink-0 border-t border-border/20 bg-background">
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
              <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 animate-slide-up" onClick={(e) => e.stopPropagation()}>
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

      {selectedConversationId && (
        <ThreadView
          parentMessageId={threadParentMessageId}
          conversationId={selectedConversationId}
          open={showThreadView}
          onOpenChange={setShowThreadView}
        />
      )}
    </AppLayout>
  );
}
