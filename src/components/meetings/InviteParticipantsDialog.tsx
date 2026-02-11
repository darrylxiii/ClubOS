import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserPlus, X, Mail, Loader2, Check, AlertCircle } from 'lucide-react';
import { sendInvitations } from '@/services/meetingInvitationService';
import { toast } from 'sonner';

interface InviteParticipantsDialogProps {
  meetingId: string;
  meetingTitle: string;
  trigger?: React.ReactNode;
}

interface EmailEntry {
  email: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

export function InviteParticipantsDialog({
  meetingId,
  meetingTitle,
  trigger,
}: InviteParticipantsDialogProps) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;

    // Handle comma-separated emails
    const newEmails = trimmed.split(',').map(e => e.trim()).filter(e => e);
    
    const toAdd: EmailEntry[] = [];
    for (const email of newEmails) {
      if (!validateEmail(email)) {
        toast.error(`Invalid email: ${email}`);
        continue;
      }
      if (emails.some(e => e.email === email)) {
        toast.error(`${email} already added`);
        continue;
      }
      toAdd.push({ email, status: 'pending' });
    }

    if (toAdd.length > 0) {
      setEmails(prev => [...prev, ...toAdd]);
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setEmails(prev => prev.filter(e => e.email !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSendInvitations = async () => {
    if (emails.length === 0) {
      toast.error('Add at least one email address');
      return;
    }

    setSending(true);
    setEmails(prev => prev.map(e => ({ ...e, status: 'sending' })));

    try {
      const participants = emails.map(e => ({
        email: e.email,
        role: 'participant' as const,
      }));

      const result = await sendInvitations(meetingId, participants, customMessage || undefined);

      if (result.success) {
        setEmails(prev => prev.map(e => ({ ...e, status: 'sent' })));
        toast.success(`${emails.length} invitation${emails.length > 1 ? 's' : ''} sent`);
        
        // Close dialog after short delay to show success state
        setTimeout(() => {
          setOpen(false);
          setEmails([]);
          setCustomMessage('');
        }, 1000);
      } else {
        // Mark which ones failed
        const errorEmails = new Set(
          result.errors
            .map(err => {
              const match = err.match(/for (.+?)(?::|$)/);
              return match ? match[1] : null;
            })
            .filter(Boolean)
        );

        setEmails(prev =>
          prev.map(e => ({
            ...e,
            status: errorEmails.has(e.email) ? 'error' : 'sent',
            error: errorEmails.has(e.email) ? 'Failed to send' : undefined,
          }))
        );

        if (result.errors.length > 0) {
          toast.error(`Some invitations failed: ${result.errors[0]}`);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to send invitations:', error);
      setEmails(prev => prev.map(e => ({ ...e, status: 'error', error: 'Failed to send' })));
      toast.error('Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: EmailEntry['status']) => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'sent':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invite Participants
          </DialogTitle>
          <DialogDescription>
            Send email invitations to join "{meetingTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Email Addresses</Label>
            <div className="flex gap-2">
              <Input
                id="emails"
                placeholder="Enter email and press Enter"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addEmail}
                disabled={sending}
              />
              <Button type="button" onClick={addEmail} disabled={sending} variant="secondary">
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>

          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emails.map((entry) => (
                <Badge
                  key={entry.email}
                  variant={entry.status === 'error' ? 'destructive' : 'secondary'}
                  className="gap-1 pr-1"
                >
                  {getStatusIcon(entry.status)}
                  {entry.email}
                  {entry.status === 'pending' && (
                    <button
                      onClick={() => removeEmail(entry.email)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                      disabled={sending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal note to your invitation..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              disabled={sending}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSendInvitations} disabled={sending || emails.length === 0}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send {emails.length > 0 ? `${emails.length} Invitation${emails.length > 1 ? 's' : ''}` : 'Invitations'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
