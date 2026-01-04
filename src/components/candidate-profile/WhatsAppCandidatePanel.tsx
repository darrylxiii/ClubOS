import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/lib/notify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Clock, CheckCheck, Sparkles } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface WhatsAppCandidatePanelProps {
  candidateId: string;
  candidatePhone?: string | null;
  candidateName?: string | null;
}

export function WhatsAppCandidatePanel({ candidateId, candidatePhone, candidateName }: WhatsAppCandidatePanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data: conversation } = useQuery({
    queryKey: ['whatsapp-candidate-conversation', candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('candidate_id', candidateId)
        .single();
      return data;
    },
    enabled: !!candidateId,
  });

  const { data: messages } = useQuery({
    queryKey: ['whatsapp-candidate-messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!conversation?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversation?.id) {
        // Create conversation first if doesn't exist
        const { data: newConversation, error: convError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            candidate_id: candidateId,
            candidate_phone: candidatePhone,
            candidate_name: candidateName,
            conversation_status: 'active',
          })
          .select()
          .single();
        
        if (convError) throw convError;
        
        const { error } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            conversationId: newConversation.id,
            messageType: 'text',
            content,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            conversationId: conversation.id,
            messageType: 'text',
            content,
          },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-candidate-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-candidate-conversation'] });
      toast({ title: 'Message sent' });
      setMessage('');
    },
    onError: () => {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    },
  });

  const lastMessage = messages?.[0];
  const hasActiveWindow = conversation?.messaging_window_expires_at 
    ? new Date(conversation.messaging_window_expires_at) > new Date()
    : false;

  if (!candidatePhone) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardContent className="p-4 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No phone number available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            WhatsApp
          </CardTitle>
          {hasActiveWindow && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 text-xs">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lastMessage && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              {lastMessage.direction === 'outbound' ? (
                <CheckCheck className="h-3 w-3 text-blue-500" />
              ) : (
                <MessageSquare className="h-3 w-3 text-green-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm line-clamp-2">{lastMessage.content}</p>
          </div>
        )}

        {conversation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {conversation.unread_count > 0 
                ? `${conversation.unread_count} unread`
                : 'No unread messages'
              }
            </span>
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              Send WhatsApp
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send WhatsApp Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{candidateName || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{candidatePhone}</p>
              </div>

              {!hasActiveWindow && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-500">24h Window Closed</p>
                    <p className="text-xs text-muted-foreground">
                      Only template messages can be sent. The candidate needs to reply to open a new window.
                    </p>
                  </div>
                </div>
              )}

              {messages && messages.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Messages</p>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {messages.slice(0, 5).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2 rounded text-xs ${
                            msg.direction === 'outbound'
                              ? 'bg-green-500/10 ml-4'
                              : 'bg-muted mr-4'
                          }`}
                        >
                          <p className="line-clamp-2">{msg.content}</p>
                          <p className="text-muted-foreground mt-1">
                            {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && message.trim()) {
                      sendMessageMutation.mutate(message);
                    }
                  }}
                />
                <Button
                  onClick={() => sendMessageMutation.mutate(message)}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" className="w-full" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
