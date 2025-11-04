import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ArrowRight, XCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { EnhancedCandidateActionDialog } from "./EnhancedCandidateActionDialog";

interface PipelineContextData {
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  currentStage: string;
  stageIndex: number;
  totalStages: number;
  stages: any[];
  applicationId: string;
  daysInStage: number;
  sourcedBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Props {
  candidateId: string;
  candidateName: string;
  jobId: string;
  currentStage?: string;
  stageIndex?: number;
}

export function CandidatePipelineContextBanner({ 
  candidateId, 
  candidateName,
  jobId,
  currentStage: propStage,
  stageIndex: propStageIndex
}: Props) {
  const navigate = useNavigate();
  const [context, setContext] = useState<PipelineContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'advance' | 'decline'>('advance');

  useEffect(() => {
    loadPipelineContext();
  }, [candidateId, jobId]);

  const loadPipelineContext = async () => {
    try {
      const { data: application, error } = await supabase
        .from('applications')
        .select(`
          id,
          current_stage_index,
          stages,
          applied_at,
          updated_at,
          sourced_by,
          job:jobs (
            id,
            title,
            pipeline_stages,
            company:companies (
              name,
              logo_url
            )
          )
        `)
        .eq('job_id', jobId)
        .or(`user_id.eq.${candidateId},candidate_id.eq.${candidateId}`)
        .single();

      if (error) throw error;

      const stages = (application.job.pipeline_stages || application.stages || []) as any[];
      const currentStageIndex = propStageIndex ?? application.current_stage_index ?? 0;
      const stageName = propStage || stages[currentStageIndex]?.name || 'Applied';

      // Calculate days in current stage
      const stageUpdatedAt = new Date(application.updated_at);
      const now = new Date();
      const daysInStage = Math.floor((now.getTime() - stageUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));

      // Get sourcer info if available
      let sourcedBy = undefined;
      if (application.sourced_by) {
        const { data: sourcerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', application.sourced_by)
          .single();

        if (sourcerProfile) {
          sourcedBy = {
            id: sourcerProfile.id,
            name: sourcerProfile.full_name || 'Unknown',
            avatar: sourcerProfile.avatar_url
          };
        }
      }

      setContext({
        jobId: application.job.id,
        jobTitle: application.job.title,
        companyName: application.job.company?.name || 'Unknown Company',
        companyLogo: application.job.company?.logo_url,
        currentStage: stageName,
        stageIndex: currentStageIndex,
        totalStages: stages.length,
        stages,
        applicationId: application.id,
        daysInStage,
        sourcedBy
      });
    } catch (error) {
      console.error('Error loading pipeline context:', error);
      toast.error("Failed to load pipeline context");
    } finally {
      setLoading(false);
    }
  };

  const handleActionComplete = () => {
    setActionDialogOpen(false);
    loadPipelineContext();
    toast.success(actionType === 'advance' ? "Candidate advanced" : "Candidate declined");
  };

  if (loading || !context) return null;

  const nextStage = context.stages[context.stageIndex + 1];
  const progress = ((context.stageIndex + 1) / context.totalStages) * 100;

  return (
    <>
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/job-dashboard/${context.jobId}`)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Dashboard
          </Button>

          <div className="flex items-start gap-6">
            {context.companyLogo && (
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={context.companyLogo} alt={context.companyName} />
                <AvatarFallback>{context.companyName[0]}</AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {context.jobTitle}
                </h2>
                <p className="text-muted-foreground">{context.companyName}</p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current Stage:</span>
                  <Badge variant="outline" className="text-base">
                    {context.currentStage}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {context.stages.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 w-2 rounded-full ${
                          idx <= context.stageIndex
                            ? 'bg-primary'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Stage {context.stageIndex + 1} of {context.totalStages}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{context.daysInStage} days in this stage</span>
                </div>
              </div>

              {context.sourcedBy && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Sourced by:</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={context.sourcedBy.avatar} />
                    <AvatarFallback>{context.sourcedBy.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{context.sourcedBy.name}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {nextStage && (
                  <Button 
                    onClick={() => {
                      setActionType('advance');
                      setActionDialogOpen(true);
                    }}
                    className="gap-2"
                  >
                    Advance to {nextStage.name}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActionType('decline');
                    setActionDialogOpen(true);
                  }}
                  className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" />
                  Decline with Feedback
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <EnhancedCandidateActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        candidateId={candidateId}
        candidateName={candidateName}
        applicationId={context.applicationId}
        jobId={context.jobId}
        jobTitle={context.jobTitle}
        companyName={context.companyName}
        currentStage={context.currentStage}
        currentStageIndex={context.stageIndex}
        stages={context.stages}
        nextStage={nextStage?.name}
        actionType={actionType}
        onComplete={handleActionComplete}
      />
    </>
  );
}
