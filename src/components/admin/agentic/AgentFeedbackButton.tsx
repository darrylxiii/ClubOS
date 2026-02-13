import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  decisionId: string;
  agentName: string;
}

export default function AgentFeedbackButton({ decisionId, agentName }: Props) {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitFeedback = async (rating: 'positive' | 'negative') => {
    if (!user?.id || loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('agent_feedback').insert({
        decision_id: decisionId,
        agent_name: agentName,
        user_id: user.id,
        rating,
      });

      if (error) throw error;
      setSubmitted(true);
      toast.success(`Feedback recorded for ${agentName}`);
    } catch (err) {
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <Check className="h-4 w-4 text-success" />;
  }

  return (
    <div className="flex gap-1 shrink-0">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={(e) => { e.stopPropagation(); submitFeedback('positive'); }}
        disabled={loading}
      >
        <ThumbsUp className="h-3 w-3 text-success" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={(e) => { e.stopPropagation(); submitFeedback('negative'); }}
        disabled={loading}
      >
        <ThumbsDown className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}
