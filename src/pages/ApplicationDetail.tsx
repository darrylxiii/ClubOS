import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, MapPin, DollarSign, Calendar, 
  Briefcase, FileText, Target, MessageSquare, ExternalLink, Check, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnlineStatusIndicator } from "@/components/messages/OnlineStatusIndicator";
import { PipelineStageData } from "@/components/ExpandablePipelineStage";
import { ProgressionHeatmap } from "@/components/applications/ProgressionHeatmap";
import { CompetitionInsight } from "@/components/applications/CompetitionInsight";
import { TimelineDeadlines } from "@/components/applications/TimelineDeadlines";
import { NextStepHelper } from "@/components/applications/NextStepHelper";

interface ApplicationDetail {
  id: string;
  job_id: string;
  current_stage_index: number;
  stages: PipelineStageData[];
  status: string;
  applied_at: string;
  updated_at: string;
  job: {
    id: string;
    title: string;
    location: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    employment_type: string;
    description: string;
    requirements: string[];
    benefits: string[];
    company_id: string;
    companies: {
      name: string;
      logo_url: string;
      description: string;
      website_url: string;
    };
  };
  other_candidates_count: number;
  talent_strategist?: {
    id: string;
    full_name: string;
    avatar_url: string;
    user_id: string;
  };
}

