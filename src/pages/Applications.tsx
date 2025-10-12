import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandablePipelineStage, PipelineStageData } from "@/components/ExpandablePipelineStage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Building2, MapPin, Users, DollarSign, ArrowRight, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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

      // Fetch applications with job and company details including pipeline stages
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
            pipeline_stages,
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
          const { data: companyMembers, error: strategistError } = await supabase
            .from("company_members")
            .select(`
              user_id,
              role,
              profiles (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq("company_id", app.jobs.company_id)
            .eq("is_active", true)
            .in("role", ["recruiter", "admin"])
            .limit(1);

          if (strategistError) {
            console.error("Error fetching strategist:", strategistError);
          }

          if (companyMembers && companyMembers.length > 0 && companyMembers[0].profiles) {
            strategist = companyMembers[0].profiles;
            console.log("Found strategist:", strategist);
          } else {
            console.log("No strategist found for company:", app.jobs.company_id);
          }
        }

        // Use job's pipeline_stages as the source of truth, converting to PipelineStageData format
        const jobPipelineStages = app.jobs?.pipeline_stages || [];
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

        return {
          ...app,
          job: app.jobs,
          stages: formattedStages,
          other_candidates_count: count || 0,
          talent_strategist: strategist,
        };
      }));

      console.log("Enriched applications with strategist data:", enrichedApps);
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
      className="border-border/50 bg-card transition-all hover:shadow-md hover:border-border"
    >
      <CardHeader 
        className="cursor-pointer"
        onClick={() => navigate(`/applications/${application.id}`)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {application.job?.companies?.logo_url && (
              <Avatar className="w-16 h-16 ring-1 ring-border/50">
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
      <CardContent className="space-y-4">
        {/* Talent Strategist - First and prominently displayed */}
        {application.talent_strategist && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <Avatar className="w-12 h-12 ring-2 ring-primary/20">
              <AvatarImage src={application.talent_strategist.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {application.talent_strategist.full_name?.[0] || 'T'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground font-medium">Your Talent Strategist</div>
              <div className="text-sm font-semibold">{application.talent_strategist.full_name || 'Not Assigned'}</div>
            </div>
          </div>
        )}

        {/* Stats Row - Muted, elegant design */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-card border border-border/50">
            <div className="text-lg font-semibold">
              {application.current_stage_index + 1}/{application.stages.length}
            </div>
            <div className="text-xs text-muted-foreground">Stage in Progress</div>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border/50">
            <div className="text-lg font-semibold flex items-center gap-1">
              <Users className="w-4 h-4" />
              {application.other_candidates_count + 1}
            </div>
            <div className="text-xs text-muted-foreground">Total Candidates</div>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border/50">
            <div className="text-sm font-medium">
              {new Date(application.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-xs text-muted-foreground">Applied</div>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div>
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            Pipeline Progress
            <span className="text-[10px] font-normal normal-case opacity-60">(Swipe to see all stages →)</span>
          </h3>
          <div className="relative">
            <div 
              className="flex items-center justify-start gap-2 overflow-x-scroll pb-2 scrollbar-hide"
              style={{ touchAction: 'pan-x' }}
              onMouseDown={(e) => {
                const ele = e.currentTarget;
                const startX = e.pageX - ele.offsetLeft;
                const scrollLeft = ele.scrollLeft;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const x = e.pageX - ele.offsetLeft;
                  const walk = (x - startX) * 2;
                  ele.scrollLeft = scrollLeft - walk;
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  ele.style.cursor = 'grab';
                };
                
                ele.style.cursor = 'grabbing';
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onTouchStart={(e) => {
                const ele = e.currentTarget;
                const startX = e.touches[0].pageX - ele.offsetLeft;
                const scrollLeft = ele.scrollLeft;
                
                const handleTouchMove = (e: TouchEvent) => {
                  const x = e.touches[0].pageX - ele.offsetLeft;
                  const walk = (x - startX) * 2;
                  ele.scrollLeft = scrollLeft - walk;
                };
                
                const handleTouchEnd = () => {
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                };
                
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
              }}
            >
              {application.stages.map((stage: PipelineStageData, index: number) => {
                const isCurrent = index === application.current_stage_index;
                const isCompleted = index < application.current_stage_index;
                
                return (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                        isCompleted && "bg-muted border-muted-foreground/30",
                        isCurrent && "bg-foreground border-foreground text-background scale-110",
                        !isCompleted && !isCurrent && "bg-background border-border"
                      )}>
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-semibold">
                            {isCurrent ? "●" : "○"}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "mt-2 text-xs text-center max-w-[80px] break-words leading-tight",
                        isCurrent ? "font-bold" : "text-muted-foreground"
                      )}>
                        {stage.title}
                      </p>
                    </div>
                    {index < application.stages.length - 1 && (
                      <div className={cn(
                        "h-0.5 w-6 mx-1 flex-shrink-0",
                        isCompleted ? "bg-muted-foreground/30" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
