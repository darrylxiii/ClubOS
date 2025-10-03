import { useState, useEffect } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Search, Send, Paperclip, Phone, Video, MoreVertical, ArrowLeft, Bot, Pin, Archive, MessageSquarePlus, Filter } from 'lucide-react';
import { MessageReactions } from '@/components/messages/MessageReactions';
import { MessageEditor } from '@/components/messages/MessageEditor';
import { ThreadView } from '@/components/messages/ThreadView';
import { MessageTemplates } from '@/components/messages/MessageTemplates';
import { MessageActions } from '@/components/messages/MessageActions';
import { CreateConversationDialog } from '@/components/messages/CreateConversationDialog';
import { MessageSearch } from '@/components/messages/MessageSearch';
import { VoiceRecorder } from '@/components/messages/VoiceRecorder';
import { ReadReceipts } from '@/components/messages/ReadReceipts';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Load conversations for inbox view
  const { conversations, loading: loadingConversations } = useMessages();
  
  // Load messages for selected conversation
  const { messages, sendMessage, sending, loading: loadingMessages } = useMessages(
    selectedConversationId || undefined
  );

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  useEffect(() => {
    if (selectedConversationId && messages.length > 0) {
      loadReactionsForMessages();
    }
  }, [selectedConversationId, messages]);

  const loadReactionsForMessages = async () => {
    const messageIds = messages.map(m => m.id);
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    const grouped = (data || []).reduce((acc, reaction) => {
      if (!acc[reaction.message_id]) {
        acc[reaction.message_id] = [];
      }
      acc[reaction.message_id].push(reaction);
      return acc;
    }, {} as Record<string, any[]>);

    setReactions(grouped);
  };

  const togglePin = async () => {
    if (!selectedConversation) return;
    
    await supabase
      .from('conversations')
      .update({
        is_pinned: !selectedConversation.is_pinned,
        pinned_at: !selectedConversation.is_pinned ? new Date().toISOString() : null,
      })
      .eq('id', selectedConversationId);

    sonnerToast.success(selectedConversation.is_pinned ? 'Unpinned' : 'Pinned');
  };

  const toggleArchive = async () => {
    if (!selectedConversation) return;
    
    await supabase
      .from('conversations')
      .update({
        archived_at: selectedConversation.archived_at ? null : new Date().toISOString(),
      })
      .eq('id', selectedConversationId);

    sonnerToast.success(selectedConversation.archived_at ? 'Unarchived' : 'Archived');
    setSelectedConversationId(null);
  };

  const handleSend = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    
    await sendMessage(messageInput, attachments);
    setMessageInput('');
    setAttachments([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const getAISuggestion = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-quick-reply', {
        body: {
          conversationId: selectedConversationId,
          recentMessages: messages.slice(-5).map(m => ({
            role: m.sender_id === user?.id ? 'user' : 'assistant',
            content: m.content
          }))
        }
      });

      if (error) throw error;

      setMessageInput(data.suggestion);
      toast({
        title: 'AI Suggestion Generated',
        description: 'You can edit the message before sending',
      });
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI suggestion',
        variant: 'destructive',
      });
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.application?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.application?.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedConversationId) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-muted-foreground mt-2">
                Connect with hiring managers and club strategists
              </p>
            </div>
          </div>

          <Card className="border-2">
            <div className="p-4 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="w-full"
                variant="outline"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
              <Button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-full"
                variant="outline"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Search
              </Button>
            </div>

            {searchOpen && (
              <div className="p-4 border-t">
                <MessageSearch 
                  onSelectMessage={(convId, msgId) => {
                    setSelectedConversationId(convId);
                    setSearchOpen(false);
                  }}
                />
              </div>
            )}

            <ScrollArea className="h-[600px]">
              {loadingConversations ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading conversations...</div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                  <p className="text-muted-foreground">
                    Start messaging when your applications reach the screening stage
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className="w-full p-4 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conversation.application?.company_name} />
                          <AvatarFallback>
                            {conversation.application?.company_name?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold truncate">
                              {conversation.application?.company_name}
                            </h3>
                            {conversation.last_message_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conversation.last_message_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {conversation.application?.position}
                          </p>
                          {conversation.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message.content}
                            </p>
                          )}
                        </div>
                        {conversation.unread_count > 0 && (
                          <Badge variant="default" className="ml-2">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          <CreateConversationDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onConversationCreated={(conversationId) => {
              setSelectedConversationId(conversationId);
            }}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 max-w-7xl">
        <Card className="border-2 h-[calc(100vh-12rem)]">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversationId(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedConversation?.application?.company_name} />
                <AvatarFallback>
                  {selectedConversation?.application?.company_name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">{selectedConversation?.application?.company_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation?.application?.position}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Video className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={togglePin}>
                    <Pin className="h-4 w-4 mr-2" />
                    {selectedConversation?.is_pinned ? 'Unpin' : 'Pin'} conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem>Mute notifications</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Close conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 h-[calc(100vh-24rem)]">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                  <p className="text-muted-foreground">Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.filter(m => !m.deleted_at).map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const isEditing = editingMessageId === message.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={cn('flex gap-3 group', isOwnMessage && 'flex-row-reverse')}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender?.avatar_url || undefined} />
                        <AvatarFallback>
                          {message.sender?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[70%]">
                        {isEditing ? (
                          <MessageEditor
                            messageId={message.id}
                            currentContent={message.content}
                            onSave={() => {
                              setEditingMessageId(null);
                              // Reload messages to show the update
                              window.location.reload();
                            }}
                            onCancel={() => setEditingMessageId(null)}
                          />
                        ) : (
                          <>
                            <div
                              className={cn(
                                'rounded-lg p-3',
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted',
                                message.message_type === 'ai_generated' && 'border-2 border-primary/30'
                              )}
                            >
                              {message.message_type === 'ai_generated' && (
                                <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
                                  <Bot className="h-3 w-3" />
                                  <span>AI Generated</span>
                                </div>
                              )}
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm whitespace-pre-wrap flex-1">{message.content}</p>
                                <MessageActions
                                  message={message}
                                  isOwnMessage={isOwnMessage}
                                  onEdit={() => setEditingMessageId(message.id)}
                                  onReply={() => {
                                    setThreadParentId(message.id);
                                    setThreadOpen(true);
                                  }}
                                  onDelete={() => window.location.reload()}
                                />
                              </div>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((att) => (
                                    <div
                                      key={att.id}
                                      className="text-xs opacity-70 flex items-center gap-1"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      {att.file_name}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className={cn('text-xs mt-1 flex items-center gap-2', isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                <span>
                                  {formatDistanceToNow(new Date(message.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {message.edited_at && <span>(edited)</span>}
                                {message.is_urgent && (
                                  <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                    URGENT
                                  </Badge>
                                )}
                                {message.priority === 'high' && (
                                  <Badge variant="default" className="text-[10px] h-4 px-1">
                                    High Priority
                                  </Badge>
                                )}
                                {isOwnMessage && (
                                  <ReadReceipts
                                    messageId={message.id}
                                    senderId={message.sender_id}
                                    conversationId={selectedConversationId || ''}
                                  />
                                )}
                                {message.reply_count > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-2 text-xs"
                                    onClick={() => {
                                      setThreadParentId(message.id);
                                      setThreadOpen(true);
                                    }}
                                  >
                                    {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
                                  </Button>
                                )}
                              </div>
                            </div>
                            {reactions[message.id] && (
                              <MessageReactions
                                messageId={message.id}
                                reactions={reactions[message.id]}
                                onReactionsChange={loadReactionsForMessages}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t space-y-2">
            <div className="flex gap-2">
              <MessageTemplates
                onSelectTemplate={(content) => setMessageInput(content)}
                companyId={selectedConversation?.application?.company_name}
              />
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <Badge key={idx} variant="secondary">
                    {file.name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="min-h-[80px] resize-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </Button>
                <VoiceRecorder 
                  onRecordingComplete={async (audioBlob, duration) => {
                    // Upload audio to storage
                    const fileName = `voice-${Date.now()}.webm`;
                    const filePath = `${selectedConversationId}/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('message-attachments')
                      .upload(filePath, audioBlob);

                    if (uploadError) {
                      toast({
                        title: 'Error',
                        description: 'Failed to upload voice message',
                        variant: 'destructive',
                      });
                      return;
                    }

                    // Get public URL
                    const { data: urlData } = supabase.storage
                      .from('message-attachments')
                      .getPublicUrl(filePath);

                    // Send as message with media metadata
                    await sendMessage('[Voice Message]', [], {
                      media_type: 'voice',
                      media_url: urlData.publicUrl,
                      media_duration: duration
                    });
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={getAISuggestion}
                  title="Get AI suggestion"
                >
                  <Bot className="h-4 w-4" />
                </Button>
                <Button onClick={handleSend} disabled={sending} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <ThreadView
            parentMessageId={threadParentId}
            conversationId={selectedConversationId || ''}
            open={threadOpen}
            onOpenChange={setThreadOpen}
          />
        </Card>
      </div>
    </AppLayout>
  );
}