import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Sparkles, Copy, Send, Loader2, MessageSquare } from 'lucide-react';
import { useWhatsAppEmailBridge } from '@/hooks/useWhatsAppEmailBridge';
import { notify } from '@/lib/notify';
import type { WhatsAppMessage } from '@/hooks/useWhatsAppMessages';

interface WhatsAppEmailBridgeProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  candidateId: string | null;
  candidatePhone: string;
  messages: WhatsAppMessage[];
  onSendEmail?: (to: string, subject: string, body: string) => void;
}

export function WhatsAppEmailBridge({
  open,
  onClose,
  conversationId,
  candidateId,
  candidatePhone,
  messages,
  onSendEmail,
}: WhatsAppEmailBridgeProps) {
  const { loading, result, generateEmailDraft, clearResult } = useWhatsAppEmailBridge();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open && candidateId) {
      const recentMessages = messages.slice(-5).map(m => ({
        content: m.content,
        direction: m.direction,
      }));
      generateEmailDraft(conversationId, candidateId, recentMessages);
    }
    return () => {
      if (!open) {
        clearResult();
        setSubject('');
        setBody('');
      }
    };
  }, [open, conversationId, candidateId]);

  useEffect(() => {
    if (result) {
      setSubject(result.draftSubject);
      setBody(result.draftBody);
    }
  }, [result]);

  const handleCopyToClipboard = () => {
    const fullContent = `To: ${result?.candidateEmail}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullContent);
    notify.success('Copied to clipboard');
  };

  const handleSendEmail = () => {
    if (result?.candidateEmail && onSendEmail) {
      onSendEmail(result.candidateEmail, subject, body);
      onClose();
    }
  };

  // Get last 5 messages for context display
  const recentMessages = messages.slice(-5);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Continue via Email
          </DialogTitle>
          <DialogDescription>
            The 24h WhatsApp window has expired. Continue this conversation via email.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating AI email draft...</p>
          </div>
        ) : !result?.candidateEmail ? (
          <div className="py-8 text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No email address found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This candidate doesn't have an email address on file.
            </p>
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Conversation Context */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  WhatsApp Conversation Context
                </span>
              </div>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {recentMessages.map((msg, i) => (
                    <p key={i} className="text-xs">
                      <span className="font-medium">
                        {msg.direction === 'outbound' ? 'You: ' : `${result.candidateName}: `}
                      </span>
                      <span className="text-muted-foreground">
                        {msg.content?.slice(0, 100)}{msg.content && msg.content.length > 100 ? '...' : ''}
                      </span>
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Email Form */}
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <Label className="w-12 text-right text-muted-foreground">To:</Label>
                <div className="flex-1 flex items-center gap-2">
                  <Input value={result.candidateEmail} disabled className="bg-muted/50" />
                  <Badge variant="secondary">{result.candidateName}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="w-12 text-right text-muted-foreground">Subject:</Label>
                <div className="flex-1 relative">
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                  <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-xs gap-1" variant="outline">
                    <Sparkles className="w-3 h-3" />
                    AI
                  </Badge>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-muted-foreground">Message</Label>
                  <Badge className="text-xs gap-1" variant="outline">
                    <Sparkles className="w-3 h-3" />
                    AI Generated Draft
                  </Badge>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Compose your email..."
                  className="min-h-[200px] resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={handleCopyToClipboard}>
                <Copy className="w-4 h-4 mr-2" />
                Copy All
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                {onSendEmail ? (
                  <Button onClick={handleSendEmail} disabled={!subject || !body}>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      window.location.href = `mailto:${result.candidateEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Open in Mail App
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
