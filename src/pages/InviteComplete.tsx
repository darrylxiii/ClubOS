import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function InviteComplete() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [merging, setMerging] = useState(true);

  useEffect(() => {
    completeMerge();
  }, []);

  const completeMerge = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Authentication failed');
        navigate('/');
        return;
      }

      // Validate email matches invitation
      const expectedEmail = sessionStorage.getItem('expected_invitation_email');
      if (expectedEmail && user.email !== expectedEmail) {
        toast.error('This invitation was sent to a different email address');
        await supabase.auth.signOut();
        navigate('/');
        return;
      }
      sessionStorage.removeItem('expected_invitation_email');

      const { data: invite, error: inviteError } = await supabase
        .from('candidate_invitations')
        .select('*')
        .eq('invitation_token', token)
        .single();

      if (inviteError || !invite) {
        toast.error('Invalid invitation');
        navigate('/');
        return;
      }

      const { error: mergeError } = await supabase.functions.invoke('merge-candidate-profile', {
        body: {
          candidateId: invite.candidate_id,
          userId: user.id,
          invitationToken: token
        }
      });

      if (mergeError) throw mergeError;

      toast.success('Welcome to The Quantum Club!');
      
      setTimeout(() => {
        navigate('/home');
      }, 2000);

    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to complete registration');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {merging ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium">Setting up your account...</p>
            <p className="text-sm text-muted-foreground">This will only take a moment</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <p className="text-lg font-medium">All set! Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}
