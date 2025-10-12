import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandablePipelineStage, PipelineStageData } from "@/components/ExpandablePipelineStage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Building2, MapPin, Users, DollarSign, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Application {
  id: string;
  job_id: string;
  company_name: string;
  position: string;
  current_stage_index: number;
  stages: PipelineStageData[];
  status: string;
  applied_at: string;
  job: {
    title: string;
    location: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    companies: {
      name: string;
      logo_url: string;
    };
  };
  other_candidates_count: number;
  talent_strategist?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch applications with job and company details
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
            company_id,
            companies!jobs_company_id_fkey (
              name,
              logo_url
            )
          )
        `)
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });

      if (error) throw error;

      // Enrich with other candidates count and talent strategist
      const enrichedApps = await Promise.all((data || []).map(async (app) => {
        // Get count of other candidates in same job
        const { count } = await supabase
          .from("applications")
          .select("*", { count: 'exact', head: true })
          .eq("job_id", app.job_id)
          .neq("user_id", user.id);

        // Get talent strategist from company members with strategist role
        let strategist = null;
        if (app.jobs?.company_id) {
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
            .eq("company_id", app.jobs.company_id)
            .eq("is_active", true)
            .in("role", ["recruiter", "admin"])
            .limit(1)
            .single();

          if (companyMembers?.profiles) {
            strategist = companyMembers.profiles;
          }
        }

        return {
          ...app,
          job: app.jobs,
          stages: (app.stages as unknown as PipelineStageData[]) || [],
          other_candidates_count: count || 0,
          talent_strategist: strategist,
        };
      }));

      setApplications(enrichedApps);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const activeApplications = applications.filter(app => app.status === "active");
  const archivedApplications = applications.filter(app => app.status !== "active");

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading applications...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
              My Applications
            </h1>
            <p className="text-muted-foreground">
              Track your application progress and prepare for each stage
            </p>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active">Active ({activeApplications.length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({archivedApplications.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6 mt-6">
              {activeApplications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No active applications yet. Start applying to jobs to see them here!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))
              )}
            </TabsContent>

            <TabsContent value="archived" className="space-y-6 mt-6">
              {archivedApplications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No archived applications</p>
                  </CardContent>
                </Card>
              ) : (
                archivedApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
    </AppLayout>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  const navigate = useNavigate();

  const formatSalaryRange = () => {
    if (!application.job?.salary_min || !application.job?.salary_max) return null;
    const currency = application.job?.currency || 'EUR';
    return `${currency} ${application.job.salary_min.toLocaleString()} - ${application.job.salary_max.toLocaleString()}`;
  };
  
  return (
    <Card 
      className="border-accent/20 bg-gradient-card shadow-glow cursor-pointer transition-all hover:shadow-xl hover:border-accent/40"
      onClick={() => navigate(`/applications/${application.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {application.job?.companies?.logo_url && (
              <Avatar className="w-16 h-16 border-2 border-accent/20">
                <AvatarImage src={application.job.companies.logo_url} />
                <AvatarFallback>{application.job?.companies?.name?.[0]}</AvatarFallback>
              </Avatar>
            )}
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                {application.job?.title || application.position}
              </CardTitle>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {application.job?.companies?.name || application.company_name}
                </div>
                {application.job?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {application.job.location}
                  </div>
                )}
                {formatSalaryRange() && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {formatSalaryRange()}
                  </div>
                )}
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-accent/10">
            <div className="text-2xl font-bold text-accent">
              {application.current_stage_index + 1}/{application.stages.length}
            </div>
            <div className="text-xs text-muted-foreground">Stage Progress</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
              <Users className="w-5 h-5" />
              {application.other_candidates_count}
            </div>
            <div className="text-xs text-muted-foreground">Other Candidates</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-sm font-medium">
              {new Date(application.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-xs text-muted-foreground">Applied</div>
          </div>
        </div>

        {/* Talent Strategist */}
        {application.talent_strategist && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
            <Avatar className="w-10 h-10">
              <AvatarImage src={application.talent_strategist.avatar_url} />
              <AvatarFallback>{application.talent_strategist.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-medium">Your Talent Strategist</div>
              <div className="text-sm text-muted-foreground">{application.talent_strategist.full_name}</div>
            </div>
          </div>
        )}

        {/* Pipeline Stages */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-muted-foreground uppercase">Application Pipeline</h3>
          <div className="flex items-start w-full overflow-x-auto pb-2">
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
        </div>
      </CardContent>
    </Card>
  );
}
