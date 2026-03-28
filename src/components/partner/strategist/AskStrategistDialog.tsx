import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StrategistProfile } from '@/hooks/useStrategistChannel';

interface AskStrategistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategist: StrategistProfile;
  /** Optional pre-fill context (e.g. job title or candidate name) */
  contextLabel?: string;
}

export function AskStrategistDialog({
  open,
  onOpenChange,
  strategist,
  contextLabel,
}: AskStrategistDialogProps) {
  const { t } = useTranslation('partner');
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const currentPage = location.pathname;

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a conversation with the strategist
      const conversationTitle = contextLabel
        ? `Re: ${contextLabel}`
        : `Question from ${currentPage}`;

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: conversationTitle,
          status: 'active',
          created_by: user.id,
          metadata: {
            type: 'strategist_question',
            source_page: currentPage,
            context: contextLabel || null,
          },
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: conversation.id,
            user_id: user.id,
            role: 'candidate',
            notifications_enabled: true,
            is_muted: false,
          },
          {
            conversation_id: conversation.id,
            user_id: strategist.id,
            role: 'candidate',
            notifications_enabled: true,
            is_muted: false,
          },
        ]);

      if (partError) throw partError;

      // Send the message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: message.trim(),
        message_type: 'text',
      });

      if (msgError) throw msgError;

      toast.success(t('strategist.messageSent', 'Message sent to your strategist'));
      setMessage('');
      onOpenChange(false);
    } catch (err) {
      console.error('[AskStrategistDialog] Error sending:', err);
      toast.error(t('strategist.messageError', 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('strategist.askTitle', 'Ask Your Strategist')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{t('strategist.sendingFrom', 'Sending from:')}</span>
            <Badge variant="outline" className="text-[10px]">
              {contextLabel || currentPage}
            </Badge>
          </div>

          {/* Recipient info */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/20">
            <span className="text-xs text-muted-foreground">
              {t('strategist.to', 'To:')}
            </span>
            <span className="text-sm font-medium">{strategist.full_name}</span>
            {strategist.title && (
              <span className="text-xs text-muted-foreground">
                - {strategist.title}
              </span>
            )}
          </div>

          {/* Message input */}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t(
              'strategist.askPlaceholder',
              'Ask a question, request feedback, or share an update...'
            )}
            className="min-h-[120px] resize-none"
            disabled={sending}
            autoFocus
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t('strategist.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!message.trim() || sending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sending
                ? t('strategist.sending', 'Sending...')
                : t('strategist.send', 'Send')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
