import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle } from "lucide-react";

export function SendInviteTab() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate invite code
      const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Insert invite code
      const { error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code,
          created_by: user.id,
          created_by_type: 'member',
          expires_at: expiresAt,
          is_active: true,
          invite_type: 'team',
          target_role: role,
          max_uses: 1,
          uses_count: 0,
          metadata: { 
            email: email.trim(),
            custom_message: message || null
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
        .single();

      const companyName = (membership?.companies as any)?.name || 'The Quantum Club';
      const companyId = membership?.company_id || '';

      // Send email via edge function
      const { error: sendError } = await supabase.functions.invoke('send-team-invite', {
        body: {
          email: email.trim(),
          inviteCode: code,
          companyId,
          companyName,
          inviterName: profile?.full_name || 'A team member',
          role,
        }
      });

      if (sendError) {
        // Code was created but email failed — still useful
        toast.warning('Invite created but email delivery failed. Share the code manually.');
      } else {
        toast.success(`Invitation sent to ${email.trim()}`);
      }

      setLastSent(email.trim());
      setEmail("");
      setMessage("");
    } catch (error) {
      console.error('Send invite error:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {lastSent && (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
          <span>Invitation sent to <strong>{lastSent}</strong></span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email Address</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-message">Personal Message (Optional)</Label>
        <Textarea
          id="invite-message"
          placeholder="Add a personal note to the invitation…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={!email.trim() || sending}
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
