import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Play,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMeetingContext } from '@/hooks/useMeetingContext';

interface AIAssistedScorecardProps {
  meetingId: string;
  onSubmitted?: () => void;
}

const RATING_LABELS = ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
const RECOMMENDATION_OPTIONS = [
  { value: 'strong_yes', label: 'Strong Yes', icon: ThumbsUp, color: 'text-green-500' },
  { value: 'yes', label: 'Yes', icon: ThumbsUp, color: 'text-green-400' },
  { value: 'maybe', label: 'Maybe', icon: Minus, color: 'text-amber-500' },
  { value: 'no', label: 'No', icon: ThumbsDown, color: 'text-red-400' },
  { value: 'strong_no', label: 'Strong No', icon: ThumbsDown, color: 'text-red-500' }
];

interface KeyMoment {
  timestamp: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  topic?: string;
}

export const AIAssistedScorecard = ({ meetingId, onSubmitted }: AIAssistedScorecardProps) => {
  const { meeting, loading: meetingLoading } = useMeetingContext(meetingId);
  const [loading, setLoading] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  
  // Form state
  const [overallRating, setOverallRating] = useState<number>(3);
  const [technicalScore, setTechnicalScore] = useState<number>(3);
  const [communicationScore, setCommunicationScore] = useState<number>(3);
  const [cultureFitScore, setCultureFitScore] = useState<number>(3);
  const [leadershipScore, setLeadershipScore] = useState<number>(3);
  const [problemSolvingScore, setProblemSolvingScore] = useState<number>(3);
  const [recommendation, setRecommendation] = useState<string>('');
  const [strengths, setStrengths] = useState<string>('');
  const [concerns, setConcerns] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [selectedEvidence, setSelectedEvidence] = useState<KeyMoment[]>([]);

  // Pre-fill from AI analysis if available
  useEffect(() => {
    if (meeting?.ai_analysis?.status === 'completed') {
      const ai = meeting.ai_analysis;
      
      // Map AI recommendation to rating
      if (ai.recommendation === 'strong_yes') setOverallRating(5);
      else if (ai.recommendation === 'yes') setOverallRating(4);
      else if (ai.recommendation === 'maybe') setOverallRating(3);
      else if (ai.recommendation === 'no') setOverallRating(2);
      else if (ai.recommendation === 'strong_no') setOverallRating(1);

      if (ai.recommendation) setRecommendation(ai.recommendation);
      if (ai.summary) setNotes(prev => prev || ai.summary);
    }
  }, [meeting]);

  const handleSubmit = async () => {
    if (!recommendation) {
      toast.error('Please select a recommendation');
      return;
    }

    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('candidate_scorecards')
        .insert([{
          application_id: meeting?.application?.id || '',
          evaluator_id: user.user.id,
          overall_rating: overallRating,
          technical_score: technicalScore,
          communication_score: communicationScore,
          cultural_fit_score: cultureFitScore,
          recommendation,
          strengths,
          concerns,
          notes,
          stage_index: meeting?.application?.current_stage_index || 0
        }]);

      if (error) throw error;

      // Update participant record
      await supabase
        .from('meeting_participants')
        .update({ scorecard_submitted: true })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.user.id);

      // Create pipeline event
      if (meeting?.application?.id) {
        await supabase.from('pipeline_events').insert({
          application_id: meeting.application.id,
          candidate_id: meeting.candidate?.id,
          job_id: meeting.job?.id,
          event_type: 'scorecard_submitted',
          triggered_by: 'manual',
          performed_by: user.user.id,
          related_meeting_id: meetingId,
          metadata: {
            overall_rating: overallRating,
            recommendation,
            interview_stage: meeting.interview_stage
          }
        });
      }

      toast.success('Scorecard submitted successfully');
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit scorecard');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvidence = (moment: KeyMoment) => {
    setSelectedEvidence(prev => {
      const exists = prev.some(m => m.timestamp === moment.timestamp);
      if (exists) {
        return prev.filter(m => m.timestamp !== moment.timestamp);
      }
      return [...prev, moment];
    });
  };

  if (meetingLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const keyMoments = (meeting?.ai_analysis?.key_moments || []) as KeyMoment[];
  const hasAISuggestions = meeting?.ai_analysis?.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Meeting Context Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {meeting?.candidate ? (
              <Avatar className="h-16 w-16">
                <AvatarImage src={meeting.candidate.avatar_url} />
                <AvatarFallback className="text-lg">
                  {meeting.candidate.full_name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold">
                {meeting?.candidate?.full_name || 'Unknown Candidate'}
              </h2>
              {meeting?.candidate?.current_title && (
                <p className="text-muted-foreground">{meeting.candidate.current_title}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {meeting?.job && (
                  <Badge variant="outline" className="gap-1">
                    <Briefcase className="w-3 h-3" />
                    {meeting.job.title}
                  </Badge>
                )}
                {meeting?.interview_stage && (
                  <Badge variant="secondary">
                    {meeting.interview_stage.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions Panel */}
      {hasAISuggestions && (
        <Collapsible open={showAISuggestions} onOpenChange={setShowAISuggestions}>
          <Card className="border-primary/20 bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Analysis Available
                  </span>
                  {showAISuggestions ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </CardTitle>
                <CardDescription>
                  Pre-filled suggestions based on meeting analysis. Review and adjust as needed.
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* AI Summary */}
                {meeting.ai_analysis?.summary && (
                  <div className="p-4 bg-background rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{meeting.ai_analysis.summary}</p>
                  </div>
                )}

                {/* Key Moments */}
                {keyMoments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Key Moments (click to add as evidence)</h4>
                    <div className="space-y-2">
                      {keyMoments.map((moment, idx) => {
                        const isSelected = selectedEvidence.some(m => m.timestamp === moment.timestamp);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleEvidence(moment)}
                            className={`p-3 rounded-lg cursor-pointer transition-all flex items-start gap-3 ${
                              isSelected 
                                ? 'bg-primary/20 border border-primary' 
                                : 'bg-background hover:bg-muted'
                            }`}
                          >
                            <div className={`p-1 rounded ${
                              moment.sentiment === 'positive' ? 'bg-green-500/10 text-green-500' :
                              moment.sentiment === 'negative' ? 'bg-red-500/10 text-red-500' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {moment.sentiment === 'positive' ? <ThumbsUp className="w-4 h-4" /> :
                               moment.sentiment === 'negative' ? <ThumbsDown className="w-4 h-4" /> :
                               <Minus className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{moment.summary}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {moment.timestamp}
                                {moment.topic && (
                                  <Badge variant="outline" className="text-xs">
                                    {moment.topic}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Rating Form */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Overall Rating */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Overall Rating</Label>
              <span className="text-lg font-semibold">{RATING_LABELS[overallRating - 1]}</span>
            </div>
            <Slider
              value={[overallRating]}
              onValueChange={([v]) => setOverallRating(v)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {RATING_LABELS.map((label, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
          </div>

          {/* Skill Ratings */}
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Technical Skills', value: technicalScore, setter: setTechnicalScore },
              { label: 'Communication', value: communicationScore, setter: setCommunicationScore },
              { label: 'Culture Fit', value: cultureFitScore, setter: setCultureFitScore },
              { label: 'Leadership', value: leadershipScore, setter: setLeadershipScore },
              { label: 'Problem Solving', value: problemSolvingScore, setter: setProblemSolvingScore }
            ].map(({ label, value, setter }) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <span className="text-sm font-medium">{value}/5</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => setter(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className="space-y-4">
            <Label className="text-base">Recommendation *</Label>
            <RadioGroup
              value={recommendation}
              onValueChange={setRecommendation}
              className="flex flex-wrap gap-3"
            >
              {RECOMMENDATION_OPTIONS.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={opt.value}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    recommendation === opt.value 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <opt.icon className={`w-4 h-4 ${opt.color}`} />
                  <span>{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Text Areas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="What did the candidate do well?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Concerns</Label>
              <Textarea
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                placeholder="Any areas of concern or improvement?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any other observations or comments..."
                rows={3}
              />
            </div>
          </div>

          {/* Selected Evidence Summary */}
          {selectedEvidence.length > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">
                Evidence Attached ({selectedEvidence.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedEvidence.map((ev, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {ev.timestamp}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline">Save Draft</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Scorecard'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
