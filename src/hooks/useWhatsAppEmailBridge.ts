import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { aiService } from '@/services/aiService';

interface EmailBridgeResult {
  candidateEmail: string | null;
  candidateName: string | null;
  draftSubject: string;
  draftBody: string;
}

export function useWhatsAppEmailBridge() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailBridgeResult | null>(null);

  const generateEmailDraft = async (
    conversationId: string,
    candidateId: string | null,
    recentMessages: Array<{ content: string | null; direction: string }>
  ): Promise<EmailBridgeResult | null> => {
    if (!candidateId) {
      notify.error('No candidate linked', { description: 'Cannot generate email without a linked candidate.' });
      return null;
    }

    setLoading(true);
    try {
      // Fetch candidate email
      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('email, full_name')
        .eq('id', candidateId)
        .single();

      const candidateData = candidate as { email: string | null; full_name: string | null } | null;

      if (candidateError || !candidateData?.email) {
        notify.error('No email found', { description: 'Candidate has no email address on file.' });
        return null;
      }

      const candidateName = candidateData.full_name || 'Candidate';
      const firstName = candidateName.split(' ')[0] || 'there';

      // Build conversation context for AI
      const conversationContext = recentMessages
        .slice(-5)
        .map(m => `${m.direction === 'outbound' ? 'You' : candidateName}: ${m.content || '[No content]'}`)
        .join('\n');

      // Generate AI draft using existing edge function
      let aiDraft: any = null;
      let aiError: Error | null = null;
      try {
        aiDraft = await aiService.generatePersonalizedFollowUp({
          candidateId,
          context: `Source: whatsapp_bridge. ${conversationContext}. Purpose: Continue WhatsApp conversation via email (24h window expired)`,
        } as any);
      } catch (err) {
        aiError = err instanceof Error ? err : new Error('AI generation failed');
      }

      // Fallback if AI fails
      const draftSubject = aiDraft?.subject || `Following up on our WhatsApp conversation`;
      const draftBody = aiDraft?.body ||
        `Hi ${firstName},\n\nI wanted to follow up on our WhatsApp conversation. I'd love to continue our discussion.\n\nLooking forward to hearing from you.\n\nBest regards`;

      // Log the email bridge event
      await supabase.from('whatsapp_conversation_events').insert({
        conversation_id: conversationId,
        event_type: 'email_bridge',
        event_data: {
          candidate_email: candidateData.email,
          generated_draft: true,
          ai_error: aiError?.message || null,
        },
      });

      const bridgeResult: EmailBridgeResult = {
        candidateEmail: candidateData.email,
        candidateName,
        draftSubject,
        draftBody,
      };

      setResult(bridgeResult);
      return bridgeResult;
    } catch (error) {
      console.error('Email bridge error:', error);
      notify.error('Failed to generate email draft');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => setResult(null);

  return {
    loading,
    result,
    generateEmailDraft,
    clearResult,
  };
}
