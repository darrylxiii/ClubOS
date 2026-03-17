import { useState } from 'react';
import { motion } from '@/lib/motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, Users, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TeamInviteStepProps {
  onComplete: () => void;
  onBack: () => void;
}

interface PendingInvite {
  email: string;
  role: 'admin' | 'recruiter' | 'member';
}

const MAX_INVITES = 10;

export function TeamInviteStep({ onComplete, onBack }: TeamInviteStepProps) {
  const { user } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<'admin' | 'recruiter' | 'member'>('member');
  const [isSending, setIsSending] = useState(false);

  const addInvite = () => {
    const trimmed = currentEmail.trim().toLowerCase();
    if (!trimmed) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (invites.some((i) => i.email === trimmed)) {
      toast.error('Email already added.');
      return;
    }

    if (invites.length >= MAX_INVITES) {
      toast.error(`You can invite up to ${MAX_INVITES} colleagues.`);
      return;
    }

    setInvites([...invites, { email: trimmed, role: currentRole }]);
    setCurrentEmail('');
  };

  const removeInvite = (email: string) => {
    setInvites(invites.filter((i) => i.email !== email));
  };

  const handleSendInvites = async () => {
    if (invites.length === 0) {
      onComplete();
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-team-invite', {
        body: {
          invites: invites.map((i) => ({
            email: i.email,
            role: i.role,
          })),
        },
      });

      if (error) throw error;

      const successCount = data?.sent ?? invites.length;
      toast.success(`${successCount} invitation${successCount !== 1 ? 's' : ''} sent.`);
      onComplete();
    } catch (err) {
      logger.error(
        'Failed to send team invites',
        err instanceof Error ? err : new Error(String(err)),
        { componentName: 'TeamInviteStep' }
      );
      toast.error('Failed to send invitations. You can do this later from settings.');
    } finally {
      setIsSending(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    recruiter: 'Recruiter',
    member: 'Member',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <Users className="h-4 w-4" />
          Invite your team (optional)
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Add up to {MAX_INVITES} colleagues. You can always invite more later.
        </p>
      </div>

      {/* Add invite form */}
      <div className="space-y-3">
        <Label htmlFor="team-email">Email Address</Label>
        <div className="flex gap-2">
          <Input
            id="team-email"
            type="email"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInvite();
              }
            }}
            placeholder="colleague@company.com"
            className="h-11 rounded-xl flex-1"
          />
          <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as 'admin' | 'recruiter' | 'member')}>
            <SelectTrigger className="w-[130px] h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={addInvite}
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
            disabled={invites.length >= MAX_INVITES}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Invite list */}
      {invites.length > 0 && (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.email}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{invite.email}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {roleLabels[invite.role]}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => removeInvite(invite.email)}
                className="p-1 hover:text-destructive transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-right">
            {invites.length}/{MAX_INVITES} invitations
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onBack} className="h-12 px-4 rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button
          variant="ghost"
          onClick={onComplete}
          disabled={isSending}
          className="flex-1 h-12 rounded-xl"
        >
          Skip for now
        </Button>
        <RainbowButton
          onClick={handleSendInvites}
          disabled={isSending}
          className="flex-1 h-12 rounded-xl font-semibold"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : invites.length > 0 ? (
            <>
              Send {invites.length} Invite{invites.length !== 1 ? 's' : ''}{' '}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </RainbowButton>
      </div>
    </motion.div>
  );
}
