import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThumbsUp, ThumbsDown, Minus, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InterviewFeedbackDialogProps {
  booking: any;
  application: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

export const InterviewFeedbackDialog = ({
  booking,
  application,
  open,
  onOpenChange,
  onSubmitted,
}: InterviewFeedbackDialogProps) => {
  const { t } = useTranslation('partner');
  const [recommendation, setRecommendation] = useState<string>('');
  const [overallRating, setOverallRating] = useState<number>(3);
  const [technicalScore, setTechnicalScore] = useState<number[]>([5]);
  const [communicationScore, setCommunicationScore] = useState<number[]>([5]);
  const [cultureFitScore, setCultureFitScore] = useState<number[]>([5]);
  const [strengths, setStrengths] = useState<string[]>(['']);
  const [concerns, setConcerns] = useState<string[]>(['']);
  const [detailedNotes, setDetailedNotes] = useState('');
  const [keyObservations, setKeyObservations] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  const handleAddField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, '']);
  };

  const handleRemoveField = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateField = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleSubmit = async () => {
    if (!recommendation) {
      toast.error(t('interviewFeedbackDialog.toast.pleaseSelectARecommendation'));
      return;
    }

    setSubmitting(true);
    try {
      // Get current user's company member ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: member } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!member) throw new Error('Company member not found');

      // Submit feedback
      const { error: feedbackError } = await supabase.from('interview_feedback').insert({
        booking_id: booking.id,
        application_id: application.id,
        interviewer_id: member.id,
        interview_stage_index: booking.interview_stage_index,
        overall_rating: overallRating,
        technical_score: technicalScore[0],
        communication_score: communicationScore[0],
        culture_fit_score: cultureFitScore[0],
        recommendation,
        strengths: strengths.filter((s) => s.trim()),
        concerns: concerns.filter((c) => c.trim()),
        detailed_notes: detailedNotes,
        key_observations: keyObservations.filter((o) => o.trim()),
      });

      if (feedbackError) throw feedbackError;

      // Update booking feedback status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ feedback_submitted_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      toast.success(t('interviewFeedbackDialog.toast.feedbackSubmittedSuccessfully'));
      onSubmitted();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error submitting feedback:', error);
      toast.error(error instanceof Error ? error.message : t('partner.interviewfeedbackdialog.failedToSubmitFeedback', 'Failed to submit feedback'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('interviewFeedbackDialog.dialogTitle')}</DialogTitle>
          <DialogDescription>
            Provide your assessment for {application.candidate_full_name || 'this candidate'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Recommendation */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t('interviewFeedbackDialog.label.recommendation')}</Label>
            <RadioGroup value={recommendation} onValueChange={setRecommendation}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="strong_yes" id="strong_yes" />
                <label htmlFor="strong_yes" className="flex items-center gap-2 cursor-pointer">
                  <ThumbsUp className="w-4 h-4 text-green-500" />
                  <span>{t('interviewFeedbackDialog.strongYesExceptionalCandidate')}</span>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <label htmlFor="yes" className="flex items-center gap-2 cursor-pointer">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{t('interviewFeedbackDialog.yesGoodFitRecommendToProceed')}</span>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maybe" id="maybe" />
                <label htmlFor="maybe" className="flex items-center gap-2 cursor-pointer">
                  <Minus className="w-4 h-4 text-yellow-500" />
                  <span>{t('interviewFeedbackDialog.maybeHasPotentialButConcernsExist')}</span>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <label htmlFor="no" className="flex items-center gap-2 cursor-pointer">
                  <ThumbsDown className="w-4 h-4" />
                  <span>{t('interviewFeedbackDialog.noNotTheRightFit')}</span>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="strong_no" id="strong_no" />
                <label htmlFor="strong_no" className="flex items-center gap-2 cursor-pointer">
                  <ThumbsDown className="w-4 h-4 text-red-500" />
                  <span>{t('interviewFeedbackDialog.strongNoDefinitelyNotSuitable')}</span>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Overall Rating */}
          <div className="space-y-2">
            <Label>{t('partner.interviewfeedbackdialog.overallRating15', 'Overall Rating (1-5)')}</Label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  variant={overallRating === rating ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOverallRating(rating)}
                  className="w-12"
                >
                  {rating}
                  <Star
                    className={`w-3 h-3 ml-1 ${
                      overallRating >= rating ? 'fill-current' : ''
                    }`}
                  />
                </Button>
              ))}
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Technical Skills (1-10): {technicalScore[0]}</Label>
              <Slider
                value={technicalScore}
                onValueChange={setTechnicalScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Communication (1-10): {communicationScore[0]}</Label>
              <Slider
                value={communicationScore}
                onValueChange={setCommunicationScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Culture Fit (1-10): {cultureFitScore[0]}</Label>
              <Slider
                value={cultureFitScore}
                onValueChange={setCultureFitScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Strengths */}
          <div className="space-y-2">
            <Label>{t('interviewFeedbackDialog.label.keyStrengths')}</Label>
            {strengths.map((strength, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={strength}
                  onChange={(e) => handleUpdateField(setStrengths, index, e.target.value)}
                  placeholder={t('interviewFeedbackDialog.placeholder.egStrongProblemsolvingSkills')}
                />
                {strengths.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveField(setStrengths, index)}
                  >
                    {t('common:remove')}
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddField(setStrengths)}
            >
              {t('partner.interviewfeedbackdialog.addStrength', 'Add Strength')}
            </Button>
          </div>

          {/* Concerns */}
          <div className="space-y-2">
            <Label>{t('interviewFeedbackDialog.label.concernsAreasForImprovement')}</Label>
            {concerns.map((concern, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={concern}
                  onChange={(e) => handleUpdateField(setConcerns, index, e.target.value)}
                  placeholder={t('interviewFeedbackDialog.placeholder.egLimitedExperienceWithXTechnology')}
                />
                {concerns.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveField(setConcerns, index)}
                  >
                    {t('common:remove')}
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddField(setConcerns)}
            >
              {t('partner.interviewfeedbackdialog.addConcern', 'Add Concern')}
            </Button>
          </div>

          {/* Key Observations */}
          <div className="space-y-2">
            <Label>{t('interviewFeedbackDialog.label.keyObservations')}</Label>
            {keyObservations.map((observation, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={observation}
                  onChange={(e) => handleUpdateField(setKeyObservations, index, e.target.value)}
                  placeholder={t('interviewFeedbackDialog.placeholder.egHandledPressureWellDuringTechnicalChal')}
                />
                {keyObservations.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveField(setKeyObservations, index)}
                  >
                    {t('common:remove')}
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddField(setKeyObservations)}
            >
              {t('partner.interviewfeedbackdialog.addObservation', 'Add Observation')}
            </Button>
          </div>

          {/* Detailed Notes */}
          <div className="space-y-2">
            <Label>{t('interviewFeedbackDialog.label.detailedNotes')}</Label>
            <Textarea
              value={detailedNotes}
              onChange={(e) => setDetailedNotes(e.target.value)}
              placeholder={t('interviewFeedbackDialog.placeholder.provideComprehensiveNotesAboutTheIntervi')}
              rows={5}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !recommendation}>
            {submitting ? t('partner.interviewfeedbackdialog.submitting', 'Submitting...') : t('partner.interviewfeedbackdialog.submitFeedback', 'Submit Feedback')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
