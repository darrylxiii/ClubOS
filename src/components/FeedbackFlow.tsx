import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface FeedbackFlowProps {
  applicationId: string;
  companyName: string;
  position: string;
  outcome: "hired" | "not_hired" | "withdrew";
  onComplete: () => void;
}

export const FeedbackFlow = ({
  applicationId,
  companyName,
  position,
  outcome,
  onComplete,
}: FeedbackFlowProps) => {
  const { t } = useTranslation('common');
  const [step, setStep] = useState(1);
  const [feedbackData, setFeedbackData] = useState({
    nps_score: null as number | null,
    communication_rating: null as number | null,
    process_clarity_rating: null as number | null,
    strategist_rating: null as number | null,
    timeline_rating: null as number | null,
    interview_experience_rating: null as number | null,
    what_went_well: "",
    what_could_improve: "",
    would_apply_again: null as boolean | null,
    additional_feedback: "",
    suggestions: "",
  });

  const totalSteps = 7;
  const progress = (step / totalSteps) * 100;

  const handleNPSSelect = (score: number) => {
    setFeedbackData({ ...feedbackData, nps_score: score });
  };

  const handleRating = (field: string, value: number) => {
    setFeedbackData({ ...feedbackData, [field]: value });
  };

  const handleNext = () => {
    // Validate current step
    if (step === 1 && feedbackData.nps_score === null) {
      toast.error(t('feedbackflow.pleaseSelectAScoreToContinue', 'Please select a score to continue'));
      return;
    }
    if (step === 2 && 
        (feedbackData.communication_rating === null || 
         feedbackData.process_clarity_rating === null)) {
      toast.error(t('feedbackflow.pleaseRateBothAspectsToContinue', 'Please rate both aspects to continue'));
      return;
    }
    if (step === 3 && 
        (feedbackData.strategist_rating === null || 
         feedbackData.timeline_rating === null)) {
      toast.error(t('feedbackflow.pleaseRateBothAspectsToContinue', 'Please rate both aspects to continue'));
      return;
    }
    if (step === 4 && feedbackData.interview_experience_rating === null) {
      toast.error(t('feedbackflow.pleaseRateYourInterviewExperience', 'Please rate your interview experience'));
      return;
    }
    if (step === 6 && feedbackData.would_apply_again === null) {
      toast.error(t('feedbackflow.pleaseSelectAnOptionToContinue', 'Please select an option to continue'));
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("pipeline_feedback")
        .insert({
          user_id: user.id,
          application_id: applicationId,
          company_name: companyName,
          position: position,
          outcome: outcome,
          ...feedbackData,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Thank you for your feedback!", {
        description: t('feedbackflow.yourInsightsHelpUsImproveOur', 'Your insights help us improve our service for everyone.'),
      });
      onComplete();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(t('feedbackflow.failedToSubmitFeedbackPleaseTry', 'Failed to submit feedback. Please try again.'));
    }
  };

  const getNPSCategory = (score: number | null) => {
    if (score === null) return null;
    if (score >= 9) return "Promoter";
    if (score >= 7) return "Passive";
    return "Detractor";
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black">{t('feedbackflow.howLikelyAreYouToRecommend', 'How likely are you to recommend The Quantum Club?')}</h3>
              <p className="text-muted-foreground">{t('feedbackflow.onAScaleOf010Where', 'On a scale of 0-10, where 0 is not likely at all and 10 is extremely likely')}</p>
            </div>
            
            <div className="grid grid-cols-11 gap-2">
              {[...Array(11)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleNPSSelect(i)}
                  className={`aspect-square flex items-center justify-center rounded-lg border-2 font-bold text-lg transition-all hover:scale-110 ${
                    feedbackData.nps_score === i
                      ? "bg-accent text-accent-foreground border-accent scale-110"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('feedbackflow.notLikely', 'Not likely')}</span>
              <span>{t('feedbackflow.extremelyLikely', 'Extremely likely')}</span>
            </div>

            {feedbackData.nps_score !== null && (
              <div className="text-center">
                <Badge variant={getNPSCategory(feedbackData.nps_score) === "Promoter" ? "default" : "secondary"}>
                  {getNPSCategory(feedbackData.nps_score)}
                </Badge>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">{t('feedbackflow.communicationClarity', 'Communication & Clarity')}</h3>
              <p className="text-muted-foreground">{t('feedbackflow.helpUsUnderstandYourExperienceWith', 'Help us understand your experience with our communication')}</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-bold mb-4 block">{t('feedbackflow.howWouldYouRateTheQuality', 'How would you rate the quality of communication throughout the process?')}</Label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRating("communication_rating", rating)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        feedbackData.communication_rating === rating
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <Star
                        className={`w-6 h-6 mx-auto ${
                          feedbackData.communication_rating === rating ? "fill-current" : ""
                        }`}
                      />
                      <span className="block mt-2 text-xs font-bold">{rating}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{t('feedbackflow.poor', 'Poor')}</span>
                  <span>{t('feedbackflow.excellent', 'Excellent')}</span>
                </div>
              </div>

              <div>
                <Label className="text-base font-bold mb-4 block">{t('feedbackflow.howClearWasTheApplicationProcess', 'How clear was the application process and expectations?')}</Label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRating("process_clarity_rating", rating)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        feedbackData.process_clarity_rating === rating
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <Star
                        className={`w-6 h-6 mx-auto ${
                          feedbackData.process_clarity_rating === rating ? "fill-current" : ""
                        }`}
                      />
                      <span className="block mt-2 text-xs font-bold">{rating}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{t('feedbackflow.unclear', 'Unclear')}</span>
                  <span>{t('feedbackflow.veryClear', 'Very Clear')}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">{t('feedbackflow.supportTimeline', 'Support & Timeline')}</h3>
              <p className="text-muted-foreground">{t('feedbackflow.yourFeedbackOnTheSupportYou', 'Your feedback on the support you received')}</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-bold mb-4 block">{t('feedbackflow.howHelpfulWasYourDedicatedTalent', 'How helpful was your dedicated Talent Strategist?')}</Label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRating("strategist_rating", rating)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        feedbackData.strategist_rating === rating
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <Star
                        className={`w-6 h-6 mx-auto ${
                          feedbackData.strategist_rating === rating ? "fill-current" : ""
                        }`}
                      />
                      <span className="block mt-2 text-xs font-bold">{rating}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{t('feedbackflow.notHelpful', 'Not helpful')}</span>
                  <span>{t('feedbackflow.extremelyHelpful', 'Extremely helpful')}</span>
                </div>
              </div>

              <div>
                <Label className="text-base font-bold mb-4 block">{t('feedbackflow.howSatisfiedWereYouWithThe', 'How satisfied were you with the timeline and pace of the process?')}</Label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRating("timeline_rating", rating)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        feedbackData.timeline_rating === rating
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <Star
                        className={`w-6 h-6 mx-auto ${
                          feedbackData.timeline_rating === rating ? "fill-current" : ""
                        }`}
                      />
                      <span className="block mt-2 text-xs font-bold">{rating}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{t('feedbackflow.tooSlowfast', 'Too slow/fast')}</span>
                  <span>{t('feedbackflow.perfectPace', 'Perfect pace')}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">{t('feedbackflow.interviewExperience', 'Interview Experience')}</h3>
              <p className="text-muted-foreground">{t('feedbackflow.tellUsAboutYourInterviewExperience', 'Tell us about your interview experience')}</p>
            </div>

            <div>
              <Label className="text-base font-bold mb-4 block">{t('feedbackflow.overallHowWouldYouRateYour', 'Overall, how would you rate your interview experience?')}</Label>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRating("interview_experience_rating", rating)}
                    className={`flex-1 p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                      feedbackData.interview_experience_rating === rating
                        ? "bg-accent text-accent-foreground border-accent"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <Star
                      className={`w-8 h-8 mx-auto ${
                        feedbackData.interview_experience_rating === rating ? "fill-current" : ""
                      }`}
                    />
                    <span className="block mt-2 font-bold">{rating}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{t('feedbackflow.poor', 'Poor')}</span>
                <span>{t('feedbackflow.excellent', 'Excellent')}</span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">{t('feedbackflow.reflections', 'Reflections')}</h3>
              <p className="text-muted-foreground">{t('feedbackflow.shareWhatWorkedWellAndWhat', 'Share what worked well and what could be improved')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="what_went_well" className="text-base font-bold">{t('feedbackflow.whatWentParticularlyWellDuringThis', 'What went particularly well during this process?')}</Label>
                <Textarea
                  id="what_went_well"
                  placeholder={t('feedbackflow.shareThePositiveAspectsOfYour', 'Share the positive aspects of your experience...')}
                  value={feedbackData.what_went_well}
                  onChange={(e) =>
                    setFeedbackData({ ...feedbackData, what_went_well: e.target.value })
                  }
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="what_could_improve" className="text-base font-bold">{t('feedbackflow.whatCouldWeImproveForFuture', 'What could we improve for future candidates?')}</Label>
                <Textarea
                  id="what_could_improve"
                  placeholder={t('feedbackflow.beAsSpecificAsPossible', 'Be as specific as possible...')}
                  value={feedbackData.what_could_improve}
                  onChange={(e) =>
                    setFeedbackData({ ...feedbackData, what_could_improve: e.target.value })
                  }
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">{t('feedbackflow.futureOpportunities', 'Future Opportunities')}</h3>
              <p className="text-muted-foreground">{t('feedbackflow.wouldYouConsiderWorkingWithUs', 'Would you consider working with us again?')}</p>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-bold">
                {outcome === "hired"
                  ? t('feedbackflow.wouldYouRecommendTheQuantumClub', 'Would you recommend The Quantum Club to other professionals in your network?') : t('feedbackflow.wouldYouApplyToAnotherRole', 'Would you apply to another role through The Quantum Club in the future?')}
              </Label>

              <RadioGroup
                value={feedbackData.would_apply_again?.toString()}
                onValueChange={(value) =>
                  setFeedbackData({ ...feedbackData, would_apply_again: value === "true" })
                }
              >
                <div className="flex items-center space-x-3 p-4 rounded-lg border-2 hover:border-accent/50 transition-all cursor-pointer">
                  <RadioGroupItem value="true" id="yes" />
                  <Label htmlFor="yes" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-success" />
                      <span className="font-bold">{t('feedbackflow.yesDefinitely', 'Yes, definitely')}</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg border-2 hover:border-accent/50 transition-all cursor-pointer">
                  <RadioGroupItem value="false" id="no" />
                  <Label htmlFor="no" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="w-5 h-5 text-destructive" />
                      <span className="font-bold">{t('feedbackflow.noNotAtThisTime', 'No, not at this time')}</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-accent" />
              <h3 className="text-2xl font-black mb-2">{t('feedbackflow.finalThoughts', 'Final Thoughts')}</h3>
              <p className="text-muted-foreground">{t('feedbackflow.anythingElseYoudLikeToShare', 'Anything else you\'d like to share? This is your space to be as detailed as you like.')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="additional_feedback" className="text-base font-bold">{t('feedbackflow.additionalFeedbackOrComments', 'Additional feedback or comments')}</Label>
                <Textarea
                  id="additional_feedback"
                  placeholder={t('feedbackflow.shareAnyOtherThoughtsAboutYour', 'Share any other thoughts about your experience...')}
                  value={feedbackData.additional_feedback}
                  onChange={(e) =>
                    setFeedbackData({ ...feedbackData, additional_feedback: e.target.value })
                  }
                  rows={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="suggestions" className="text-base font-bold">{t('feedbackflow.suggestionsForTheQuantumClub', 'Suggestions for The Quantum Club')}</Label>
                <Textarea
                  id="suggestions"
                  placeholder={t('feedbackflow.howCanWeBetterServeElite', 'How can we better serve elite talent like yourself?')}
                  value={feedbackData.suggestions}
                  onChange={(e) =>
                    setFeedbackData({ ...feedbackData, suggestions: e.target.value })
                  }
                  rows={5}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-3xl mx-auto border-2 border-foreground">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            Step {step} of {totalSteps}
          </Badge>
          <span className="text-sm font-bold">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="mb-4" />
        <CardTitle className="text-xl font-black uppercase">
          Feedback: {position} at {companyName}
        </CardTitle>
        <CardDescription>{t('feedbackflow.yourFeedbackHelpsUsImproveThe', 'Your feedback helps us improve the experience for all candidates')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderStep()}

        <div className="flex gap-3 pt-6 border-t">
          {step > 1 && (
            <Button onClick={handleBack} variant="outline" className="flex-1">{t('feedbackflow.back', 'Back')}</Button>
          )}
          {step < totalSteps ? (
            <Button onClick={handleNext} className="flex-1">{t('feedbackflow.next', 'Next')}</Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1 bg-accent hover:bg-accent/90">
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
