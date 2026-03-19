import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle, Copy, MessageCircle, Sparkles, Crown } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { z } from "zod";
import { logger } from "@/lib/logger";

const emailSchema = z.string().trim().email().max(254);

interface InviteSuccess {
  email: string;
  recipientName: string;
  code: string;
  role: string;
}

interface SendInviteTabProps {
  onOpenProvisioning?: (prefill?: { email?: string; fullName?: string; companyName?: string }) => void;
}

export function SendInviteTab({ onOpenProvisioning }: SendInviteTabProps = {}) {
  const [recipientName, setRecipientName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<InviteSuccess | null>(null);
  const { currentRole } = useRole();
  const queryClient = useQueryClient();

  const handleSend = async () => {
    // Validate email
    try {
      emailSchema.parse(email.trim());
    } catch {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!recipientName.trim()) {
      toast.error("Please enter the recipient's name.");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Duplicate invite detection
      const { data: existing } = await supabase
        .from('invite_codes')
        .select('id, code, expires_at')
        .eq('is_active', true)
        .filter('metadata->>email', 'eq', email.trim().toLowerCase())
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        toast.warning(`An active invite already exists for ${email.trim()}. Check your history.`);
        setSending(false);
        return;
      }

      // Generate invite code
      const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Determine created_by_type based on actual role
      const createdByType = currentRole === 'admin' ? 'admin' : currentRole === 'strategist' ? 'strategist' : 'member';

      // Insert invite code
      const { error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code,
          created_by: user.id,
          created_by_type: createdByType,
          expires_at: expiresAt,
          is_active: true,
          invite_type: role === 'partner' ? 'partner' : 'team',
          target_role: role,
          max_uses: 1,
          uses_count: 0,
          metadata: {
            email: email.trim().toLowerCase(),
            recipient_name: recipientName.trim(),
            company_name: companyName.trim() || null,
            custom_message: message.trim() || null
          }
        });

      if (insertError) throw insertError;

      // Get user profile for inviter name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Get user's company
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id, companies(id, name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const memberCompanyName = (membership?.companies as { name?: string })?.name || 'The Quantum Club';
      const companyId = membership?.company_id || undefined;

      // Send email via edge function
      const { error: sendError } = await supabase.functions.invoke('send-team-invite', {
        body: {
          email: email.trim(),
          inviteCode: code,
          companyId,
          companyName: companyName.trim() || memberCompanyName,
          inviterName: profile?.full_name || 'A team member',
          role,
          recipientName: recipientName.trim(),
          customMessage: message.trim() || undefined,
        }
      });

      if (sendError) {
        toast.warning('Invite created but email delivery failed. Share the code manually.');
      } else {
        toast.success(`Invitation sent to ${recipientName.trim()}`);
      }

      // Fire confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#C9A24E', '#F5F4EF', '#0E0E10'],
      });

      setSuccess({
        email: email.trim(),
        recipientName: recipientName.trim(),
        code,
        role,
      });

      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
      queryClient.invalidateQueries({ queryKey: ['invite-analytics'] });

      // Reset form
      setRecipientName("");
      setEmail("");
      setCompanyName("");
      setMessage("");
      setRole("member");
    } catch (error) {
      logger.error('Send invite error', error instanceof Error ? error : new Error(String(error)), { componentName: 'SendInviteTab' });
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const siteUrl = window.location.origin;
    navigator.clipboard.writeText(`${siteUrl}/auth?invite=${code}`);
    toast.success('Invite link copied to clipboard');
  };

  const shareWhatsApp = (inv: InviteSuccess) => {
    const siteUrl = window.location.origin;
    const text = encodeURIComponent(
      `Hi ${inv.recipientName}, you've been invited to join The Quantum Club as a ${inv.role}. Use this link to get started: ${siteUrl}/auth?invite=${inv.code}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Invitation sent to {success.recipientName}</span>
          </div>
          <p className="text-sm text-muted-foreground">{success.email} · {success.role}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyInviteLink(success.code)}
              className="gap-2"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Invite Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareWhatsApp(success)}
              className="gap-2"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Share via WhatsApp
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-name">Full Name *</Label>
          <Input
            id="invite-name"
            type="text"
            placeholder="Jane Smith"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-email">Email Address *</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {role === 'partner' && (
          <div className="space-y-2">
            <Label htmlFor="invite-company">Company Name</Label>
            <Input
              id="invite-company"
              type="text"
              placeholder="Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
        )}
      </div>

      {role === 'partner' && onOpenProvisioning && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Recommended: Full Provisioning</p>
              <p className="text-xs text-muted-foreground">
                Pre-configure their account, company, and access so they can log in immediately with everything ready. No verification steps needed.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onOpenProvisioning({
              email: email.trim() || undefined,
              fullName: recipientName.trim() || undefined,
              companyName: companyName.trim() || undefined,
            })}
            className="gap-2"
          >
            <Crown className="h-3.5 w-3.5" />
            Use Full Provisioning
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="invite-message">Personal Message (Optional)</Label>
        <Textarea
          id="invite-message"
          placeholder="Add a personal note to the invitation…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={!email.trim() || !recipientName.trim() || sending}
        className="w-full sm:w-auto"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Invitation
          </>
        )}
      </Button>
    </div>
  );
}
