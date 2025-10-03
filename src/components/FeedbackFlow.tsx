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
      toast.error("Please select a score to continue");
      return;
    }
    if (step === 2 && 
        (feedbackData.communication_rating === null || 
         feedbackData.process_clarity_rating === null)) {
      toast.error("Please rate both aspects to continue");
      return;
    }
    if (step === 3 && 
        (feedbackData.strategist_rating === null || 
         feedbackData.timeline_rating === null)) {
      toast.error("Please rate both aspects to continue");
      return;
    }
    if (step === 4 && feedbackData.interview_experience_rating === null) {
      toast.error("Please rate your interview experience");
      return;
    }
    if (step === 6 && feedbackData.would_apply_again === null) {
      toast.error("Please select an option to continue");
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
        description: "Your insights help us improve our service for everyone.",
      });
      onComplete();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
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
              <h3 className="text-2xl font-black">
                How likely are you to recommend The Quantum Club?
              </h3>
              <p className="text-muted-foreground">
                On a scale of 0-10, where 0 is not likely at all and 10 is extremely likely
              </p>
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
              <span>Not likely</span>
              <span>Extremely likely</span>
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
              <h3 className="text-2xl font-black mb-2">Communication & Clarity</h3>
              <p className="text-muted-foreground">
                Help us understand your experience with our communication
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-bold mb-4 block">
                  How would you rate the quality of communication throughout the process?
                </Label>
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
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div>
                <Label className="text-base font-bold mb-4 block">
                  How clear was the application process and expectations?
                </Label>
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
                  <span>Unclear</span>
                  <span>Very Clear</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">Support & Timeline</h3>
              <p className="text-muted-foreground">
                Your feedback on the support you received
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-bold mb-4 block">
                  How helpful was your dedicated Talent Strategist?
                </Label>
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
                  <span>Not helpful</span>
                  <span>Extremely helpful</span>
                </div>
              </div>

              <div>
                <Label className="text-base font-bold mb-4 block">
                  How satisfied were you with the timeline and pace of the process?
                </Label>
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
                  <span>Too slow/fast</span>
                  <span>Perfect pace</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">Interview Experience</h3>
              <p className="text-muted-foreground">
                Tell us about your interview experience
              </p>
            </div>

            <div>
              <Label className="text-base font-bold mb-4 block">
                Overall, how would you rate your interview experience?
              </Label>
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
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">Reflections</h3>
              <p className="text-muted-foreground">
                Share what worked well and what could be improved
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="what_went_well" className="text-base font-bold">
                  What went particularly well during this process?
                </Label>
                <Textarea
                  id="what_went_well"
                  placeholder="Share the positive aspects of your experience..."
                  value={feedbackData.what_went_well}
                  onChange={(e) =>
                    setFeedbackData({ ...feedbackData, what_went_well: e.target.value })
                  }
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="what_could_improve" className="text-base font-bold">
                  What could we improve for future candidates?
                </Label>
                <Textarea
                  id="what_could_improve"
                  placeholder="Be as specific as possible..."
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
              <h3 className="text-2xl font-black mb-2">Future Opportunities</h3>
              <p className="text-muted-foreground">
                Would you consider working with us again?
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-bold">
                {outcome === "hired"
                  ? "Would you recommend The Quantum Club to other professionals in your network?"
                  : "Would you apply to another role through The Quantum Club in the future?"}
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
                      <span className="font-bold">Yes, definitely</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg border-2 hover:border-accent/50 transition-all cursor-pointer">
                  <RadioGroupItem value="false" id="no" />
                  <Label htmlFor="no" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="w-5 h-5 text-destructive" />
                      <span className="font-bold">No, not at this time</span>
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
              <h3 className="text-2xl font-black mb-2">Final Thoughts</h3>
              <p className="text-muted-foreground">
                Anything else you'd like to share? This is your space to be as detailed as you like.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="additional_feedback" className="text-base font-bold">
                  Additional feedback or comments
                </Label>
                <Textarea
                  id="additional_feedback"
                  placeholder="Share any other thoughts about your experience..."
                  value={feedbackData.additional_feedback}
                  onChange={(e) =>
                    setFeedbackData({ ...feedbackData, additional_feedback: e.target.value })
                  }
                  rows={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="suggestions" className="text-base font-bold">
                  Suggestions for The Quantum Club
                </Label>
                <Textarea
                  id="suggestions"
                  placeholder="How can we better serve elite talent like yourself?"
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
        <CardDescription>
          Your feedback helps us improve the experience for all candidates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderStep()}

        <div className="flex gap-3 pt-6 border-t">
          {step > 1 && (
            <Button onClick={handleBack} variant="outline" className="flex-1">
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
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