export default function ApplicationDetail() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch application with full job details including pipeline stages
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          jobs!applications_job_id_fkey (
            id,
            title,
            location,
            salary_min,
            salary_max,
            currency,
            employment_type,
            description,
            requirements,
            benefits,
            company_id,
            pipeline_stages,
            companies!jobs_company_id_fkey (
              name,
              logo_url,
              description,
              website_url
            )
          )
        `)
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      // Get count of other candidates
      const { count } = await supabase
        .from("applications")
        .select("*", { count: 'exact', head: true })
        .eq("job_id", data.job_id)
        .neq("user_id", user.id);

      // Get talent strategist
      let strategist = null;
      if (data.jobs?.company_id) {
        const { data: companyMembers, error: strategistError } = await supabase
          .from("company_members")
          .select("user_id, role")
          .eq("company_id", data.jobs.company_id)
          .eq("is_active", true)
          .in("role", ["recruiter", "admin"])
          .order('created_at', { ascending: true })
          .limit(1);

        if (strategistError) {
          console.error("Error fetching strategist:", strategistError);
        }

        // Get profile data separately
        if (companyMembers && companyMembers.length > 0) {
          const member = companyMembers[0];
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", member.user_id)
            .single();

          if (profileData) {
            strategist = {
              id: profileData.id,
              full_name: profileData.full_name,
              avatar_url: profileData.avatar_url,
              user_id: member.user_id
            };
          }
        }
      }

      // Use job's pipeline_stages as the source of truth
      const jobPipelineStages = data.jobs?.pipeline_stages || [];
      const formattedStages = Array.isArray(jobPipelineStages) 
        ? jobPipelineStages.map((stage: any) => ({
            id: stage.id || String(stage.order),
            title: stage.name,
            description: stage.description,
            status: "upcoming" as const,
            preparation: stage.resources ? {
              title: "Preparation Guide",
              content: stage.description || "",
              resources: stage.resources
            } : undefined,
            scheduledDate: stage.scheduled_date,
            duration: stage.duration,
            location: stage.location,
            meetingType: stage.format,
            interviewers: stage.owner ? [{
              name: stage.owner,
              title: stage.owner_role || "Interviewer",
              photo: stage.owner_avatar
            }] : undefined,
          }))
        : [];

      setApplication({
        ...data,
        job: {
          ...data.jobs,
          requirements: (data.jobs.requirements as string[]) || [],
          benefits: (data.jobs.benefits as string[]) || [],
        },
        stages: formattedStages,
        other_candidates_count: count || 0,
        talent_strategist: strategist,
      });
    } catch (error) {
      console.error("Error loading application:", error);
      toast.error("Failed to load application details");
      navigate("/applications");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading application details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!application) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Application not found</p>
              <Button onClick={() => navigate("/applications")} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Applications
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const currentStage = application.stages[application.current_stage_index];
  const nextStage = application.stages[application.current_stage_index + 1];
  const daysInProcess = Math.ceil((Date.now() - new Date(application.applied_at).getTime()) / (1000 * 60 * 60 * 24));

  const formatSalaryRange = () => {
    if (!application.job?.salary_min || !application.job?.salary_max) return null;
    const currency = application.job?.currency || 'EUR';
    return `${currency} ${application.job.salary_min.toLocaleString()} - ${application.job.salary_max.toLocaleString()}`;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/applications")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Badge variant={application.status === "active" ? "default" : "secondary"}>
            {application.status}
          </Badge>
        </div>

        {/* Job Header Card */}
        <Card className="border border-border/50">
          <CardHeader>
            <div className="flex items-start gap-6">
              {application.job?.companies?.logo_url && (
                <Avatar className="w-20 h-20 ring-1 ring-border/50">
                  <AvatarImage src={application.job.companies.logo_url} />
                  <AvatarFallback className="text-2xl">
                    {application.job.companies.name?.[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 space-y-3">
                <div>
                  <CardTitle className="text-3xl">{application.job?.title}</CardTitle>
                  <p className="text-xl text-muted-foreground flex items-center gap-2 mt-2">
                    {application.job?.companies?.name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  {application.job?.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{application.job.location}</span>
                    </div>
                  )}
                  {formatSalaryRange() && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>{formatSalaryRange()}</span>
                    </div>
                  )}
                  {application.job?.employment_type && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{application.job.employment_type}</span>
                    </div>
                  )}
                </div>
                {application.job?.companies?.website_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={application.job.companies.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Company Website
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* All Pipeline Stages with Preparation Info */}
            <Card>
              <CardHeader>
                <CardTitle>Application Pipeline & Preparation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Talent Strategist - At Top */}
                {application.talent_strategist && (
                  <div 
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/profile/${application.talent_strategist?.id}`)}
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14 ring-2 ring-border/50">
                        <AvatarImage src={application.talent_strategist.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {application.talent_strategist.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {application.talent_strategist.user_id && (
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <OnlineStatusIndicator userId={application.talent_strategist.user_id} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Your Talent Strategist</div>
                      <div className="text-base font-semibold">{application.talent_strategist.full_name}</div>
                      <div className="text-xs text-muted-foreground">Click to view profile</div>
                    </div>
                  </div>
                )}

                {/* Visual Pipeline - Horizontal */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                    PIPELINE PROGRESS
                    <span className="text-xs font-normal opacity-60">(Swipe to see all stages →)</span>
                  </h3>
                  <div className="flex items-center justify-start gap-2 overflow-x-auto pb-4 scrollbar-hide cursor-grab active:cursor-grabbing">
                    {application.stages.map((stage: PipelineStageData, index: number) => {
                      const isCurrent = index === application.current_stage_index;
                      const isCompleted = index < application.current_stage_index;
                      
                      return (
                        <div key={stage.id} className="flex items-center flex-shrink-0">
                          <div className="flex flex-col items-center min-w-[100px]">
                            <div className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                              isCompleted && "bg-muted border-muted-foreground/30",
                              isCurrent && "bg-foreground border-foreground text-background scale-110",
                              !isCompleted && !isCurrent && "bg-background border-border"
                            )}>
                              {isCompleted ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <span className="text-sm font-semibold">
                                  {isCurrent ? "●" : "○"}
                                </span>
                              )}
                            </div>
                            <p className={cn(
                              "mt-2 text-xs font-medium text-center max-w-[100px] break-words",
                              isCurrent && "font-bold"
                            )}>
                              {stage.title}
                            </p>
                          </div>
                          {index < application.stages.length - 1 && (
                            <div className={cn(
                              "h-0.5 w-8 mx-2 flex-shrink-0",
                              isCompleted ? "bg-muted-foreground/30" : "bg-border"
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All Stages Details - Vertical List */}
                <div className="space-y-4">
                  {application.stages.map((stage: PipelineStageData, index: number) => {
                    const isCurrent = index === application.current_stage_index;
                    const isCompleted = index < application.current_stage_index;
                    const isUpcoming = index > application.current_stage_index;
                    
                    return (
                      <div 
                        key={stage.id}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          isCurrent && "border-foreground/20 bg-muted/50",
                          isCompleted && "border-border/30 bg-muted/20 opacity-60",
                          isUpcoming && "border-border/30 bg-card"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                            isCompleted && "bg-muted text-muted-foreground",
                            isCurrent && "bg-foreground text-background",
                            isUpcoming && "bg-muted/50 text-muted-foreground"
                          )}>
                            {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-base">{stage.title}</h4>
                              {isCurrent && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-foreground text-background flex-shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            
                            {stage.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {stage.description}
                              </p>
                            )}
                            
                            {/* Grid layout for stage details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Preparation info */}
                              {stage.preparation && (
                                <div className="p-3 rounded-lg bg-background border border-border/50">
                                  <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{stage.preparation.title || "Preparation Guide"}</span>
                                  </h5>
                                  {stage.preparation.content && (
                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                                      {stage.preparation.content}
                                    </p>
                                  )}
                                  {stage.preparation.resources && stage.preparation.resources.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                      <p className="text-xs font-medium text-muted-foreground">Resources:</p>
                                      {stage.preparation.resources.map((resource: any, idx: number) => (
                                        <a
                                          key={idx}
                                          href={resource.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-sm hover:underline text-foreground truncate"
                                        >
                                          <FileText className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{resource.title}</span>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Interview/Meeting info */}
                              {(stage.scheduledDate || (stage.interviewers && stage.interviewers.length > 0)) && (
                                <div className="p-3 rounded-lg bg-background border border-border/50">
                                  {stage.scheduledDate && (
                                    <div className="mb-3">
                                      <div className="flex items-start gap-2 mb-1">
                                        <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium">Scheduled</p>
                                          <p className="text-sm text-muted-foreground truncate">{stage.scheduledDate}</p>
                                          {stage.duration && (
                                            <p className="text-xs text-muted-foreground">Duration: {stage.duration}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {stage.interviewers && stage.interviewers.length > 0 && (
                                    <div>
                                      <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <User className="w-4 h-4 flex-shrink-0" />
                                        Who You'll Meet
                                      </h5>
                                      <div className="space-y-2">
                                        {stage.interviewers.map((interviewer, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                              <AvatarImage src={interviewer.photo} alt={interviewer.name} />
                                              <AvatarFallback className="text-xs">
                                                {interviewer.name.charAt(0)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium truncate">{interviewer.name}</p>
                                              <p className="text-xs text-muted-foreground truncate">{interviewer.title}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            {application.job?.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About the Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {application.job.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {application.job?.requirements && application.job.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {application.job.requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {application.job?.benefits && application.job.benefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {application.job.benefits.map((benefit: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{benefit}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Step Actions */}
            {currentStage && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Next Step</h3>
                <NextStepHelper
                  stageName={currentStage.title}
                  scheduledDate={currentStage.scheduledDate}
                  duration={currentStage.duration}
                  prepTasks={currentStage.preparation?.resources}
                  onBookPrep={() => toast.success("Opening prep session booking...")}
                  onViewMaterials={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
              </div>
            )}

            {/* Comprehensive Stats Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Application Insights</h3>
              
              {/* Progression Heatmap */}
              <ProgressionHeatmap
                currentStage={application.current_stage_index}
                totalStages={application.stages.length}
                daysInProcess={daysInProcess}
                averageDays={21}
              />

              {/* Timeline & Deadlines */}
              <TimelineDeadlines
                appliedDate={application.applied_at}
                nextStageName={nextStage?.title}
                estimatedDaysToNext={5}
                finalDecisionDate="2025-10-25"
              />

              {/* Competition Insight */}
              <CompetitionInsight
                totalCandidates={application.other_candidates_count + 1}
                candidatesAhead={Math.floor(application.other_candidates_count * 0.3)}
                candidatesBehind={Math.floor(application.other_candidates_count * 0.7)}
                averageResponseTime="2.5 days"
              />
            </div>

            {/* Talent Strategist */}
            {application.talent_strategist && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Talent Strategist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/profile/${application.talent_strategist?.id}`)}
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14 ring-2 ring-border/50">
                        <AvatarImage src={application.talent_strategist.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {application.talent_strategist.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {application.talent_strategist.user_id && (
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <OnlineStatusIndicator userId={application.talent_strategist.user_id} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base">{application.talent_strategist.full_name}</p>
                      <p className="text-xs text-muted-foreground">Click to view profile</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Company Info */}
            {application.job?.companies?.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">About {application.job.companies.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {application.job.companies.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
