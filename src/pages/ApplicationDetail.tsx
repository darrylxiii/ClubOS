import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, Building2, MapPin, DollarSign, Users, Calendar, 
  Briefcase, FileText, Target, MessageSquare, ExternalLink 
} from "lucide-react";
import { ExpandablePipelineStage, PipelineStageData } from "@/components/ExpandablePipelineStage";

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

      // Fetch application with full job details
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
        const { data: companyMembers } = await supabase
          .from("company_members")
          .select(`
            user_id,
            role,
            profiles!company_members_user_id_fkey (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq("company_id", data.jobs.company_id)
          .eq("is_active", true)
          .in("role", ["recruiter", "admin"])
          .limit(1)
          .single();

        if (companyMembers?.profiles) {
          strategist = companyMembers.profiles;
        }
      }

      setApplication({
        ...data,
        job: {
          ...data.jobs,
          requirements: (data.jobs.requirements as string[]) || [],
          benefits: (data.jobs.benefits as string[]) || [],
        },
        stages: (data.stages as unknown as PipelineStageData[]) || [],
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
        <Card className="border-2 border-accent/20">
          <CardHeader>
            <div className="flex items-start gap-6">
              {application.job?.companies?.logo_url && (
                <Avatar className="w-20 h-20 border-2 border-accent/20">
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
                    <Building2 className="w-5 h-5" />
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
            {/* Pipeline Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Your Application Journey</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start w-full overflow-x-auto pb-4">
                  {application.stages.map((stage: PipelineStageData, index: number) => (
                    <ExpandablePipelineStage
                      key={stage.id}
                      stage={{
                        ...stage,
                        status:
                          index < application.current_stage_index
                            ? "completed"
                            : index === application.current_stage_index
                            ? "current"
                            : "upcoming",
                      }}
                      isLast={index === application.stages.length - 1}
                    />
                  ))}
                </div>

                {/* Current Stage Details */}
                {currentStage && (
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <Target className="w-5 h-5 text-accent" />
                      Current Stage: {currentStage.title}
                    </h4>
                    {currentStage.description && (
                      <p className="text-sm text-muted-foreground mb-3">{currentStage.description}</p>
                    )}
                    {currentStage.preparation?.resources && currentStage.preparation.resources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Preparation Resources:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {currentStage.preparation.resources.map((resource: any, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <FileText className="w-4 h-4 mt-0.5" />
                              {typeof resource === 'string' ? resource : resource.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
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
            {/* Application Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Application Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Applied On</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(application.applied_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Stage Progress</p>
                  <p className="font-medium text-2xl text-accent">
                    {application.current_stage_index + 1} / {application.stages.length}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Competition</p>
                  <p className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {application.other_candidates_count} other candidate{application.other_candidates_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>

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
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={application.talent_strategist.avatar_url} />
                      <AvatarFallback>
                        {application.talent_strategist.full_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{application.talent_strategist.full_name}</p>
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
