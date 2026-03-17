import { useState, useEffect } from 'react';
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

interface CompanyInfo {
  companyId: string;
  companyName: string;
}

const MAX_INVITES = 10;

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function TeamInviteStep({ onComplete, onBack }: TeamInviteStepProps) {
  const { user } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<'admin' | 'recruiter' | 'member'>('member');
  const [isSending, setIsSending] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('company_members')
          .select('company_id, companies (name)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data?.company_id) {
          const companies = data.companies as { name: string } | null;
          setCompany({
            companyId: data.company_id,
            companyName: companies?.name || 'Your Organization',
          });
        }
      } catch (err) {
        logger.error('Failed to load company', err instanceof Error ? err : new Error(String(err)), { componentName: 'TeamInviteStep' });
      } finally {
        setCompanyLoading(false);
      }
    })();
  }, [user]);

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

    if (!company) {
      toast.error('Company information not found. You can invite colleagues from settings later.');
      onComplete();
      return;
    }

    setIsSending(true);
    let successCount = 0;
    const failures: string[] = [];

    try {
      const inviterName = user?.user_metadata?.full_name || user?.email || 'A colleague';

      for (const invite of invites) {
        try {
          // 1. Generate invite code and insert into invite_codes
          const code = generateInviteCode();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const { error: codeError } = await supabase
            .from('invite_codes')
            .insert({
              code,
              invite_type: 'team',
              target_role: invite.role,
              company_id: company.companyId,
              created_by: user!.id,
              created_by_type: 'partner',
              expires_at: expiresAt.toISOString(),
              metadata: {
                recipient_email: invite.email,
                company_name: company.companyName,
              },
            });

          if (codeError) {
            logger.error('Failed to create invite code', codeError instanceof Error ? codeError : new Error(String(codeError)), { componentName: 'TeamInviteStep' });
            failures.push(invite.email);
            continue;
          }

          // 2. Call send-team-invite with correct single-object payload
          const { error: sendError } = await supabase.functions.invoke('send-team-invite', {
            body: {
              email: invite.email,
              inviteCode: code,
              companyId: company.companyId,
              companyName: company.companyName,
              inviterName,
              role: invite.role,
            },
          });

          if (sendError) {
            logger.error('Failed to send team invite email', sendError instanceof Error ? sendError : new Error(String(sendError)), { componentName: 'TeamInviteStep' });
            failures.push(invite.email);
            continue;
          }

          successCount++;
        } catch (err) {
          logger.error('Team invite iteration error', err instanceof Error ? err : new Error(String(err)), { componentName: 'TeamInviteStep' });
          failures.push(invite.email);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} invitation${successCount !== 1 ? 's' : ''} sent.`);
      }
      if (failures.length > 0) {
        toast.error(`Failed to send to: ${failures.join(', ')}`);
      }

      onComplete();
    } catch (err) {
      logger.error('Failed to send team invites', err instanceof Error ? err : new Error(String(err)), { componentName: 'TeamInviteStep' });
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
          {companyLoading
            ? 'Loading company details…'
            : company
              ? `Invite colleagues to ${company.companyName}. Up to ${MAX_INVITES} invitations.`
              : `Add up to ${MAX_INVITES} colleagues. You can always invite more later.`}
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
            disabled={companyLoading}
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
            disabled={invites.length >= MAX_INVITES || companyLoading}
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
          disabled={isSending || companyLoading}
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
