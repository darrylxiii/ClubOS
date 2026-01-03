import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Star, MessageSquare, Calendar, FileText, TrendingUp, History } from "lucide-react";
import { CandidateInteractionLog } from "./CandidateInteractionLog";
import { EnhancedCandidateDetails } from "./EnhancedCandidateDetails";
import { getVisibleFields } from "@/utils/candidateVisibility";
import { useRole } from "@/contexts/RoleContext";
import { trackProfileView } from "@/services/profileViewTracking";

interface CandidateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
  stages: any[];
}

export const CandidateDetailDialog = ({ open, onOpenChange, application, stages }: CandidateDetailDialogProps) => {
  const { user } = useAuth();
  const { currentRole: role } = useRole();
  const [comments, setComments] = useState<any[]>([]);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [scorecard, setScorecard] = useState({
    overall_rating: 3,
    technical_score: 3,
    cultural_fit_score: 3,
    communication_score: 3,
    strengths: "",
    concerns: "",
    recommendation: "neutral" as const,
    notes: "",
  });

  const companyId = application?.jobs?.company_id || application?.job?.company_id;
  const visibility = getVisibleFields(application, companyId, role || 'partner');
  const appliedToOurJob = application?.job?.company_id === companyId || application?.jobs?.company_id === companyId;

  useEffect(() => {
    if (open && application && user) {
      fetchComments();
      fetchScorecards();
      
      // Track profile view
      if (application.candidate_id) {
        trackProfileView({
          profileId: application.candidate_id,
          viewerId: user.id,
          context: {
            jobId: application.job_id,
            source: 'job_application'
          }
        });
      }
    }
  }, [open, application, user]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('candidate_comments')
      .select('*, profiles:user_id(full_name)')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false });
    
    setComments(data || []);
  };

  const fetchScorecards = async () => {
    const { data } = await supabase
      .from('candidate_scorecards')
      .select('*, profiles:evaluator_id(full_name)')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false });
    
    setScorecards(data || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const { error } = await supabase
      .from('candidate_comments')
      .insert({
        application_id: application.id,
        user_id: user?.id,
        comment: newComment,
      });

    if (error) {
      toast.error("Failed to add comment");
      return;
    }

    toast.success("Comment added");
    setNewComment("");
    fetchComments();
  };

  const handleSubmitScorecard = async () => {
    const { error } = await supabase
      .from('candidate_scorecards')
      .insert({
        application_id: application.id,
        evaluator_id: user?.id,
        stage_index: application.current_stage_index,
        ...scorecard,
      });

    if (error) {
      toast.error("Failed to submit scorecard");
      return;
    }

    // Log event
    await supabase.from('pipeline_events').insert({
      application_id: application.id,
      job_id: application.job_id,
      event_type: 'feedback_added',
      performed_by: user?.id,
      metadata: { recommendation: scorecard.recommendation },
    });

    toast.success("Scorecard submitted");
    fetchScorecards();
  };

  const handleMoveStage = async (newStageIndex: number) => {
    const { error } = await supabase
      .from('applications')
      .update({ current_stage_index: newStageIndex })
      .eq('id', application.id);

    if (error) {
      toast.error("Failed to move candidate");
      return;
    }

    // Log event
    await supabase.from('pipeline_events').insert({
      application_id: application.id,
      job_id: application.job_id,
      event_type: 'stage_change',
      from_stage: application.current_stage_index,
      to_stage: newStageIndex,
      performed_by: user?.id,
    });

    toast.success("Candidate moved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase">
            <History className="w-6 h-6 text-accent" />
            {application?.profiles?.full_name}
          </DialogTitle>
          <DialogDescription>
            Applied {new Date(application?.applied_at).toLocaleDateString()} • Complete interaction history
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interactions">
              <History className="w-4 h-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pipeline Stage</span>
                  <Badge>{stages[application?.current_stage_index]?.name}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={(value) => handleMoveStage(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Move to stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Candidate Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Email:</strong> {visibility.email ? application?.profiles?.email : 'Hidden'}</p>
                <p><strong>Position:</strong> {application?.position}</p>
                <p><strong>Company:</strong> {application?.company_name}</p>
              </CardContent>
            </Card>

            <EnhancedCandidateDetails
              candidate={application?.candidate_profiles}
              profile={application?.profiles}
              visibility={visibility}
              appliedToOurJob={appliedToOurJob}
            />
          </TabsContent>

          <TabsContent value="interactions" className="mt-4">
            <CandidateInteractionLog
              candidateId={application?.candidate_id || ""}
              applicationId={application?.id}
            />
          </TabsContent>

          <TabsContent value="scorecard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submit Evaluation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Overall Rating</label>
                  <Slider
                    value={[scorecard.overall_rating]}
                    onValueChange={([value]) => setScorecard({...scorecard, overall_rating: value})}
                    min={1}
                    max={5}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {[1,2,3,4,5].map(n => <span key={n}>{n} ⭐</span>)}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Technical Skills</label>
                  <Slider
                    value={[scorecard.technical_score]}
                    onValueChange={([value]) => setScorecard({...scorecard, technical_score: value})}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Cultural Fit</label>
                  <Slider
                    value={[scorecard.cultural_fit_score]}
                    onValueChange={([value]) => setScorecard({...scorecard, cultural_fit_score: value})}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Communication</label>
                  <Slider
                    value={[scorecard.communication_score]}
                    onValueChange={([value]) => setScorecard({...scorecard, communication_score: value})}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Recommendation</label>
                  <Select value={scorecard.recommendation} onValueChange={(value: any) => setScorecard({...scorecard, recommendation: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strong_yes">Strong Yes</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="strong_no">Strong No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Strengths</label>
                  <Textarea
                    value={scorecard.strengths}
                    onChange={(e) => setScorecard({...scorecard, strengths: e.target.value})}
                    placeholder="What are their strengths?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Concerns</label>
                  <Textarea
                    value={scorecard.concerns}
                    onChange={(e) => setScorecard({...scorecard, concerns: e.target.value})}
                    placeholder="Any concerns?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={scorecard.notes}
                    onChange={(e) => setScorecard({...scorecard, notes: e.target.value})}
                    placeholder="Additional notes..."
                  />
                </div>

                <Button onClick={handleSubmitScorecard} className="w-full">
                  Submit Scorecard
                </Button>
              </CardContent>
            </Card>

            {scorecards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Previous Evaluations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scorecards.map((sc) => (
                    <div key={sc.id} className="border-l-4 border-primary pl-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sc.profiles?.full_name}</span>
                        <Badge>{sc.recommendation.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>Overall: {sc.overall_rating}⭐</span>
                        <span>Technical: {sc.technical_score}⭐</span>
                        <span>Cultural: {sc.cultural_fit_score}⭐</span>
                      </div>
                      {sc.notes && <p className="text-sm text-muted-foreground">{sc.notes}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Comment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={3}
                />
                <Button onClick={handleAddComment}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Comment
                </Button>
              </CardContent>
            </Card>

            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium">{comment.profiles?.full_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.comment}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Activity timeline coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};