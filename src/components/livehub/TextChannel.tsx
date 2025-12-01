import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Hash, Send, Pin, PinOff, MessageSquare, MoreVertical, Paperclip, X, Edit2, Trash2 } from 'lucide-react';
import { useLiveHubTyping } from '@/hooks/useLiveHubTyping';
import { useLiveHubUnread } from '@/hooks/useLiveHubUnread';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MessageThreadSidebar from './MessageThreadSidebar';
import MessageReactions from './MessageReactions';
import PinnedMessagesPanel from './PinnedMessagesPanel';
import FileAttachment from './FileAttachment';
import { EmojiPicker } from './EmojiPicker';
import { MentionAutocomplete } from './MentionAutocomplete';
import { MessageFormatter } from './MessageFormatter';
import { PollCreator } from './PollCreator';
import { PollMessage } from './PollMessage';

interface TextChannelProps {
  channelId: string;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_to_id: string | null;
  is_pinned: boolean | null;
  attachments: Attachment[] | null;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const TextChannel = ({ channelId }: TextChannelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelName, setChannelName] = useState('');
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { typingUsers, startTyping, stopTyping } = useLiveHubTyping(channelId);
  const { markAsRead } = useLiveHubUnread();

  useEffect(() => {
    loadChannel();
    loadMessages();
    subscribeToMessages();

    // Mark channel as read when opened
    if (user) {
      markAsRead(channelId);
    }
  }, [channelId, user, markAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChannel = async () => {
    const { data, error } = await supabase
      .from('live_channels')
      .select('name')
      .eq('id', channelId)
      .single();

    if (error) {
      console.error('Error loading channel:', error);
      return;
    }

    setChannelName(data.name);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('live_channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .is('reply_to_id', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const userMap = new Map(userData?.map(u => [u.id, u]) || []);

      const messagesWithUsers = data.map(msg => ({
        ...msg,
        attachments: msg.attachments as unknown as Attachment[] | null,
        user: userMap.get(msg.user_id)
      }));

      setMessages(messagesWithUsers);
      return;
    }

    if (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_messages',
          filter: `channel_id=eq.${channelId}`
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getThreadCount = async (messageId: string) => {
    const { count } = await supabase
      .from('live_channel_messages')
      .select('*', { count: 'exact', head: true })
      .eq('reply_to_id', messageId);

    return count || 0;
  };

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('channel-attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      toast.error('Failed to upload file');
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('channel-attachments')
      .getPublicUrl(filePath);

    return {
      name: file.name,
      url: publicUrl,
      type: file.type,
      size: file.size
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadingFiles(files);
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && uploadingFiles.length === 0) || !user) return;

    // Stop typing indicator
    stopTyping();

    // Extract mentions
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      mentions.push(match[1]);
    }

    let attachments: Attachment[] | null = null;

    if (uploadingFiles.length > 0) {
      const uploaded = await Promise.all(uploadingFiles.map(file => uploadFile(file)));
      attachments = uploaded.filter(a => a !== null) as Attachment[];

      if (attachments.length === 0 && uploadingFiles.length > 0) {
        toast.error('Failed to upload files');
        return;
      }
    }

    const { error } = await supabase
      .from('live_channel_messages')
      .insert([{
        channel_id: channelId,
        user_id: user.id,
        content: newMessage.trim(),
        attachments: attachments as any,
        mentions: mentions.length > 0 ? mentions : null,
      }]);

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return;
    }

    setNewMessage('');
    setUploadingFiles([]);
  };

  const createPoll = async (pollData: import('./PollCreator').PollData) => {
    if (!user) return;

    try {
      // Create message first
      const { data: messageData, error: messageError } = await supabase
        .from('live_channel_messages')
        .insert([{
          channel_id: channelId,
          user_id: user.id,
          content: `[POLL] ${pollData.question}`,
        }])
        .select()
        .single();

      if (messageError || !messageData) throw messageError;

      // Create poll entry
      const { error: pollError } = await (supabase
        .from('polls' as any)
        .insert({
          message_id: messageData.id,
          channel_id: channelId,
          created_by: user.id,
          question: pollData.question,
          options: pollData.options,
          poll_type: pollData.pollType,
          allow_add_options: pollData.allowAddOptions || false,
          show_results_before_vote: pollData.showResultsBeforeVote !== false,
          close_at: pollData.closeAt || null
        } as any) as any);

      if (pollError) throw pollError;

      toast.success('Poll created');
    } catch (error: any) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    const { error } = await supabase
      .from('live_channel_messages')
      .update({
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
      return;
    }

    setEditingMessageId(null);
    setEditingContent('');
    toast.success('Message edited');
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    const { error } = await supabase
      .from('live_channel_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
      return;
    }

    toast.success('Message deleted');
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);

    // Trigger typing indicator
    if (value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }

    // Check for @ mentions
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch && inputRef.current) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionAutocomplete(true);

      // Calculate position
      const rect = inputRef.current.getBoundingClientRect();
      setMentionPosition({
        top: rect.top - 200,
        left: rect.left,
      });
    } else {
      setShowMentionAutocomplete(false);
    }
  };

  const handleMentionSelect = (member: { full_name: string }) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = newMessage.slice(0, cursorPosition);
    const textAfterCursor = newMessage.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newText = `${beforeMention}@${member.full_name} ${textAfterCursor}`;
      setNewMessage(newText);
    }

    setShowMentionAutocomplete(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const togglePin = async (messageId: string, currentlyPinned: boolean) => {
    const { error } = await supabase
      .from('live_channel_messages')
      .update({ is_pinned: !currentlyPinned })
      .eq('id', messageId);

    if (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update message');
      return;
    }

    toast.success(currentlyPinned ? 'Message unpinned' : 'Message pinned');
  };

  const pinnedCount = messages.filter(m => m.is_pinned).length;

  return (
    <div className="flex-1 flex bg-background">
      <div className="flex-1 flex flex-col">
        {/* Channel Header - Fixed at top */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">{channelName}</h2>
          </div>
          {pinnedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPinnedPanel(!showPinnedPanel)}
              className="gap-2"
            >
              <Pin className="w-4 h-4" />
              {pinnedCount} {pinnedCount === 1 ? 'Pinned' : 'Pinned'}
            </Button>
          )}
        </div>

        {/* Messages - Scrollable area */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {messages.map((message) => {
              const isPoll = message.content.startsWith('[POLL]');
              let pollData = null;
              if (isPoll) {
                try {
                  pollData = JSON.parse(message.content.substring(7));
                } catch (e) {
                  console.error('Failed to parse poll data', e);
                }
              }

              return (
                <div key={message.id} className="group flex gap-3 hover:bg-muted/30 -mx-2 px-2 py-1 rounded">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={message.user?.avatar_url || undefined} />
                    <AvatarFallback>
                      {message.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">
                        {message.user?.full_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </span>
                      {message.is_pinned && (
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          <Pin className="w-3 h-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                    </div>

                    {/* Message Content - Editable or Poll */}
                    {editingMessageId === message.id ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              editMessage(message.id, editingContent);
                            }
                            if (e.key === 'Escape') {
                              setEditingMessageId(null);
                              setEditingContent('');
                            }
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => editMessage(message.id, editingContent)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditingContent('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : isPoll && pollData ? (
                      <PollMessage
                        pollId={message.id}
                        pollData={pollData}
                      />
                    ) : (
                      <>
                        <div className="text-sm break-words">
                          <MessageFormatter content={message.content} />
                        </div>
                        {(message as any).is_edited && (
                          <span className="text-xs text-muted-foreground">(edited)</span>
                        )}
                      </>
                    )}

                    {/* Attachments */}
                    {message.attachments && message.attachments.map((attachment, idx) => (
                      <FileAttachment key={idx} attachment={attachment} />
                    ))}

                    {/* Reactions */}
                    <MessageReactions messageId={message.id} />
                  </div>

                  {/* Message Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setThreadMessage(message)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Start Thread
                        </DropdownMenuItem>
                        {message.user_id === user?.id && !isPoll && (
                          <>
                            <DropdownMenuItem onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingContent(message.content);
                            }}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMessage(message.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Message
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => togglePin(message.id, message.is_pinned ?? false)}>
                          {message.is_pinned ? (
                            <>
                              <PinOff className="w-4 h-4 mr-2" />
                              Unpin Message
                            </>
                          ) : (
                            <>
                              <Pin className="w-4 h-4 mr-2" />
                              Pin Message
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          {/* Typing Indicator - Inside scroll area but at bottom */}
          {typingUsers.length > 0 && (
            <div className="pb-4">
              <TypingIndicator typingUsers={typingUsers} />
            </div>
          )}
        </ScrollArea>

        {/* File Upload Preview - Fixed above input */}
        {uploadingFiles.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-background">
            <div className="flex gap-2 flex-wrap">
              {uploadingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-muted rounded text-sm">
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => removeUploadingFile(idx)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input - Fixed at bottom */}
        <div className="p-4 border-t border-border relative bg-background">
          {showMentionAutocomplete && (
            <MentionAutocomplete
              query={mentionQuery}
              onSelect={handleMentionSelect}
              position={mentionPosition}
            />
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <PollCreator onCreate={createPoll} />

            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Message #${channelName} (supports **bold**, *italic*, \`code\`, @mentions)`}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px]"
              rows={1}
            />
            <EmojiPicker onSelect={(emoji) => setNewMessage((prev) => prev + emoji)} />
            <Button onClick={sendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Thread Sidebar */}
      {threadMessage && (
        <MessageThreadSidebar
          parentMessage={threadMessage}
          channelId={channelId}
          onClose={() => setThreadMessage(null)}
        />
      )}

      {/* Pinned Messages Panel */}
      {showPinnedPanel && (
        <PinnedMessagesPanel
          channelId={channelId}
          onClose={() => setShowPinnedPanel(false)}
        />
      )}
    </div>
  );
};

export default TextChannel;
