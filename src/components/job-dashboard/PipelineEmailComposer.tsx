import { memo, useCallback } from "react";
import { EmailComposer } from "@/components/email/EmailComposer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';

interface PipelineEmailComposerProps {
  open: boolean;
  onClose: () => void;
  candidate: Record<string, unknown> | null;
  jobId: string;
  jobTitle: string;
}

export const PipelineEmailComposer = memo(({
  open,
  onClose,
  candidate,
  jobId,
  jobTitle,
}: PipelineEmailComposerProps) => {
  const { t } = useTranslation('jobs');
  const { user } = useAuth();

  const handleSent = useCallback(async (to: string, subject: string) => {
    if (!candidate || !user?.id) return;

    // Log pipeline event
    await supabase.from('pipeline_events').insert({
      application_id: candidate.id as string,
      job_id: jobId,
      event_type: 'message_sent',
      performed_by: user.id,
      metadata: { to, subject, channel: 'email' },
    });

    // Log candidate interaction
    if (candidate.candidate_id || candidate.user_id) {
      await supabase.from('candidate_interactions').insert({
        candidate_id: (candidate.candidate_id || candidate.user_id) as string,
        user_id: user.id,
        interaction_type: 'email_sent',
        metadata: { subject, job_id: jobId, application_id: candidate.id },
      });
    }
  }, [candidate, jobId, user?.id]);

  if (!candidate) return null;

  const email = candidate.email as string | undefined;
  const name = (candidate.full_name as string) || 'Candidate';

  return (
    <EmailComposer
      open={open}
      onClose={onClose}
      replyTo={email ? {
        email,
        subject: `Re: ${jobTitle} — ${name}`,
      } : undefined}
      onSent={handleSent}
    />
  );
});

PipelineEmailComposer.displayName = 'PipelineEmailComposer';
