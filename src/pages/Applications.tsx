import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandablePipelineStage, PipelineStageData } from "@/components/ExpandablePipelineStage";
import { toast } from "sonner";
import { Briefcase, Building2, MapPin, Users, DollarSign, ArrowRight, Check, Share2, Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StrategistContactCard } from "@/components/applications/StrategistContactCard";
import { ProgressionHeatmap } from "@/components/applications/ProgressionHeatmap";
import { CompetitionInsight } from "@/components/applications/CompetitionInsight";
import { NextStepHelper } from "@/components/applications/NextStepHelper";
import { TimelineDeadlines } from "@/components/applications/TimelineDeadlines";
import { AIPageCopilot } from "@/components/ai/AIPageCopilot";
import { useApplications } from "@/hooks/useApplications";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { RejectedApplicationsTab } from "@/components/candidate/RejectedApplicationsTab";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { MobileApplicationPipeline } from "@/components/applications/MobileApplicationPipeline";
import { useAchievementTrigger } from "@/hooks/useAchievementTrigger";
import { useEffect } from "react";

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
    user_id: string;
  };
}

export default function Applications() {
  const { user } = useAuth();
  const { data: applications = [], isLoading, isFetching } = useApplications(user?.id, true); // Include rejected
  const isMobile = useMobileDetection();
  const { triggerAchievementCheck } = useAchievementTrigger();

  const activeApplications = applications.filter(app => app.status === "active");
  const rejectedApplications = applications.filter(app => app.status === "rejected");
  const archivedApplications = applications.filter(app => app.status !== "active" && app.status !== "rejected");

  // Trigger achievement check when viewing applications
  useEffect(() => {
    if (user && applications.length > 0) {
      triggerAchievementCheck({
        eventType: 'job_viewed',
        eventData: { count: applications.length }
      });
    }
  }, [user, applications.length]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-12 w-full max-w-md" />
          <div className="space-y-4">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Background refetch indicator */}
      {isFetching && !isLoading && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="frosted-glass p-3 rounded-lg border border-border/20 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Updating...</span>
            </div>
          </div>
        </div>
      )}
      
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
            <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto min-h-[44px]">
              <TabsTrigger value="active" className="min-h-[44px] text-xs sm:text-sm">
                <span className="hidden sm:inline">Active ({activeApplications.length})</span>
                <span className="sm:hidden">Active</span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="min-h-[44px] text-xs sm:text-sm">
                <span className="hidden sm:inline">Rejected ({rejectedApplications.length})</span>
                <span className="sm:hidden">Rejected</span>
              </TabsTrigger>
              <TabsTrigger value="archived" className="min-h-[44px] text-xs sm:text-sm">
                <span className="hidden sm:inline">Archived ({archivedApplications.length})</span>
                <span className="sm:hidden">Archived</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6 mt-6">
              {activeApplications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground text-sm sm:text-base">
                      No active applications yet. Start applying to jobs to see them here!
                    </p>
                  </CardContent>
                </Card>
              ) : isMobile ? (
                <MobileApplicationPipeline
                  applications={activeApplications}
                  onSelectApplication={(app) => window.location.href = `/applications/${app.id}`}
                />
              ) : (
                activeApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-6 mt-6">
              <RejectedApplicationsTab applications={rejectedApplications} />
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
        <AIPageCopilot 
          currentPage="/applications" 
          contextData={{ applicationsCount: activeApplications.length }}
        />
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

  const currentStage = application.stages[application.current_stage_index];
  const nextStage = application.stages[application.current_stage_index + 1];
  const daysInProcess = Math.ceil((Date.now() - new Date(application.applied_at).getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card 
      className="border-border/20 bg-card/30 backdrop-blur-[var(--blur-glass)] transition-all hover:bg-card/40 group"
    >
      {/* Header with quick actions */}
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div 
            className="flex items-start gap-3 sm:gap-4 flex-1 cursor-pointer w-full"
            onClick={() => navigate(`/applications/${application.id}`)}
          >
            {application.job?.companies?.logo_url && (
              <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border border-border/30 flex-shrink-0">
                <AvatarImage src={application.job.companies.logo_url} />
                <AvatarFallback className="bg-muted">{application.job?.companies?.name?.[0]}</AvatarFallback>
              </Avatar>
            )}
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2 truncate">
                {application.job?.title || application.position}
              </CardTitle>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-[200px]">
            {application.job?.companies?.name || application.company_name}
          </div>
          {application.job?.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              <span className="hidden sm:inline">{application.job.location}</span>
              <span className="sm:hidden">{application.job.location.split(',')[0]}</span>
            </div>
          )}
          {formatSalaryRange() && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3" />
              <span className="hidden md:inline">{formatSalaryRange()}</span>
            </div>
          )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button 
              size="icon" 
              variant="ghost"
              className="min-h-[44px] min-w-[44px]"
              onClick={(e) => {
                e.stopPropagation();
                toast.info("Share application feature coming soon");
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost"
              className="min-h-[44px] min-w-[44px]"
              onClick={(e) => {
                e.stopPropagation();
                toast.info("Export application history feature coming soon");
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Top Row: 2 Cards - Mobile First Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Strategist Contact Card */}
          <StrategistContactCard 
            strategist={application.talent_strategist}
            lastContact="2 hours ago"
          />

          {/* Next Step Helper */}
          {currentStage && (
            <NextStepHelper
              stageName={currentStage.title}
              scheduledDate={currentStage.scheduledDate}
              duration={currentStage.duration}
              prepTasks={currentStage.preparation?.resources}
              onBookPrep={() => toast.info("Opening prep session booking...")}
              onViewMaterials={() => navigate(`/applications/${application.id}`)}
            />
          )}
        </div>

        {/* Bottom Row: 3 Cards - Mobile First Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Progression Heatmap */}
          <ProgressionHeatmap
            currentStage={application.current_stage_index}
            totalStages={application.stages.length}
            daysInProcess={daysInProcess}
            averageDays={application.stages.length * 5} // Estimate 5 days per stage
          />

          {/* Competition Insight */}
          <CompetitionInsight
            totalCandidates={application.other_candidates_count + 1}
            candidatesAhead={Math.floor(application.other_candidates_count * 0.3)}
            candidatesBehind={Math.floor(application.other_candidates_count * 0.7)}
            averageResponseTime="2.5 days"
          />

          {/* Timeline & Deadlines */}
          <TimelineDeadlines
            appliedDate={application.applied_at}
            nextStageName={nextStage?.title}
            estimatedDaysToNext={nextStage ? 5 : undefined}
            finalDecisionDate={application.stages[application.stages.length - 1]?.scheduledDate}
          />
        </div>

        {/* Pipeline Stages */}
        <div className="mt-2">
          <h3 className="text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
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
