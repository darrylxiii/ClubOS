import { useState } from 'react';
import { ThumbsUp, ThumbsDown, AlertTriangle, DollarSign, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MLFeedbackButtonsProps {
  predictionId: string;
  candidateId: string;
  jobId: string;
  compact?: boolean;
  onFeedbackSubmitted?: () => void;
}

export function MLFeedbackButtons({
  predictionId,
  candidateId,
  jobId,
  compact = false,
  onFeedbackSubmitted,
}: MLFeedbackButtonsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { toast } = useToast();

  const submitFeedback = async (
    feedbackType: 'great_match' | 'not_relevant' | 'wrong_skills' | 'wrong_culture' | 'wrong_salary',
    feedbackScore?: number
  ) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user role from user_roles table
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const role = userRole?.role || 'candidate';

      const { error } = await (supabase as any)
        .from('ml_feedback')
        .insert({
          prediction_id: predictionId,
          user_id: user.id,
          user_role: role,
          feedback_type: feedbackType,
          feedback_score: feedbackScore,
          metadata: {
            candidate_id: candidateId,
            job_id: jobId,
          },
        });

      if (error) throw error;

      setFeedback(feedbackType);

      toast({
        title: 'Feedback recorded',
        description: 'Thank you! Your feedback helps improve our matching.',
      });

      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <ThumbsUp className="h-3 w-3" />
        Feedback recorded
      </div>
    );
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isSubmitting}>
            Rate Match
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>How's this match?</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => submitFeedback('great_match', 5)}>
            <ThumbsUp className="mr-2 h-4 w-4 text-success" />
            Great match
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => submitFeedback('wrong_skills')}>
            <AlertTriangle className="mr-2 h-4 w-4 text-warning" />
            Wrong skills
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => submitFeedback('wrong_salary')}>
            <DollarSign className="mr-2 h-4 w-4 text-warning" />
            Salary mismatch
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => submitFeedback('wrong_culture')}>
            <MapPin className="mr-2 h-4 w-4 text-warning" />
            Culture/location issue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => submitFeedback('not_relevant', 1)}>
            <ThumbsDown className="mr-2 h-4 w-4 text-destructive" />
            Not relevant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => submitFeedback('great_match', 5)}
        disabled={isSubmitting}
      >
        <ThumbsUp className="h-3 w-3 mr-1" />
        Great Match
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isSubmitting}>
            <ThumbsDown className="h-3 w-3 mr-1" />
            Not Good
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => submitFeedback('wrong_skills')}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Wrong skills
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => submitFeedback('wrong_salary')}>
            <DollarSign className="mr-2 h-4 w-4" />
            Salary mismatch
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => submitFeedback('wrong_culture')}>
            <MapPin className="mr-2 h-4 w-4" />
            Culture/location
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
