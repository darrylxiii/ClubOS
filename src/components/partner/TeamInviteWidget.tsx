import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Mail, Send, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CompanyRole } from '@/types/company';

interface TeamInviteWidgetProps {
  companyId: string;
  companyDomain?: string;
  canInvite: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

export function TeamInviteWidget({ companyId, companyDomain, canInvite }: TeamInviteWidgetProps) {
  const { user } = useAuth();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CompanyRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const loadPendingInvites = async () => {
    setLoadingInvites(true);
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('company_id', companyId)
        .eq('invite_type', 'organization')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invites: PendingInvite[] = (data || []).map(inv => {
        const metadata = inv.metadata as Record<string, unknown> | null;
        return {
          id: inv.id,
          email: (metadata?.email as string) || 'Unknown',
          role: inv.target_role || 'member',
          status: new Date(inv.expires_at) < new Date() 
            ? 'expired' 
            : (inv.uses_count || 0) >= (inv.max_uses || 1) 
              ? 'accepted' 
              : 'pending',
          created_at: inv.created_at,
          expires_at: inv.expires_at
        };
      });

      setPendingInvites(invites);
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    // Validate domain if restricted
    if (companyDomain) {
      const emailDomain = inviteEmail.split('@')[1];
      if (emailDomain !== companyDomain) {
        toast.error(`Only @${companyDomain} emails can be invited`);
        return;
      }
    }

    setIsInviting(true);
    try {
      // Generate invite code
      const inviteCode = `ORG-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase
        .from('invite_codes')
        .insert({
          code: inviteCode,
          created_by: user?.id || '',
          created_by_type: 'user',
          company_id: companyId,
          invite_type: 'organization',
          target_role: inviteRole,
          max_uses: 1,
          uses_count: 0,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          metadata: { email: inviteEmail }
        });

      if (error) throw error;

      // TODO: Send invite email via edge function
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteDialog(false);
      loadPendingInvites();
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      
      toast.success('Invitation revoked');
      setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast.error('Failed to revoke invitation');
    }
  };

  const getStatusBadge = (status: PendingInvite['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="gap-1 bg-emerald-500"><CheckCircle className="w-3 h-3" /> Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><XCircle className="w-3 h-3" /> Expired</Badge>;
    }
  };

  if (!canInvite) return null;

  return (
    <>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Team
              </CardTitle>
              <CardDescription>
                {companyDomain 
                  ? `Invite colleagues with @${companyDomain} emails` 
                  : 'Invite team members to your organization'}
              </CardDescription>
            </div>
            <Button onClick={() => {
              setShowInviteDialog(true);
              loadPendingInvites();
            }}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invite
            </Button>
          </div>
        </CardHeader>

        {pendingInvites.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Recent Invitations
              </Label>
              {pendingInvites.slice(0, 3).map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{invite.email}</span>
                    {getStatusBadge(invite.status)}
                  </div>
                  {invite.status === 'pending' && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => handleRevokeInvite(invite.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={companyDomain ? `colleague@${companyDomain}` : 'colleague@company.com'}
              />
              {companyDomain && (
                <p className="text-xs text-muted-foreground">
                  Only @{companyDomain} emails are allowed
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v: CompanyRole) => setInviteRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pending Invites List */}
            {pendingInvites.length > 0 && (
              <div className="pt-4 border-t">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-3 block">
                  All Invitations
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  <AnimatePresence>
                    {pendingInvites.map((invite) => (
                      <motion.div
                        key={invite.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-sm truncate">{invite.email}</span>
                          {getStatusBadge(invite.status)}
                        </div>
                        {invite.status === 'pending' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => handleRevokeInvite(invite.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
              {isInviting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
