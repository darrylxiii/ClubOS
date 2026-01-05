import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Loader2, CheckCircle2, Star } from "lucide-react";

interface SurveyQuestion {
  id: string;
  question: string;
  type: 'text' | 'rating' | 'choice';
  options?: string[];
  required?: boolean;
}

interface WaitingRoomSurveyProps {
  meetingId: string;
  questions: SurveyQuestion[];
  participantId?: string;
  participantName?: string;
  onComplete?: () => void;
}

export function WaitingRoomSurvey({
  meetingId,
  questions,
  participantId,
  participantName,
  onComplete
}: WaitingRoomSurveyProps) {
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateResponse = (questionId: string, value: string | number) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const isComplete = () => {
    return questions
      .filter(q => q.required)
      .every(q => responses[q.id] !== undefined && responses[q.id] !== '');
  };

  const handleSubmit = async () => {
    if (!isComplete()) {
      toast.error('Please complete all required questions');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('meeting_waiting_room_responses' as any)
        .insert({
          meeting_id: meetingId,
          participant_id: participantId,
          participant_name: participantName,
          responses
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Survey submitted');
      onComplete?.();
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center bg-primary/5 border-primary/20">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
        <p className="font-medium">Thank you for your responses</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your host will see these when the meeting begins
        </p>
      </Card>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-primary" />
          Pre-Meeting Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {questions.map((question, idx) => (
          <div key={question.id} className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="font-medium">
                {idx + 1}. {question.question}
              </span>
              {question.required && (
                <span className="text-destructive">*</span>
              )}
            </Label>

            {question.type === 'text' && (
              <Textarea
                value={(responses[question.id] as string) || ''}
                onChange={e => updateResponse(question.id, e.target.value)}
                placeholder="Type your answer..."
                rows={2}
              />
            )}

            {question.type === 'rating' && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => updateResponse(question.id, rating)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        (responses[question.id] as number) >= rating
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}

            {question.type === 'choice' && question.options && (
              <RadioGroup
                value={(responses[question.id] as string) || ''}
                onValueChange={value => updateResponse(question.id, value)}
              >
                {question.options.map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                    <Label htmlFor={`${question.id}-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        ))}

        <Button 
          onClick={handleSubmit} 
          disabled={submitting || !isComplete()}
          className="w-full"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit Responses
        </Button>
      </CardContent>
    </Card>
  );
}
