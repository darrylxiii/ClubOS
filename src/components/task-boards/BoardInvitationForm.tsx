import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BoardMemberRole } from '@/types/taskBoard';
import { toast } from 'sonner';
import { Mail, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BoardInvitationFormProps {
  boardId: string;
}

export function BoardInvitationForm({ boardId }: BoardInvitationFormProps) {
  const { user } = useAuth();
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [role, setRole] = useState<BoardMemberRole>('editor');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addEmail = () => {
    const trimmedEmail = currentEmail.trim().toLowerCase();
    if (!trimmedEmail) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      toast.error('Email already added');
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setCurrentEmail('');
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emails.length === 0) {
      toast.error('Please add at least one email address');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create invitations for each email
      const invitations = emails.map(email => ({
        board_id: boardId,
        invitee_email: email,
        role,
        invited_by: user!.id,
        message: message.trim() || null,
      }));

      const { error } = await supabase
        .from('task_board_invitations')
        .insert(invitations);

      if (error) throw error;

      toast.success(`${emails.length} invitation${emails.length > 1 ? 's' : ''} sent`);
      
      // Reset form
      setEmails([]);
      setCurrentEmail('');
      setMessage('');
      setRole('editor');
    } catch (error: unknown) {
      console.error('Failed to send invitations:', error);
      if (error instanceof Error && error.message?.includes('duplicate')) {
        toast.error('Some emails already have pending invitations');
      } else {
        toast.error('Failed to send invitations');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Addresses</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="colleague@example.com"
          />
          <Button type="button" onClick={addEmail} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {emails.map((email) => (
              <Badge key={email} variant="secondary" className="gap-1">
                {email}
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as BoardMemberRole)}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin - Can manage board and members</SelectItem>
            <SelectItem value="editor">Editor - Can create and edit tasks</SelectItem>
            <SelectItem value="viewer">Viewer - Can only view tasks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Personal Message (optional)</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a personal note to your invitation..."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isSubmitting || emails.length === 0} className="w-full">
        <Mail className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Sending...' : `Send ${emails.length || ''} Invitation${emails.length !== 1 ? 's' : ''}`}
      </Button>
    </form>
  );
}
