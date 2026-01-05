import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Star, ThumbsUp, ThumbsDown, Minus, Send, Loader2 } from 'lucide-react';

const scorecardSchema = z.object({
  overall_rating: z.number().min(1).max(5),
  technical_score: z.number().min(1).max(5),
  cultural_fit_score: z.number().min(1).max(5),
  communication_score: z.number().min(1).max(5),
  strengths: z.string().min(10, 'Please provide at least a brief description'),
  concerns: z.string().optional(),
  recommendation: z.enum(['strong_yes', 'yes', 'neutral', 'no', 'strong_no']),
  notes: z.string().optional(),
});

type ScorecardFormData = z.infer<typeof scorecardSchema>;

interface ScorecardSubmissionFormProps {
  applicationId: string;
  meetingId?: string;
  stageIndex?: number;
  onSubmitSuccess?: () => void;
  prefillData?: Partial<ScorecardFormData>;
}

const recommendationOptions = [
  { value: 'strong_yes', label: 'Strong Yes', icon: ThumbsUp, color: 'text-green-600' },
  { value: 'yes', label: 'Yes', icon: ThumbsUp, color: 'text-green-500' },
  { value: 'neutral', label: 'Neutral', icon: Minus, color: 'text-muted-foreground' },
  { value: 'no', label: 'No', icon: ThumbsDown, color: 'text-red-500' },
  { value: 'strong_no', label: 'Strong No', icon: ThumbsDown, color: 'text-red-600' },
] as const;

function ScoreSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= value ? 'fill-primary text-primary' : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={5}
        step={1}
        className="w-full"
      />
    </div>
  );
}

export function ScorecardSubmissionForm({
  applicationId,
  meetingId,
  stageIndex = 0,
  onSubmitSuccess,
  prefillData,
}: ScorecardSubmissionFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ScorecardFormData>({
    resolver: zodResolver(scorecardSchema),
    defaultValues: {
      overall_rating: prefillData?.overall_rating ?? 3,
      technical_score: prefillData?.technical_score ?? 3,
      cultural_fit_score: prefillData?.cultural_fit_score ?? 3,
      communication_score: prefillData?.communication_score ?? 3,
      strengths: prefillData?.strengths ?? '',
      concerns: prefillData?.concerns ?? '',
      recommendation: prefillData?.recommendation ?? 'neutral',
      notes: prefillData?.notes ?? '',
    },
  });

  async function onSubmit(data: ScorecardFormData) {
    if (!user) {
      toast.error('Please sign in to submit a scorecard.');
      return;
    }

    if (!applicationId) {
      toast.error('Application ID is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('candidate_scorecards').insert({
        application_id: applicationId,
        evaluator_id: user.id,
        stage_index: stageIndex,
        overall_rating: data.overall_rating,
        technical_score: data.technical_score,
        cultural_fit_score: data.cultural_fit_score,
        communication_score: data.communication_score,
        strengths: data.strengths,
        concerns: data.concerns || null,
        recommendation: data.recommendation,
        notes: data.notes || null,
      });

      if (error) throw error;

      // Update meeting_evaluators if meeting is linked
      if (meetingId) {
        await supabase
          .from('meeting_evaluators')
          .update({ scorecard_submitted: true })
          .eq('meeting_id', meetingId)
          .eq('evaluator_id', user.id);
      }

      toast.success('Scorecard submitted successfully.');
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Failed to submit scorecard:', error);
      toast.error('Unable to submit scorecard. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Interview Scorecard
        </CardTitle>
        <CardDescription>
          Evaluate the candidate based on your interview observations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="overall_rating"
                render={({ field }) => (
                  <FormItem>
                    <ScoreSlider
                      label="Overall Score"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="technical_score"
                render={({ field }) => (
                  <FormItem>
                    <ScoreSlider
                      label="Technical Skills"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cultural_fit_score"
                render={({ field }) => (
                  <FormItem>
                    <ScoreSlider
                      label="Cultural Fit"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="communication_score"
                render={({ field }) => (
                  <FormItem>
                    <ScoreSlider
                      label="Communication"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recommendation */}
            <FormField
              control={form.control}
              name="recommendation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recommendation</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-wrap gap-2"
                    >
                      {recommendationOptions.map((option) => (
                        <div key={option.value}>
                          <RadioGroupItem
                            value={option.value}
                            id={option.value}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={option.value}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors
                              peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                              hover:bg-muted`}
                          >
                            <option.icon className={`h-4 w-4 ${option.color}`} />
                            <span className="text-sm">{option.label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Strengths */}
            <FormField
              control={form.control}
              name="strengths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strengths</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What impressed you about this candidate?"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Key strengths observed during the interview
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Concerns */}
            <FormField
              control={form.control}
              name="concerns"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concerns (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any areas of concern or development needs?"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any other observations or context..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Scorecard
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
